/**
 * Modulo di Sincronizzazione Privata Sovrana Multi-Dispositivo (Fase 3).
 * Interfaccia diretta con Google Drive appDataFolder (drive.appdata)
 * e motore di riconciliazione deterministico a 3 vie con merge conservativo dei compiti.
 */

import {
  AnalysisRecord,
  JarvisBackupEnvelopeV1,
  JarvisSettings,
  BetaSurveyData,
  SyncEngineResult,
  SyncStatus,
  JarvisMemoryItem,
  JarvisDossier,
} from "../types";
import {
  loadHistory,
  loadSettings,
  saveSettings,
  loadBetaSurvey,
  createBackupEnvelope,
  executeSafeRestore,
  validateBackupDryRun,
  APP_VERSION,
  computeBackupStats,
  loadMemories,
  saveAllMemories,
  loadDossiers,
  saveAllDossiers,
} from "./storage";
import { canonicalJsonStringify, computeSha256, getOrCreateDeviceId } from "./crypto";
import { scanObjectForPerimeterViolations } from "./perimeter";

export const DRIVE_SYNC_FILENAME = "jarvis_vault_sync.json";
export const DRIVE_API_FILES_URL = "https://www.googleapis.com/drive/v3/files";
export const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

// Token di accesso OAuth2 tenuto in memoria volatile (mai memorizzato in chiaro su storage persistente)
let inMemoryAccessToken: string | null = null;

export function setGoogleAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getGoogleAccessToken(): string | null {
  return inMemoryAccessToken;
}

/**
 * Motore di riconciliazione deterministico a 3 vie:
 * - Risolve i record per 'id', 'revision', 'updatedAt' e 'deletedAt'.
 * - Applica il principio di 'merge conservativo': un'attività o baby step completato
 *   su uno dei dispositivi (es. iPhone) resta completato anche dopo la sincronizzazione.
 * - Le cancellazioni con marcatore tombstone ('deletedAt') hanno la precedenza per evitare resurrezioni.
 */
