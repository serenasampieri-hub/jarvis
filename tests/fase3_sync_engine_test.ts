/**
 * Suite di Collaudo Rigorosa per la Fase 3:
 * Sincronizzazione Privata Sovrana Multi-Dispositivo (Google Drive appDataFolder).
 *
 * Copre:
 * - SYNC-01: Riconciliazione additiva non conflittuale
 * - SYNC-02: Risoluzione conflitti deterministica (revision & timestamp)
 * - SYNC-03: Merge conservativo dei compiti (Task Completion Preservation)
 * - SYNC-04: Propagazione Tombstone (Cancellazioni non distruttive, zero resurrezioni)
 * - SYNC-05: Riconciliazione unificata Impostazioni e Sondaggio Beta (7 Giorni)
 * - SYNC-06: Barriera Perimetrale Bidirezionale (Anti-contaminazione ASL / MUM da remoto)
 * - SYNC-07: Integrità Crittografica SHA-256 e Checksum del caveau riconciliato
 * - SYNC-08: Ciclo E2E performBidirectionalSync (Simulazione Google Drive appDataFolder)
 */

import {
  reconcileVaultData,
  performBidirectionalSync,
  setGoogleAccessToken,
  getGoogleAccessToken,
  DRIVE_SYNC_FILENAME,
} from "../src/utils/syncEngine";
import {
  loadHistory,
  saveAnalysisRecord,
  loadSettings,
  saveSettings,
  loadBetaSurvey,
  saveBetaSurvey,
  validateBackupDryRun,
  getLatestSafetySnapshot,
} from "../src/utils/storage";
import { canonicalJsonStringify, computeSha256 } from "../src/utils/crypto";
import { AnalysisRecord, JarvisSettings, BetaSurveyData, JarvisBackupEnvelopeV1 } from "../src/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

// In-Memory Mock di LocalStorage per ambiente Node.js
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

(globalThis as any).localStorage = new MockLocalStorage();