export function reconcileVaultData(
  local: {
    history: AnalysisRecord[];
    settings: JarvisSettings;
    survey?: BetaSurveyData;
    memories?: JarvisMemoryItem[];
    dossiers?: JarvisDossier[];
  },
  remote: {
    history: AnalysisRecord[];
    settings: JarvisSettings;
    survey?: BetaSurveyData;
    memories?: JarvisMemoryItem[];
    dossiers?: JarvisDossier[];
  }
): {
  mergedHistory: AnalysisRecord[];
  mergedSettings: JarvisSettings;
  mergedSurvey?: BetaSurveyData;
  mergedMemories?: JarvisMemoryItem[];
  mergedDossiers?: JarvisDossier[];
  conflictsResolvedCount: number;
  details: string[];
} {
  const details: string[] = [];
  let conflictsResolvedCount = 0;

  const localMap = new Map<string, AnalysisRecord>();
  local.history.forEach((rec) => localMap.set(rec.id, rec));

  const remoteMap = new Map<string, AnalysisRecord>();
  remote.history.forEach((rec) => remoteMap.set(rec.id, rec));

  const allIds = new Set<string>([...localMap.keys(), ...remoteMap.keys()]);
  const mergedHistory: AnalysisRecord[] = [];

  for (const id of allIds) {
    const loc = localMap.get(id);
    const rem = remoteMap.get(id);

    if (loc && !rem) {
      // Record presente solo in locale
      mergedHistory.push(loc);
      details.push(`Record ${id}: aggiunto da archivio locale.`);
      continue;
    }

    if (!loc && rem) {
      // Record presente solo su remoto
      mergedHistory.push(rem);
      details.push(`Record ${id}: integrato da archivio remoto.`);
      continue;
    }

    if (loc && rem) {
      // Record presente sia in locale che su remoto: riconciliazione
      // 1. Gestione Tombstone (cancellazione non distruttiva)
      if (loc.deletedAt || rem.deletedAt) {
        const winningDeletedAt = loc.deletedAt && rem.deletedAt
          ? (new Date(loc.deletedAt) > new Date(rem.deletedAt) ? loc.deletedAt : rem.deletedAt)
          : (loc.deletedAt || rem.deletedAt);

        const tombstoneRec: AnalysisRecord = {
          ...(loc.revision && rem.revision && loc.revision >= rem.revision ? loc : rem),
          deletedAt: winningDeletedAt,
          revision: Math.max(loc.revision || 1, rem.revision || 1) + 1,
          updatedAt: new Date().toISOString(),
        };
        mergedHistory.push(tombstoneRec);
        details.push(`Record ${id}: confermata eliminazione (tombstone sincronizzato).`);
        continue;
      }

      // 2. Confronto Revision e Timestamp
      const locRev = loc.revision || 1;
      const remRev = rem.revision || 1;
      let winner: AnalysisRecord;

      if (locRev > remRev) {
        winner = { ...loc };
      } else if (remRev > locRev) {
        winner = { ...rem };
      } else {
        // Stessa revision: fallback su updatedAt più recente
        const timeLoc = new Date(loc.updatedAt || loc.timestamp || 0).getTime();
        const timeRem = new Date(rem.updatedAt || rem.timestamp || 0).getTime();
        winner = timeLoc >= timeRem ? { ...loc } : { ...rem };
      }

      // 3. MERGE CONSERVATIVO DEI COMPITI (Un'attività completata resta completata)
      let taskMerged = false;

      // Conservazione stato BabyStep completato
      if (winner.babyStep) {
        const locBabyCompleted = Boolean(loc.babyStep?.completato);
        const remBabyCompleted = Boolean(rem.babyStep?.completato);
        if (locBabyCompleted || remBabyCompleted) {
          if (!winner.babyStep.completato) {
            winner.babyStep = { ...winner.babyStep, completato: true };
            taskMerged = true;
          }
        }
      }

      // Conservazione stato Azioni operative completate
      if (winner.azioni && Array.isArray(winner.azioni)) {
        const locCompletedMap = new Map((loc.azioni || []).map((a) => [a.id, Boolean(a.completata)]));
        const remCompletedMap = new Map((rem.azioni || []).map((a) => [a.id, Boolean(a.completata)]));

        winner.azioni = winner.azioni.map((a) => {
          const wasCompleted = locCompletedMap.get(a.id) || remCompletedMap.get(a.id);
          if (wasCompleted && !a.completata) {
            taskMerged = true;
            return { ...a, completata: true };
          }
          return a;
        });
      }

      // Merge conservativo repliche senza duplicazioni
      if (loc.repliche || rem.repliche) {
        const replicaMap = new Map();
        (rem.repliche || []).forEach((r) => replicaMap.set(r.id, r));
        (loc.repliche || []).forEach((r) => replicaMap.set(r.id, r));
        winner.repliche = Array.from(replicaMap.values());
      }

      if (taskMerged) {
        winner.revision = Math.max(locRev, remRev) + 1;
        winner.updatedAt = new Date().toISOString();
        conflictsResolvedCount++;
        details.push(`Record ${id}: applicato merge conservativo (stato completato preservato).`);
      } else {
        if (locRev !== remRev) {
          conflictsResolvedCount++;
          details.push(`Record ${id}: allineato a versione più recente (Rev ${winner.revision}).`);
        }
      }

      mergedHistory.push(winner);
    }
  }

  // Ordinamento cronologico decrescente
  mergedHistory.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.timestamp || 0).getTime();
    const timeB = new Date(b.updatedAt || b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  // Merge delle impostazioni (conserva preferenze attive)
  const mergedSettings: JarvisSettings = {
    salvataggioAutomatico: local.settings.salvataggioAutomatico || remote.settings.salvataggioAutomatico,
    googleClientId: local.settings.googleClientId || remote.settings.googleClientId,
    autoSyncOnStartup: local.settings.autoSyncOnStartup ?? remote.settings.autoSyncOnStartup ?? true,
    lastSyncedAt: new Date().toISOString(),
    syncStatus: "synced",
  };

  // Merge del protocollo di collaudo / survey: riconciliazione non distruttiva campo per campo
  let mergedSurvey: BetaSurveyData | undefined = undefined;
  if (local.survey || remote.survey) {
    const l = local.survey;
    const r = remote.survey;

    const reconcileQuestion = (
      q1?: { giudizio: string; note: string },
      q2?: { giudizio: string; note: string }
    ): { giudizio: string; note: string } => {
      const g1 = q1?.giudizio || "";
      const g2 = q2?.giudizio || "";
      const n1 = q1?.note || "";
      const n2 = q2?.note || "";

      const finalGiudizio = g1 || g2;
      let finalNote = n1 || n2;
      if (n1 && n2 && n1 !== n2) {
        finalNote = `${n1} | ${n2}`;
      }

      return { giudizio: finalGiudizio, note: finalNote };
    };

    mergedSurvey = {
      problemaReale: reconcileQuestion(l?.problemaReale, r?.problemaReale),
      prioritaEdEnergia: reconcileQuestion(l?.prioritaEdEnergia, r?.prioritaEdEnergia),
      babyStepEffettivo: reconcileQuestion(l?.babyStepEffettivo, r?.babyStepEffettivo),
      voceScaricoVsAzione: reconcileQuestion(l?.voceScaricoVsAzione, r?.voceScaricoVsAzione),
      replicaEContinuita: reconcileQuestion(l?.replicaEContinuita, r?.replicaEContinuita),
      consiglioDeiQuattro: reconcileQuestion(l?.consiglioDeiQuattro, r?.consiglioDeiQuattro),
      secondoCervelloVsAssistente: reconcileQuestion(l?.secondoCervelloVsAssistente, r?.secondoCervelloVsAssistente),
      caricoMentalePrima: l?.caricoMentalePrima ?? r?.caricoMentalePrima,
      caricoMentaleDopo: l?.caricoMentaleDopo ?? r?.caricoMentaleDopo,
      correzioniCognitive: l?.correzioniCognitive
        ? (r?.correzioniCognitive && r.correzioniCognitive !== l.correzioniCognitive
            ? `${l.correzioniCognitive} | ${r.correzioniCognitive}`
            : l.correzioniCognitive)
        : (r?.correzioniCognitive || ""),
      dataUltimoAggiornamento:
        l?.dataUltimoAggiornamento && r?.dataUltimoAggiornamento
          ? (new Date(l.dataUltimoAggiornamento) > new Date(r.dataUltimoAggiornamento)
              ? l.dataUltimoAggiornamento
              : r.dataUltimoAggiornamento)
          : (l?.dataUltimoAggiornamento || r?.dataUltimoAggiornamento || new Date().toISOString()),
    };
  }

  // Riconciliazione deterministica Memorie (Fase 5)
  let mergedMemories: JarvisMemoryItem[] | undefined = undefined;
  if (local.memories || remote.memories) {
    const locMMap = new Map<string, JarvisMemoryItem>();
    (local.memories || []).forEach((m) => locMMap.set(m.id, m));
    const remMMap = new Map<string, JarvisMemoryItem>();
    (remote.memories || []).forEach((m) => remMMap.set(m.id, m));

    const allMemIds = new Set<string>([...locMMap.keys(), ...remMMap.keys()]);
    mergedMemories = [];

    for (const mId of allMemIds) {
      const locM = locMMap.get(mId);
      const remM = remMMap.get(mId);

      if (locM && !remM) {
        mergedMemories.push(locM);
        details.push(`Memoria ${mId}: aggiunta da archivio locale.`);
        continue;
      }
      if (!locM && remM) {
        mergedMemories.push(remM);
        details.push(`Memoria ${mId}: integrata da archivio remoto.`);
        continue;
      }
      if (locM && remM) {
        // 1. Tombstone
        if (locM.deletedAt || remM.deletedAt) {
          const winningDeletedAt = locM.deletedAt && remM.deletedAt
            ? (new Date(locM.deletedAt) > new Date(remM.deletedAt) ? locM.deletedAt : remM.deletedAt)
            : (locM.deletedAt || remM.deletedAt);
          mergedMemories.push({
            ...(locM.revision >= remM.revision ? locM : remM),
            deletedAt: winningDeletedAt,
            revision: Math.max(locM.revision || 1, remM.revision || 1) + 1,
            updatedAt: new Date().toISOString(),
          });
          details.push(`Memoria ${mId}: confermata eliminazione (tombstone sincronizzato).`);
          continue;
        }

        // 2. Revision & Timestamp
        const lRev = locM.revision || 1;
        const rRev = remM.revision || 1;
        if (lRev > rRev) {
          mergedMemories.push({ ...locM });
        } else if (rRev > lRev) {
          mergedMemories.push({ ...remM });
        } else {
          const tL = new Date(locM.updatedAt || locM.createdAt || 0).getTime();
          const tR = new Date(remM.updatedAt || remM.createdAt || 0).getTime();
          mergedMemories.push(tL >= tR ? { ...locM } : { ...remM });
        }
      }
    }
  }

  // Riconciliazione deterministica Dossier (Fase 5)
  let mergedDossiers: JarvisDossier[] | undefined = undefined;
  if (local.dossiers || remote.dossiers) {
    const locDMap = new Map<string, JarvisDossier>();
    (local.dossiers || []).forEach((d) => locDMap.set(d.id, d));
    const remDMap = new Map<string, JarvisDossier>();
    (remote.dossiers || []).forEach((d) => remDMap.set(d.id, d));

    const allDossierIds = new Set<string>([...locDMap.keys(), ...remDMap.keys()]);
    mergedDossiers = [];

    for (const dId of allDossierIds) {
      const locD = locDMap.get(dId);
      const remD = remDMap.get(dId);

      if (locD && !remD) {
        mergedDossiers.push(locD);
        continue;
      }
      if (!locD && remD) {
        mergedDossiers.push(remD);
        continue;
      }
      if (locD && remD) {
        // 1. Tombstone
        if (locD.deletedAt || remD.deletedAt) {
          const winningDeletedAt = locD.deletedAt && remD.deletedAt
            ? (new Date(locD.deletedAt) > new Date(remD.deletedAt) ? locD.deletedAt : remD.deletedAt)
            : (locD.deletedAt || remD.deletedAt);
          mergedDossiers.push({
            ...(locD.revision >= remD.revision ? locD : remD),
            deletedAt: winningDeletedAt,
            revision: Math.max(locD.revision || 1, remD.revision || 1) + 1,
            updatedAt: new Date().toISOString(),
          });
          continue;
        }

        // 2. Revision & Timestamp
        const lRev = locD.revision || 1;
        const rRev = remD.revision || 1;
        if (lRev > rRev) {
          mergedDossiers.push({ ...locD });
        } else if (rRev > lRev) {
          mergedDossiers.push({ ...remD });
        } else {
          const tL = new Date(locD.updatedAt || locD.createdAt || 0).getTime();
          const tR = new Date(remD.updatedAt || remD.createdAt || 0).getTime();
          mergedDossiers.push(tL >= tR ? { ...locD } : { ...remD });
        }
      }
    }
  }

  return {
    mergedHistory,
    mergedSettings,
    mergedSurvey,
    mergedMemories,
    mergedDossiers,
    conflictsResolvedCount,
    details,
  };
}

/**
 * Cerca il file di sync nella cartella privata appDataFolder di Google Drive.
 */
export async function searchDriveSyncFile(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name = '${DRIVE_SYNC_FILENAME}' and 'appDataFolder' in parents and trashed = false`);
  const url = `${DRIVE_API_FILES_URL}?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Errore ricerca file su Google Drive (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Scarica il contenuto dell'archivio da Google Drive appDataFolder.
 */
export async function downloadDriveSyncEnvelope(token: string, fileId: string): Promise<JarvisBackupEnvelopeV1> {
  const url = `${DRIVE_API_FILES_URL}/${fileId}?alt=media`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Errore download file da Google Drive (${response.status}): ${errText}`);
  }

  const envelope = await response.json();
  return envelope as JarvisBackupEnvelopeV1;
}

/**
 * Carica o aggiorna il file di sync nella cartella appDataFolder di Google Drive.
 */
export async function uploadDriveSyncEnvelope(
  token: string,
  envelope: JarvisBackupEnvelopeV1,
  existingFileId?: string | null
): Promise<{ fileId: string }> {
  const fileContent = JSON.stringify(envelope, null, 2);

  if (existingFileId) {
    // Aggiornamento file esistente (PATCH upload multipart o media)
    const url = `${DRIVE_UPLOAD_URL}/${existingFileId}?uploadType=media`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: fileContent,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Errore aggiornamento file su Google Drive (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return { fileId: data.id || existingFileId };
  } else {
    // Creazione nuovo file con metadata multipart
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: DRIVE_SYNC_FILENAME,
      parents: ["appDataFolder"],
      mimeType: "application/json",
    };

    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      fileContent +
      closeDelimiter;

    const url = `${DRIVE_UPLOAD_URL}?uploadType=multipart`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Errore creazione file su Google Drive appDataFolder (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return { fileId: data.id };
  }
}

/**
 * Esegue il ciclo completo di sincronizzazione bidirezionale sovrana:
 * 1. Recupera stato locale (analisi, impostazioni, survey).
 * 2. Cerca archivio remoto su Google Drive appDataFolder.
 * 3. Se non esiste remoto, esporta lo stato locale sul Drive.
 * 4. Se esiste remoto, ne valida integrità e perimetro (dry-run).
 * 5. Esegue la riconciliazione a 3 vie conservativa.
 * 6. Esegue il ripristino transazionale locale (con snapshot di sicurezza).
 * 7. Carica l'archivio unificato canonico su Google Drive.
 */
export async function performBidirectionalSync(customToken?: string): Promise<SyncEngineResult> {
  const token = customToken || getGoogleAccessToken();
  if (!token) {
    return {
      success: false,
      status: "unconfigured",
      error: "Nessun account Google collegato. Connetti Google Drive per attivare la sincronizzazione.",
    };
  }

  try {
    const localHistory = loadHistory();
    const localSettings = loadSettings();
    const localSurvey = loadBetaSurvey();
    const localMemories = loadMemories(true);
    const localDossiers = loadDossiers(true);

    // 1. Ricerca file remoto
    const remoteFileId = await searchDriveSyncFile(token);

    if (!remoteFileId) {
      // Primo sync: esportazione dello stato locale su Google Drive
      const localEnvelopeData = await createBackupEnvelope();
      const uploadRes = await uploadDriveSyncEnvelope(token, localEnvelopeData.envelope, null);
      
      const updatedSettings = {
        ...localSettings,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: "synced" as SyncStatus,
      };
      saveSettings(updatedSettings);

      return {
        success: true,
        status: "synced",
        lastSyncedAt: updatedSettings.lastSyncedAt,
        recordsMergedCount: localHistory.length,
        conflictsResolvedCount: 0,
        details: `Inizializzato nuovo caveau privato in appDataFolder (File ID: ${uploadRes.fileId.slice(0, 12)}...).`,
      };
    }

    // 2. Download e validazione dry-run del remoto
    const remoteEnvelope = await downloadDriveSyncEnvelope(token, remoteFileId);
    const remoteDryRun = await validateBackupDryRun(JSON.stringify(remoteEnvelope));

    if (!remoteDryRun.isValid) {
      return {
        success: false,
        status: "error",
        error: `Caveau remoto non valido o corrotto (${remoteDryRun.errors.join("; ")}). Sincronizzazione interrotta a tutela dei dati locali.`,
      };
    }

    // 3. Riconciliazione deterministica
    const {
      mergedHistory,
      mergedSettings,
      mergedSurvey,
      mergedMemories,
      mergedDossiers,
      conflictsResolvedCount,
      details,
    } = reconcileVaultData(
      {
        history: localHistory,
        settings: localSettings,
        survey: localSurvey,
        memories: localMemories,
        dossiers: localDossiers,
      },
      {
        history: remoteEnvelope.payload.history,
        settings: remoteEnvelope.payload.settings,
        survey: remoteEnvelope.payload.survey,
        memories: remoteEnvelope.payload.memories,
        dossiers: remoteEnvelope.payload.dossiers,
      }
    );

    // 4. Confezionamento envelope unificato canonico
    const payload: JarvisBackupEnvelopeV1["payload"] = {
      history: mergedHistory,
      settings: mergedSettings,
      survey: mergedSurvey,
    };
    if (mergedMemories && mergedMemories.length > 0) {
      payload.memories = mergedMemories;
    }
    if (mergedDossiers && mergedDossiers.length > 0) {
      payload.dossiers = mergedDossiers;
    }

    const canonicalPayloadString = canonicalJsonStringify(payload);
    const sha256Checksum = await computeSha256(canonicalPayloadString);
    const nowIso = new Date().toISOString();

    const reconciledEnvelope: JarvisBackupEnvelopeV1 = {
      schemaVersion: 1,
      appVersion: APP_VERSION,
      exportedAt: nowIso,
      deviceId: getOrCreateDeviceId(),
      stats: computeBackupStats(
        mergedHistory,
        mergedSurvey,
        mergedMemories && mergedMemories.length > 0 ? mergedMemories : undefined,
        mergedDossiers && mergedDossiers.length > 0 ? mergedDossiers : undefined
      ),
      sha256Checksum,
      payload,
    };

    // 5. Ripristino sicuro in memoria locale con snapshot preventivo
    const restoreOutcome = await executeSafeRestore(reconciledEnvelope);
    if (!restoreOutcome.success) {
      return {
        success: false,
        status: "error",
        error: `Errore durante il salvataggio locale dei dati unificati: ${restoreOutcome.error}`,
      };
    }

    // 6. Caricamento del caveau riconciliato su Google Drive
    await uploadDriveSyncEnvelope(token, reconciledEnvelope, remoteFileId);

    // 7. Aggiornamento impostazioni locali con timestamp sync
    saveSettings({
      ...mergedSettings,
      lastSyncedAt: nowIso,
      syncStatus: "synced",
    });

    return {
      success: true,
      status: "synced",
      lastSyncedAt: nowIso,
      recordsMergedCount: mergedHistory.length,
      conflictsResolvedCount,
      details: details.join(" | ") || "Dati allineati al 100%.",
    };
  } catch (err: any) {
    console.error("[SYNC ENGINE] Errore sincronizzazione:", err);
    return {
      success: false,
      status: "error",
      error: err?.message || "Errore sconosciuto durante la sincronizzazione.",
    };
  }
}