async function runFase3Tests() {
  console.log("================================================================================");
  console.log("SUITE COLLAUDO FASE 3: SINCRONIZZAZIONE SOVRANA MULTI-DISPOSITIVO (appDataFolder)");
  console.log("================================================================================\n");

  // ----------------------------------------------------------------------------
  // SYNC-01: Riconciliazione additiva non conflittuale
  // ----------------------------------------------------------------------------
  console.log("▶ SYNC-01: Riconciliazione additiva (nessun conflitto tra record disgiunti)");
  {
    const localRec: AnalysisRecord = {
      id: "rec-local-1",
      timestamp: "2026-10-09T10:00:00Z",
      timestampMs: 1760000000000,
      rawInput: "Comprare cibo per gatti e ritirare le scarpe dal calzolaio",
      modalita: "organizzazione",
      fuoriPerimetro: false,
      babyStep: { azione: "Controllare orari calzolaio", durataStimata: "5 min", motivo: "Avvio rapido", completato: false },
      revision: 1,
      deviceId: "dev-iphone",
      createdAt: "2026-10-09T10:00:00Z",
      updatedAt: "2026-10-09T10:00:00Z",
    };

    const remoteRec: AnalysisRecord = {
      id: "rec-remote-2",
      timestamp: "2026-10-09T11:00:00Z",
      timestampMs: 1760003600000,
      rawInput: "Pianificare vacanza personale a Vienna",
      modalita: "organizzazione",
      fuoriPerimetro: false,
      babyStep: { azione: "Cercare voli su Google Flights", durataStimata: "10 min", motivo: "Verifica tariffe", completato: true },
      revision: 1,
      deviceId: "dev-macbook",
      createdAt: "2026-10-09T11:00:00Z",
      updatedAt: "2026-10-09T11:00:00Z",
    };

    const result = reconcileVaultData(
      { history: [localRec], settings: { salvataggioAutomatico: true } },
      { history: [remoteRec], settings: { salvataggioAutomatico: true } }
    );

    assert(result.mergedHistory.length === 2, `Attesi 2 record riconciliati, trovati: ${result.mergedHistory.length}`);
    const foundLocal = result.mergedHistory.find((r) => r.id === "rec-local-1");
    const foundRemote = result.mergedHistory.find((r) => r.id === "rec-remote-2");
    assert(!!foundLocal, "Record locale deve essere preservato");
    assert(!!foundRemote, "Record remoto deve essere integrato");
    assert(result.conflictsResolvedCount === 0, "Non devono esserci conflitti su record disgiunti");
    console.log("  ✅ SYNC-01 PASS: Entrambi i record unificati senza perdite né conflitti.");
  }

  // ----------------------------------------------------------------------------
  // SYNC-02: Risoluzione conflitti deterministica (Revision & Timestamp)
  // ----------------------------------------------------------------------------
  console.log("\n▶ SYNC-02: Risoluzione conflitti deterministica per revisione e data");
  {
    const olderLocal: AnalysisRecord = {
      id: "rec-conflict-1",
      timestamp: "2026-10-09T10:00:00Z",
      rawInput: "Testo originale bozza",
      modalita: "organizzazione",
      fuoriPerimetro: false,
      sintesi: "Versione 1 locale",
      revision: 1,
      updatedAt: "2026-10-09T10:00:00Z",
      deviceId: "dev-iphone",
    };

    const newerRemote: AnalysisRecord = {
      id: "rec-conflict-1",
      timestamp: "2026-10-09T10:00:00Z",
      rawInput: "Testo modificato su computer",
      modalita: "organizzazione",
      fuoriPerimetro: false,
      sintesi: "Versione 2 remota aggiornata",
      revision: 2,
      updatedAt: "2026-10-09T10:30:00Z",
      deviceId: "dev-macbook",
    };

    const result = reconcileVaultData(
      { history: [olderLocal], settings: { salvataggioAutomatico: true } },
      { history: [newerRemote], settings: { salvataggioAutomatico: true } }
    );

    assert(result.mergedHistory.length === 1, "Il record deve essere singolo dopo il merge");
    const merged = result.mergedHistory[0];
    assert(merged.revision === 2, `Revisione attesa 2, trovata: ${merged.revision}`);
    assert(merged.sintesi === "Versione 2 remota aggiornata", "Il contenuto con revisione superiore deve vincere");
    assert(result.conflictsResolvedCount === 1, "Conflitto deve essere conteggiato");
    console.log("  ✅ SYNC-02 PASS: Conflitto risolto a favore della revisione più recente.");
  }

  // ----------------------------------------------------------------------------
  // SYNC-03: Merge conservativo dei compiti (Task Completion Preservation)
  // ----------------------------------------------------------------------------
  console.log("\n▶ SYNC-03: Merge conservativo dei compiti (Task completati su un dispositivo restano completati)");
  {
    // Serena spunta 'completato: true' su iPhone (locale)
    const localWithCompletedTask: AnalysisRecord = {
      id: "rec-task-1",
      timestamp: "2026-10-09T09:00:00Z",
      rawInput: "Riordinare armadio camera",
      modalita: "organizzazione",
      fuoriPerimetro: false,
      babyStep: {
        azione: "Svuotare primo cassetto",
        durataStimata: "5 min",
        motivo: "Avvio rapido",
        completato: true, // SPUNTATO SU IPHONE
      },
      azioni: [
        { id: "act-1", testo: "Comprare divisori", energiaRichiesta: "bassa", tipo: "suggerimento", completata: true },
        { id: "act-2", testo: "Donare vestiti dismessi", energiaRichiesta: "media", tipo: "fatto", completata: false },
      ],
      revision: 2,
      updatedAt: "2026-10-09T09:15:00Z",
      deviceId: "dev-iphone",
    };

    // Su laptop remoto, una modifica al testo ha generato revision: 3, ma con compiti non ancora spuntati
    const remoteWithHigherRevisionButIncompleteTask: AnalysisRecord = {
      id: "rec-task-1",
      timestamp: "2026-10-09T09:00:00Z",
      rawInput: "Riordinare armadio camera da letto padronale",
      modalita: "organizzazione",
      fuoriPerimetro: false,
      sintesi: "Sintesi aggiornata da laptop",
      babyStep: {
        azione: "Svuotare primo cassetto",
        durataStimata: "5 min",
        motivo: "Avvio rapido",
        completato: false, // NON ANCORA SPUNTATO SUL LAPTOP
      },
      azioni: [
        { id: "act-1", testo: "Comprare divisori", energiaRichiesta: "bassa", tipo: "suggerimento", completata: false },
        { id: "act-2", testo: "Donare vestiti dismessi", energiaRichiesta: "media", tipo: "fatto", completata: true }, // SPUNTATO SUL LAPTOP
      ],
      revision: 3,
      updatedAt: "2026-10-09T09:30:00Z",
      deviceId: "dev-laptop",
    };

    const result = reconcileVaultData(
      { history: [localWithCompletedTask], settings: { salvataggioAutomatico: true } },
      { history: [remoteWithHigherRevisionButIncompleteTask], settings: { salvataggioAutomatico: true } }
    );

    const merged = result.mergedHistory[0];
    assert(merged.babyStep?.completato === true, "Il babyStep completato su iPhone NON deve essere annullato dal laptop!");
    assert(merged.azioni?.[0].completata === true, "Azione 1 completata su iPhone deve restare completata");
    assert(merged.azioni?.[1].completata === true, "Azione 2 completata su laptop deve restare completata");
    assert(merged.sintesi === "Sintesi aggiornata da laptop", "Il testo aggiornato dal laptop con revision 3 è comunque recepito");
    console.log("  ✅ SYNC-03 PASS: Compiti completati preservati al 100% su entrambi i dispositivi.");
  }

  // ----------------------------------------------------------------------------
  // SYNC-04: Propagazione Tombstone (Cancellazioni non distruttive, zero resurrezioni)
  // ----------------------------------------------------------------------------
  console.log("\n▶ SYNC-04: Propagazione Tombstone (Nessuna resurrezione post-cancellazione)");
  {
    // Su iPhone Serena cancella l'analisi
    const deletedLocally: AnalysisRecord = {
      id: "rec-tombstone-1",
      timestamp: "2026-10-09T08:00:00Z",
      rawInput: "Analisi vecchia da cancellare",
      modalita: "deposito",
      fuoriPerimetro: false,
      revision: 2,
      updatedAt: "2026-10-09T08:30:00Z",
      deletedAt: "2026-10-09T08:30:00Z",
      deviceId: "dev-iphone",
    };

    // Laptop ha ancora il record attivo (non cancellato) con revision: 1
    const activeRemotely: AnalysisRecord = {
      id: "rec-tombstone-1",
      timestamp: "2026-10-09T08:00:00Z",
      rawInput: "Analisi vecchia da cancellare",
      modalita: "deposito",
      fuoriPerimetro: false,
      revision: 1,
      updatedAt: "2026-10-09T08:00:00Z",
      deletedAt: null,
      deviceId: "dev-laptop",
    };

    const result = reconcileVaultData(
      { history: [deletedLocally], settings: { salvataggioAutomatico: true } },
      { history: [activeRemotely], settings: { salvataggioAutomatico: true } }
    );

    const merged = result.mergedHistory[0];
    assert(Boolean(merged.deletedAt), "Il tombstone deve prevalere per impedire la resurrezione dell'elemento");
    assert(merged.deletedAt === "2026-10-09T08:30:00Z", "La data di cancellazione originale deve essere mantenuta");
    console.log("  ✅ SYNC-04 PASS: Tombstone propagato correttamente, resurrezione scongiurata.");
  }

  // ----------------------------------------------------------------------------
  // SYNC-05: Riconciliazione unificata Impostazioni e Sondaggio Beta (7 Giorni)
  // ----------------------------------------------------------------------------
  console.log("\n▶ SYNC-05: Riconciliazione unificata Impostazioni & Sondaggio Beta");
  {
    const localSettings: JarvisSettings = {
      salvataggioAutomatico: true,
      autoSyncOnStartup: true,
      lastSyncedAt: "2026-10-09T10:00:00Z",
    };

    const remoteSettings: JarvisSettings = {
      salvataggioAutomatico: true,
      autoSyncOnStartup: false,
      lastSyncedAt: "2026-10-09T09:00:00Z",
    };

    const localSurvey: BetaSurveyData = {
      problemaReale: { giudizio: "positivo", note: "Ha inquadrato il problema personale al primo colpo" },
      prioritaEdEnergia: { giudizio: "", note: "" },
      babyStepEffettivo: { giudizio: "", note: "" },
      voceScaricoVsAzione: { giudizio: "", note: "" },
      replicaEContinuita: { giudizio: "", note: "" },
      consiglioDeiQuattro: { giudizio: "", note: "" },
      secondoCervelloVsAssistente: { giudizio: "", note: "" },
      caricoMentalePrima: 8,
      correzioniCognitive: "Nessuna correzione",
    };

    const remoteSurvey: BetaSurveyData = {
      problemaReale: { giudizio: "", note: "" },
      prioritaEdEnergia: { giudizio: "molto_positivo", note: "Energia stimata correttamente" },
      babyStepEffettivo: { giudizio: "", note: "" },
      voceScaricoVsAzione: { giudizio: "", note: "" },
      replicaEContinuita: { giudizio: "", note: "" },
      consiglioDeiQuattro: { giudizio: "", note: "" },
      secondoCervelloVsAssistente: { giudizio: "", note: "" },
      caricoMentaleDopo: 3,
      correzioniCognitive: "",
    };

    const result = reconcileVaultData(
      { history: [], settings: localSettings, survey: localSurvey },
      { history: [], settings: remoteSettings, survey: remoteSurvey }
    );

    assert(result.mergedSettings.autoSyncOnStartup === true, "autoSyncOnStartup impostato a true deve essere preservato");
    assert(result.mergedSurvey?.problemaReale.giudizio === "positivo", "Risposta 1 da locale deve essere preservata");
    assert(result.mergedSurvey?.prioritaEdEnergia.giudizio === "molto_positivo", "Risposta 2 da remoto deve essere integrata");
    assert(result.mergedSurvey?.caricoMentalePrima === 8, "Valore caricoMentalePrima preservato");
    assert(result.mergedSurvey?.caricoMentaleDopo === 3, "Valore caricoMentaleDopo integrato");
    console.log("  ✅ SYNC-05 PASS: Impostazioni e Sondaggio riconciliati senza perdere risposte.");
  }

  // ----------------------------------------------------------------------------
  // SYNC-06: Barriera Perimetrale Bidirezionale (Anti-contaminazione ASL / MUM da remoto)
  // ----------------------------------------------------------------------------
  console.log("\n▶ SYNC-06: Barriera Perimetrale Bidirezionale su caveau remoto");
  {
    // Simuliamo un caveau remoto che contiene un termine vietato (es. ASL Roma 1 o MUM)
    const contaminatedRemoteEnvelope: JarvisBackupEnvelopeV1 = {
      schemaVersion: 1,
      appVersion: "1.0.0",
      exportedAt: "2026-10-09T10:00:00Z",
      deviceId: "dev-unknown",
      stats: {
        totalRecords: 1,
        openTasks: 0,
        completedTasks: 0,
        babyStepsCount: 0,
        scadenzeCount: 0,
        surveyAnsweredQuestions: 0,
      },
      sha256Checksum: "checksum-placeholder",
      payload: {
        history: [
          {
            id: "rec-contaminated",
            timestamp: "2026-10-09T10:00:00Z",
            rawInput: "Appunti riunione ASL Roma 1 delibera fornitura",
            modalita: "organizzazione",
            fuoriPerimetro: true,
          },
        ],
        settings: { salvataggioAutomatico: true },
      },
    };

    const payloadCanonical = canonicalJsonStringify(contaminatedRemoteEnvelope.payload);
    contaminatedRemoteEnvelope.sha256Checksum = await computeSha256(payloadCanonical);

    const dryRun = await validateBackupDryRun(JSON.stringify(contaminatedRemoteEnvelope));
    assert(!dryRun.isValid, "Il caveau con dati ASL/MUM deve essere dichiarato non valido");
    assert(
      dryRun.errors.some((e) => e.includes("violazioni del perimetro") || e.includes("ASL/MUM")),
      `Errore specifico atteso, ricevuti: ${dryRun.errors.join("; ")}`
    );
    console.log("  ✅ SYNC-06 PASS: Caveau remoto contaminato intercettato e respinto prima della riconciliazione.");
  }

  // ----------------------------------------------------------------------------
  // SYNC-07: Integrità Crittografica SHA-256 e Checksum del caveau riconciliato
  // ----------------------------------------------------------------------------
  console.log("\n▶ SYNC-07: Integrità crittografica deterministica del caveau unificato");
  {
    const payloadA = {
      history: [
        { id: "1", rawInput: "A", modalita: "deposito" as const, fuoriPerimetro: false },
        { id: "2", rawInput: "B", modalita: "organizzazione" as const, fuoriPerimetro: false },
      ],
      settings: { salvataggioAutomatico: true },
    };

    const payloadB = {
      settings: { salvataggioAutomatico: true },
      history: [
        { id: "1", rawInput: "A", modalita: "deposito" as const, fuoriPerimetro: false },
        { id: "2", rawInput: "B", modalita: "organizzazione" as const, fuoriPerimetro: false },
      ],
    };

    // Ordine delle chiavi inverso: la rappresentazione canonica deve dare lo stesso hash identico
    const canonicalA = canonicalJsonStringify(payloadA);
    const canonicalB = canonicalJsonStringify(payloadB);
    assert(canonicalA === canonicalB, "canonicalJsonStringify deve ordinare le chiavi in modo identico");

    const hashA = await computeSha256(canonicalA);
    const hashB = await computeSha256(canonicalB);
    assert(hashA === hashB, `Hash devono coincidere: ${hashA} === ${hashB}`);
    assert(hashA.length === 64, `Lunghezza hash SHA-256 deve essere 64 caratteri esadecimali: ${hashA.length}`);
    console.log("  ✅ SYNC-07 PASS: Checksum canonico SHA-256 deterministico verificato.");
  }

  // ----------------------------------------------------------------------------
  // SYNC-08: Ciclo E2E performBidirectionalSync (Simulazione Google Drive API)
  // ----------------------------------------------------------------------------
  console.log("\n▶ SYNC-08: Ciclo E2E performBidirectionalSync con mock Google Drive");
  {
    // Test 8.1: Chiamata senza token (non configurato)
    setGoogleAccessToken(null);
    const unconfigResult = await performBidirectionalSync();
    assert(unconfigResult.status === "unconfigured", `Atteso unconfigured, ricevuto: ${unconfigResult.status}`);
    assert(!unconfigResult.success, "Senza token non deve eseguire sync");

    // Test 8.2: Primo sync (Google Drive vuoto, inizializzazione file remoto)
    localStorage.clear();
    saveAnalysisRecord({
      id: "rec-initial-1",
      timestamp: "2026-10-09T12:00:00Z",
      rawInput: "Organizzare studio e libri da donare",
      modalita: "organizzazione",
      fuoriPerimetro: false,
      babyStep: { azione: "Comprare tre scatoloni", durataStimata: "10 min", motivo: "Avvio rapido", completato: false },
    });

    let uploadedPayload: any = null;
    let driveFileCreated = false;

    // Mock della funzione globale fetch per simulare le API Google Drive
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = async (url: string, init?: any): Promise<any> => {
      const urlStr = String(url);
      const method = init?.method || "GET";

      // 1. Ricerca file in appDataFolder
      if (urlStr.includes("drive/v3/files?") && method === "GET") {
        if (!driveFileCreated) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ files: [] }),
          };
        } else {
          return {
            ok: true,
            status: 200,
            json: async () => ({ files: [{ id: "mock-drive-file-id-999" }] }),
          };
        }
      }

      // 2. Upload file multipart (POST)
      if (urlStr.includes("upload/drive/v3/files?uploadType=multipart") && method === "POST") {
        driveFileCreated = true;
        const bodyStr = String(init?.body || "");
        // Estrai il payload JSON dal multipart body
        const parts = bodyStr.split("\r\n\r\n");
        if (parts.length >= 3) {
          try {
            uploadedPayload = JSON.parse(parts[2].split("\r\n--")[0]);
          } catch {}
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "mock-drive-file-id-999" }),
        };
      }

      // 3. Download file (alt=media)
      if (urlStr.includes("mock-drive-file-id-999?alt=media")) {
        return {
          ok: true,
          status: 200,
          json: async () => uploadedPayload,
        };
      }

      // 4. Update file PATCH
      if (urlStr.includes("mock-drive-file-id-999?uploadType=media") && method === "PATCH") {
        uploadedPayload = JSON.parse(init?.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "mock-drive-file-id-999" }),
        };
      }

      return {
        ok: false,
        status: 404,
        text: async () => "Not found",
      };
    };

    try {
      // Esecuzione primo sync
      const firstSyncResult = await performBidirectionalSync("mock-oauth-bearer-token-12345");
      assert(firstSyncResult.success, `Primo sync deve riuscire: ${firstSyncResult.error}`);
      assert(firstSyncResult.status === "synced", `Status atteso synced, ottenuto: ${firstSyncResult.status}`);
      assert(driveFileCreated, "Il file su Google Drive deve essere stato creato");
      assert(uploadedPayload !== null, "Il payload deve essere stato caricato su Drive");
      assert(uploadedPayload.payload.history.length === 1, "Il payload remoto deve contenere l'analisi locale");

      // Test 8.3: Secondo sync bidirezionale con modifica remota aggiuntiva
      // Aggiungiamo un secondo record al payload simulato su Google Drive
      const remoteNewRecord: AnalysisRecord = {
        id: "rec-remote-added-2",
        timestamp: "2026-10-09T13:00:00Z",
        rawInput: "Iscrizione corso fotografia sabato mattina",
        modalita: "deposito",
        fuoriPerimetro: false,
        revision: 1,
        updatedAt: "2026-10-09T13:00:00Z",
      };
      uploadedPayload.payload.history.push(remoteNewRecord);
      const newCanonical = canonicalJsonStringify(uploadedPayload.payload);
      uploadedPayload.sha256Checksum = await computeSha256(newCanonical);

      // Esegui secondo sync
      const secondSyncResult = await performBidirectionalSync("mock-oauth-bearer-token-12345");
      assert(secondSyncResult.success, `Secondo sync deve riuscire: ${secondSyncResult.error}`);
      
      const localHistoryAfterSync = loadHistory();
      assert(localHistoryAfterSync.length === 2, `Attesi 2 record in localStorage, trovati: ${localHistoryAfterSync.length}`);
      const foundRemoteAdded = localHistoryAfterSync.find((r) => r.id === "rec-remote-added-2");
      assert(!!foundRemoteAdded, "Il record proveniente da Drive deve essere stato ripristinato in locale");

      // Verifichiamo che sia stato creato lo snapshot di sicurezza prima del ripristino
      const safetySnapshot = getLatestSafetySnapshot();
      assert(safetySnapshot !== null, "Deve esistere uno snapshot di sicurezza generato durante il sync");

      console.log("  ✅ SYNC-08 PASS: Ciclo completo Google Drive (primo sync, download, riconciliazione e patch).");
    } finally {
      // Ripristina fetch originale
      (globalThis as any).fetch = originalFetch;
    }
  }

  console.log("\n================================================================================");
  console.log("ESITO FINALE FASE 3: TUTTI GLI 8 CRITERI DI SINCRONIZZAZIONE SOVRANA SUPERATI AL 100%");
  console.log("================================================================================\n");
}

runFase3Tests().catch((err) => {
  console.error("ERRORE NON GESTITO:", err);
  process.exit(1);
});
