import {
  AnalysisRecord,
  JarvisSettings,
  BetaSurveyData,
  JarvisBackupEnvelopeV1,
  JarvisBackupStats,
  DryRunValidationResult,
  SafetySnapshot,
  JarvisMemoryItem,
  JarvisDossier,
} from "../types";
import { getOrCreateDeviceId, computeSha256, canonicalJsonStringify } from "./crypto";
import { classifyPerimeter, scanObjectForPerimeterViolations } from "./perimeter";
import { loadMemories, saveAllMemories, loadDossiers, saveAllDossiers } from "./memoryManager";

export { getOrCreateDeviceId };
export type { BetaSurveyData };
export * from "./memoryManager";
export const APP_VERSION = "1.0.0";
const STORAGE_KEY_HISTORY = "jarvis_cronologia_serena_v1";
const STORAGE_KEY_SETTINGS = "jarvis_impostazioni_v1";
const STORAGE_KEY_SURVEY = "jarvis_protocollo_personale_v1";
const STORAGE_KEY_SAFETY_SNAPSHOT = "jarvis_safety_snapshot_before_restore_v1";

const DEFAULT_SETTINGS: JarvisSettings = {
  salvataggioAutomatico: true,
};

export function loadSettings(): JarvisSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: JarvisSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error("Errore salvataggio impostazioni", e);
  }
}

export function loadHistory(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a: AnalysisRecord, b: AnalysisRecord) => {
      const timeA = a.timestampMs || 0;
      const timeB = b.timestampMs || 0;
      return timeB - timeA;
    });
  } catch {
    return [];
  }
}

export function saveAnalysisRecord(record: AnalysisRecord): void {
  try {
    const current = loadHistory();
    const nowIso = new Date().toISOString();
    const enrichedRecord: AnalysisRecord = {
      ...record,
      createdAt: record.createdAt || nowIso,
      updatedAt: nowIso,
      revision: record.revision || 1,
      deviceId: record.deviceId || getOrCreateDeviceId(),
      deletedAt: record.deletedAt ?? null,
    };
    // Inserisci in cima, rimuovendo eventuale duplicato per ID
    const filtered = current.filter((item) => item.id !== enrichedRecord.id);
    const updated = [enrichedRecord, ...filtered];
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error("Errore salvataggio record in cronologia", e);
  }
}

export function updateAnalysisRecord(record: AnalysisRecord): void {
  try {
    const current = loadHistory();
    const nowIso = new Date().toISOString();
    const enrichedRecord: AnalysisRecord = {
      ...record,
      updatedAt: nowIso,
      revision: (record.revision || 1) + 1,
      deviceId: getOrCreateDeviceId(),
    };
    const updated = current.map((item) => (item.id === enrichedRecord.id ? enrichedRecord : item));
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error("Errore aggiornamento record in cronologia", e);
  }
}

export function deleteAnalysisRecord(id: string): void {
  try {
    const current = loadHistory();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error("Errore eliminazione record", e);
  }
}

export function clearAllHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  } catch (e) {
    console.error("Errore cancellazione cronologia", e);
  }
}

export function formatAnalysisToText(record: AnalysisRecord): string {
  if (record.fuoriPerimetro) {
    return `JARVIS — CABINA DI REGIA PERSONALE
Destinataria: Serena Sampieri
Data: ${record.timestamp}

ATTENZIONE: ${record.messaggioPerimetro || "Contenuto esterno al perimetro personale di Jarvis."}
`;
  }

  const effectiveMode =
    record.modalitaEffettiva ||
    (record.modalita === "auto"
      ? record.consiglio
        ? "consiglio"
        : record.decisione
        ? "decisione"
        : "organizzazione"
      : record.modalita);

  const modalitaLabel =
    record.modalita === "auto"
      ? `MODALITÀ AUTO (VOCE) → ${effectiveMode.toUpperCase()}`
      : record.modalita === "consiglio"
      ? "MODALITÀ CONSIGLIO"
      : record.modalita === "decisione"
      ? "MODALITÀ DECISIONE"
      : "MODALITÀ ORGANIZZAZIONE";

  const lines: string[] = [];
  lines.push("=================================================");
  lines.push(`JARVIS — CABINA DI REGIA PERSONALE [${modalitaLabel}]`);
  lines.push("Destinataria: Serena Sampieri");
  lines.push(`Registrazione: ${record.timestamp}`);
  lines.push("=================================================\n");

  if (record.domandaDisambiguazioneModalita) {
    lines.push("CHIARIMENTO INTENTO OPERATIVO");
    lines.push("-----------------------------");
    lines.push(record.domandaDisambiguazioneModalita);
    lines.push("");
  }

  if (record.trascrizionePulita && record.trascrizionePulita.trim() !== record.rawInput.trim()) {
    lines.push("TRASCRIZIONE & INTERPRETAZIONE VOCALE");
    lines.push("------------------------------------");
    lines.push(`• Input originale / parlato: "${record.rawInput}"`);
    lines.push(`• Significato pulito Jarvis: "${record.trascrizionePulita}"`);
    lines.push("");
  }

  if (record.rispostaVocale) {
    lines.push("RISPOSTA VOCALE BREVE (~30 SECONDI)");
    lines.push("-----------------------------------");
    lines.push(`1. Situazione: ${record.rispostaVocale.situazione}`);
    if (record.rispostaVocale.puntiSalienti?.length > 0) {
      lines.push("2. Punti salienti:");
      record.rispostaVocale.puntiSalienti.forEach((p, idx) => lines.push(`   ${idx + 1}. ${p}`));
    }
    lines.push(`3. Prossimo passo immediato: ${record.rispostaVocale.prossimoPasso}`);
    lines.push(`• Testo parlato fluido (~${record.rispostaVocale.durataStimataSecondi || 30}s):`);
    lines.push(`  "${record.rispostaVocale.testoParlatoCompleto}"`);
    lines.push("");
    lines.push("-------------------------------------------------");
    lines.push("RISPOSTA SCRITTA COMPLETA (VERSIONE AUTOREVOLE)");
    lines.push("-------------------------------------------------");
    lines.push("");
  }

  if (effectiveMode === "consiglio" && record.consiglio) {
    const c = record.consiglio;
    lines.push("TEMA SOTTOPOSTO AL CONSIGLIO");
    lines.push("-----------------------------");
    lines.push(c.tema || "Nessun tema specificato.");
    lines.push("");

    lines.push("1. PRAGMATICO (Obiettivo: Portare a casa il risultato nel modo più semplice ed efficace)");
    lines.push("-------------------------------------------------------------------------------------");
    if (c.consiglieri?.pragmatico?.length > 0) {
      c.consiglieri.pragmatico.forEach((p) => lines.push(`• ${p}`));
    } else {
      lines.push("Nessun punto registrato.");
    }
    lines.push("");

    lines.push("2. ECONOMO (Obiettivo: Proteggere risorse economiche, tempo ed energia)");
    lines.push("-----------------------------------------------------------------------");
    if (c.consiglieri?.economo?.length > 0) {
      c.consiglieri.economo.forEach((p) => lines.push(`• ${p}`));
    } else {
      lines.push("Nessun punto registrato.");
    }
    lines.push("");

    lines.push("3. SCETTICO (Obiettivo: Individuare punti deboli, ipotesi non dimostrate e rischi)");
    lines.push("--------------------------------------------------------------------------------");
    if (c.consiglieri?.scettico?.length > 0) {
      c.consiglieri.scettico.forEach((p) => lines.push(`• ${p}`));
    } else {
      lines.push("Nessun punto registrato.");
    }
    lines.push("");

    lines.push("4. SERENA DEL FUTURO (Obiettivo: Valutare l'impatto della scelta tra 6-12 mesi)");
    lines.push("-----------------------------------------------------------------------------");
    if (c.consiglieri?.serenaDelFuturo?.length > 0) {
      c.consiglieri.serenaDelFuturo.forEach((p) => lines.push(`• ${p}`));
    } else {
      lines.push("Nessun punto registrato.");
    }
    lines.push("");

    lines.push("SINTESI DEL CONSIGLIO");
    lines.push("---------------------");
    lines.push(c.sintesiConsiglio || "Nessuna sintesi disponibile.");
    lines.push("");

    lines.push("PUNTI DI ACCORDO");
    lines.push("----------------");
    if (c.puntiAccordo?.length > 0) {
      c.puntiAccordo.forEach((p, idx) => lines.push(`${idx + 1}. ${p}`));
    } else {
      lines.push("Nessun punto di convergenza totale registrato.");
    }
    lines.push("");

    lines.push("PUNTI DI DISACCORDO");
    lines.push("-------------------");
    if (c.puntiDisaccordo?.length > 0) {
      c.puntiDisaccordo.forEach((p, idx) => lines.push(`${idx + 1}. ${p}`));
    } else {
      lines.push("Nessun punto di disaccordo critico rilevato.");
    }
    lines.push("");

    lines.push("VERDETTO PROVVISORIO (Jarvis)");
    lines.push("-----------------------------");
    lines.push(c.verdettoProvvisorio || "In attesa di verdetto.");
    lines.push("");

    lines.push("PROSSIMO PASSO");
    lines.push("--------------");
    lines.push(`• Azione: ${c.prossimoPasso?.azione || "Nessun passo definito."}`);
    lines.push(`• Stato: ${c.prossimoPasso?.completato ? "[COMPLETATO]" : "[DA FARE]"}`);
  } else if (effectiveMode === "decisione" && record.decisione) {
    const d = record.decisione;
    lines.push("SITUAZIONE");
    lines.push("----------");
    lines.push(d.situazione || "Nessun riepilogo fornito.");
    lines.push("");

    lines.push("VANTAGGI");
    lines.push("--------");
    if (d.vantaggi && d.vantaggi.length > 0) {
      d.vantaggi.forEach((v, i) => lines.push(`${i + 1}. ${v}`));
    } else {
      lines.push("Nessun vantaggio rilevato.");
    }
    lines.push("");

    lines.push("SVANTAGGI");
    lines.push("---------");
    if (d.svantaggi && d.svantaggi.length > 0) {
      d.svantaggi.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    } else {
      lines.push("Nessuno svantaggio rilevato.");
    }
    lines.push("");

    lines.push("COSTI REALI");
    lines.push("-----------");
    lines.push(`• Denaro: ${d.costiReali?.denaro || "Non specificato"}`);
    lines.push(`• Tempo: ${d.costiReali?.tempo || "Non specificato"}`);
    lines.push(`• Energia mentale: ${d.costiReali?.energiaMentale || "Non specificata"}`);
    lines.push(`• Complessità logistica: ${d.costiReali?.complessitaLogistica || "Non specificata"}`);
    lines.push("");

    lines.push("RISCHIO DI PENTIMENTO");
    lines.push("---------------------");
    lines.push(`• Livello: ${d.rischioPentimento?.livello?.toUpperCase() || "MEDIO"}`);
    lines.push(`• Valutazione: ${d.rischioPentimento?.motivazione || ""}`);
    lines.push("");

    lines.push("SOLUZIONE ALTERNATIVA A COSTO ZERO O MINIMO (Valutata prima della spesa)");
    lines.push("-----------------------------------------------------------------------");
    lines.push(d.soluzioneAlternativaEconomica || "Nessuna alternativa a costo zero praticabile rilevata.");
    lines.push("");

    lines.push("VERDETTO PROVVISORIO");
    lines.push("--------------------");
    lines.push(d.verdettoProvvisorio || "In attesa di ulteriori dati.");
    lines.push("");

    lines.push("PROSSIMO PASSO");
    lines.push("--------------");
    lines.push(`• Azione: ${d.prossimoPasso?.azione || "Nessun passo definito."}`);
    lines.push(`• Stato: ${d.prossimoPasso?.completato ? "[COMPLETATO]" : "[DA FARE]"}`);

    if (d.datiMancanti) {
      lines.push("");
      lines.push("DATI MANCANTI E INDISPENSABILI");
      lines.push("------------------------------");
      lines.push(d.datiMancanti);
    }
  } else {
    lines.push("SINTESI");
    lines.push("-------");
    lines.push(record.sintesi || "Nessuna sintesi disponibile.");
    lines.push("");

    lines.push("PROSSIMO BABY STEP");
    lines.push("------------------");
    if (record.babyStep) {
      lines.push(`• Azione: ${record.babyStep.azione}`);
      lines.push(`• Durata stimata: ${record.babyStep.durataStimata}`);
      lines.push(`• Tempistica: ${record.babyStep.tempistica || "Da fare ora"}`);
      lines.push(`• Stato: ${record.babyStep.completato ? "[COMPLETATO]" : "[DA FARE]"}`);
    }
    lines.push("");

    lines.push("AZIONI DA FARE (Priorità)");
    lines.push("-------------------------");
    if (record.azioni && record.azioni.length > 0) {
      record.azioni.forEach((a, idx) => {
        const spunta = a.completata ? "[X]" : "[ ]";
        lines.push(`${idx + 1}. ${spunta} ${a.testo}`);
        lines.push(`   Energia: ${a.energiaRichiesta} | Tipologia: ${a.tipo}`);
      });
    } else {
      lines.push("Nessuna azione prioritaria richiesta.");
    }
    lines.push("");

    lines.push("SCADENZE");
    lines.push("--------");
    if (record.scadenze && record.scadenze.length > 0) {
      record.scadenze.forEach((s) => {
        lines.push(`• Entro: ${s.termine} — ${s.oggetto} ${s.vincolante ? "(Vincolo perentorio)" : ""}`);
      });
    } else {
      lines.push(record.scadenzaNote || "Nessuna scadenza vincolante rilevata.");
    }
    lines.push("");

    lines.push("CRITICITÀ");
    lines.push("---------");
    if (record.criticita && record.criticita.length > 0) {
      record.criticita.forEach((c) => {
        const stato = c.risolta ? "[RISOLTA]" : "[ATTIVA]";
        lines.push(`• Ostacolo: ${c.ostacolo} ${stato}`);
        lines.push(`  Soluzione pragmatica: ${c.soluzionePragmatica}`);
      });
    } else {
      lines.push("Nessuna criticità o blocco logistico rilevato.");
    }

    if (record.domandaIndispensabile) {
      lines.push("");
      lines.push("CHIARIMENTO INDISPENSABILE");
      lines.push("--------------------------");
      lines.push(record.domandaIndispensabile);
    }
  }

  const activeFonti = (record.decisione?.fontiWeb && record.decisione.fontiWeb.length > 0)
    ? record.decisione.fontiWeb
    : (record.fontiWeb && record.fontiWeb.length > 0 ? record.fontiWeb : []);

  if (activeFonti.length > 0) {
    lines.push("");
    lines.push("INFORMAZIONI DA RICERCA WEB & FONTI");
    lines.push("-----------------------------------");
    activeFonti.forEach((f, idx) => {
      const tipoLabel = f.tipo === "fatto_verificato" ? "[FATTO VERIFICATO]" : "[OPINIONE/RECENSIONE]";
      const ufficialeLabel = f.ufficiale ? "(Fonte Ufficiale)" : "";
      lines.push(`${idx + 1}. ${tipoLabel} Fonte: ${f.fonte} ${ufficialeLabel}`);
      lines.push(`   Dettaglio: ${f.dettaglio}`);
    });
    lines.push("   Nota: Dati di supporto dal web; non sostituiscono il ragionamento logico di Jarvis.");
  }

  lines.push("\n-------------------------------------------------");
  lines.push("TESTO ORIGINALE INSERITO:");
  lines.push(record.rawInput);
  lines.push("=================================================");

  return lines.join("\n");
}



export const DEFAULT_SURVEY: BetaSurveyData = {
  problemaReale: { giudizio: "", note: "" },
  prioritaEdEnergia: { giudizio: "", note: "" },
  babyStepEffettivo: { giudizio: "", note: "" },
  voceScaricoVsAzione: { giudizio: "", note: "" },
  replicaEContinuita: { giudizio: "", note: "" },
  consiglioDeiQuattro: { giudizio: "", note: "" },
  secondoCervelloVsAssistente: { giudizio: "", note: "" },
  caricoMentalePrima: 7,
  caricoMentaleDopo: 3,
  correzioniCognitive: "",
};

export function loadBetaSurvey(): BetaSurveyData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SURVEY);
    if (!raw) return DEFAULT_SURVEY;
    return { ...DEFAULT_SURVEY, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SURVEY;
  }
}

export function saveBetaSurvey(data: BetaSurveyData): void {
  try {
    localStorage.setItem(STORAGE_KEY_SURVEY, JSON.stringify(data));
  } catch (e) {
    console.error("Errore salvataggio protocollo di collaudo", e);
  }
}

export function formatSurveyToText(survey: BetaSurveyData): string {
  const lines: string[] = [];
  lines.push("=================================================");
  lines.push("PROTOCOLLO PERSONALE DI COLLAUDO (7 GIORNI)");
  lines.push("JARVIS — SECONDO CERVELLO VIRTUALE DI SERENA SAMPIERI");
  lines.push(`Ultimo aggiornamento: ${survey.dataUltimoAggiornamento || "In corso"}`);
  lines.push("=================================================\n");

  lines.push("1. PROBLEMA REALE vs PAROLE");
  lines.push("Domanda: Jarvis ha compreso il problema reale o soltanto le parole utilizzate?");
  lines.push(`- Giudizio: ${survey.problemaReale.giudizio || "Non risposto"}`);
  if (survey.problemaReale.note) lines.push(`- Dettagli/Esempi: ${survey.problemaReale.note}`);
  lines.push("");

  lines.push("2. PRIORITÀ ED ENERGIA REALE DISPONIBILE");
  lines.push("Domanda: Le priorità proposte erano compatibili con il tempo e l'energia disponibili (senza forzare 3 priorità per forza)?");
  lines.push(`- Giudizio: ${survey.prioritaEdEnergia.giudizio || "Non risposto"}`);
  if (survey.prioritaEdEnergia.note) lines.push(`- Dettagli/Esempi: ${survey.prioritaEdEnergia.note}`);
  lines.push("");

  lines.push("3. BABY STEP ESEGUIBILE & GIUSTO");
  lines.push("Domanda: Il baby step era sia eseguibile subito (5-10 min) sia GIUSTO (ha sbloccato davvero il problema anziché muovere solo polvere)?");
  lines.push(`- Giudizio: ${survey.babyStepEffettivo.giudizio || "Non risposto"}`);
  if (survey.babyStepEffettivo.note) lines.push(`- Dettagli/Esempi: ${survey.babyStepEffettivo.note}`);
  lines.push("");

  lines.push("4. VOCE: SINTESI & SCARICO vs AZIONE");
  lines.push("Domanda: La sintesi vocale era asciutta e completa? Ha compreso quando volevi solo depositare/scaricare rispetto a quando chiedevi un'azione?");
  lines.push(`- Giudizio: ${survey.voceScaricoVsAzione.giudizio || "Non risposto"}`);
  if (survey.voceScaricoVsAzione.note) lines.push(`- Dettagli/Esempi: ${survey.voceScaricoVsAzione.note}`);
  lines.push("");

  lines.push("5. CONTINUITÀ & MEMORIA DEL DOSSIER (REPLICA)");
  lines.push("Domanda: Replica & Integra ha mantenuto correttamente il contesto e la memoria del progetto senza ripartire da zero?");
  lines.push(`- Giudizio: ${survey.replicaEContinuita.giudizio || "Non risposto"}`);
  if (survey.replicaEContinuita.note) lines.push(`- Dettagli/Esempi: ${survey.replicaEContinuita.note}`);
  lines.push("");

  lines.push("6. CONSIGLIO DEI QUATTRO: COSTI REALI & PROSPETTIVE");
  lines.push("Domanda: Il Consiglio dei Quattro (Pragmatico, Economo, Scettico, Serena del Futuro) ha fatto emergere cose non considerate?");
  lines.push(`- Giudizio: ${survey.consiglioDeiQuattro.giudizio || "Non risposto"}`);
  if (survey.consiglioDeiQuattro.note) lines.push(`- Dettagli/Esempi: ${survey.consiglioDeiQuattro.note}`);
  lines.push("");

  lines.push("7. SECONDO CERVELLO vs BUON ASSISTENTE");
  lines.push("Domanda: Dopo sette giorni, Jarvis si comporta già come un secondo cervello o ancora come un buon assistente?");
  lines.push(`- Giudizio: ${survey.secondoCervelloVsAssistente.giudizio || "Non risposto"}`);
  if (survey.secondoCervelloVsAssistente.note) lines.push(`- Dettagli/Esempi: ${survey.secondoCervelloVsAssistente.note}`);
  lines.push("");

  if (survey.caricoMentalePrima !== undefined && survey.caricoMentaleDopo !== undefined) {
    lines.push("IMPATTO SUL CARICO MENTALE (SCALA 1-10):");
    lines.push(`- Prima dell'elaborazione di Jarvis: ${survey.caricoMentalePrima}/10`);
    lines.push(`- Dopo la scomposizione di Jarvis: ${survey.caricoMentaleDopo}/10`);
    lines.push(`- Delta di alleggerimento: ${survey.caricoMentalePrima - survey.caricoMentaleDopo} punti`);
    lines.push("");
  }

  if (survey.correzioniCognitive) {
    lines.push("CORREZIONI COGNITIVE & COLLEGAMENTI DA MEMORIZZARE:");
    lines.push(survey.correzioniCognitive);
    lines.push("");
  }

  lines.push("-------------------------------------------------");
  lines.push("NOTA SULLA RISERVATEZZA:");
  lines.push("Le analisi e le note salvate dall'app vengono conservate nel LocalStorage del browser.");
  lines.push("Durante il test non utilizzare informazioni personali o sensibili finché non saranno verificati tutti i flussi tecnici dell'elaborazione vocale e testuale.");
  lines.push("=================================================");
  return lines.join("\n");
}

// =========================================================================
// MOTORE DI BACKUP, ANTEPRIMA DRY-RUN E RIPRISTINO TRANSAZIONALE (STEP 1)
// =========================================================================

export function computeBackupStats(
  history: AnalysisRecord[],
  survey?: BetaSurveyData,
  memories?: JarvisMemoryItem[],
  dossiers?: JarvisDossier[]
): JarvisBackupStats {
  let openTasks = 0;
  let completedTasks = 0;
  let babyStepsCount = 0;
  let scadenzeCount = 0;

  history.forEach((rec) => {
    if (rec.deletedAt) return; // ignora elementi cancellati (soft-delete)
    if (rec.babyStep?.azione) {
      babyStepsCount++;
      if (rec.babyStep.completato) completedTasks++;
      else openTasks++;
    }
    if (rec.azioni && Array.isArray(rec.azioni)) {
      rec.azioni.forEach((a) => {
        if (a.completata) completedTasks++;
        else openTasks++;
      });
    }
    if (rec.decisione?.prossimoPasso?.azione) {
      babyStepsCount++;
      if (rec.decisione.prossimoPasso.completato) completedTasks++;
      else openTasks++;
    }
    if (rec.consiglio?.prossimoPasso?.azione) {
      babyStepsCount++;
      if (rec.consiglio.prossimoPasso.completato) completedTasks++;
      else openTasks++;
    }
    if (rec.scadenze && Array.isArray(rec.scadenze)) {
      scadenzeCount += rec.scadenze.length;
    }
  });

  const surveyAnsweredQuestions = survey
    ? [
        survey.problemaReale?.giudizio,
        survey.prioritaEdEnergia?.giudizio,
        survey.babyStepEffettivo?.giudizio,
        survey.voceScaricoVsAzione?.giudizio,
        survey.replicaEContinuita?.giudizio,
        survey.consiglioDeiQuattro?.giudizio,
        survey.secondoCervelloVsAssistente?.giudizio,
      ].filter(Boolean).length
    : 0;

  return {
    totalRecords: history.filter((r) => !r.deletedAt).length,
    openTasks,
    completedTasks,
    babyStepsCount,
    scadenzeCount,
    surveyAnsweredQuestions,
    memoriesCount: memories ? memories.filter((m) => !m.deletedAt).length : undefined,
    dossiersCount: dossiers ? dossiers.filter((d) => !d.deletedAt).length : undefined,
  };
}

/**
 * Genera il file di esportazione JSON versionato conforme ai requisiti dello Step 1.
 * - Nome jarvis_backup_YYYY-MM-DD_HHMMSS.json
 * - Verifica preventiva assenza dati ASL e MUM (sanitizzazione)
 * - Calcolo SHA-256 su payload
 * - Metadati di versione e stats
 */
export async function createBackupEnvelope(): Promise<{
  envelope: JarvisBackupEnvelopeV1;
  filename: string;
  jsonString: string;
}> {
  const history = loadHistory();
  const settings = loadSettings();
  const survey = loadBetaSurvey();
  const rawMemories = loadMemories(true);
  const rawDossiers = loadDossiers(true);

  // Verifica preventiva perimetro sui record: scarta eventuali record non conformi
  const sanitizedHistory: AnalysisRecord[] = [];
  for (const record of history) {
    const rawCheck = classifyPerimeter(record.rawInput || "");
    const cleanCheck = classifyPerimeter(record.trascrizionePulita || "");
    if (!rawCheck.isAllowed || !cleanCheck.isAllowed) {
      console.warn(
        `[BACKUP] Record ${record.id} escluso preventivamente dall'export (violazione perimetro: ${rawCheck.motivo || cleanCheck.motivo})`
      );
      continue;
    }
    sanitizedHistory.push(record);
  }

  // Sanitizzazione memorie e dossier da perimetro
  const sanitizedMemories: JarvisMemoryItem[] = [];
  for (const m of rawMemories) {
    const check = classifyPerimeter(m.testo || "");
    if (check.isAllowed) {
      sanitizedMemories.push(m);
    }
  }

  const sanitizedDossiers: JarvisDossier[] = [];
  for (const d of rawDossiers) {
    const c1 = classifyPerimeter(d.titolo || "");
    const c2 = classifyPerimeter(d.descrizione || "");
    if (c1.isAllowed && c2.isAllowed) {
      sanitizedDossiers.push(d);
    }
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const mins = pad(now.getMinutes());
  const secs = pad(now.getSeconds());

  const filename = `jarvis_backup_${year}-${month}-${day}_${hours}${mins}${secs}.json`;
  const exportedAt = now.toISOString();
  const deviceId = getOrCreateDeviceId();
  const stats = computeBackupStats(
    sanitizedHistory,
    survey,
    sanitizedMemories.length > 0 ? sanitizedMemories : undefined,
    sanitizedDossiers.length > 0 ? sanitizedDossiers : undefined
  );

  const payload: JarvisBackupEnvelopeV1["payload"] = {
    history: sanitizedHistory,
    settings,
    survey,
  };
  if (sanitizedMemories.length > 0) {
    payload.memories = sanitizedMemories;
  }
  if (sanitizedDossiers.length > 0) {
    payload.dossiers = sanitizedDossiers;
  }

  // Calcolo SHA-256 su rappresentazione canonica deterministica ordinata per chiavi
  const canonicalPayloadString = canonicalJsonStringify(payload);
  const sha256Checksum = await computeSha256(canonicalPayloadString);

  const envelope: JarvisBackupEnvelopeV1 = {
    schemaVersion: 1,
    appVersion: APP_VERSION,
    exportedAt,
    deviceId,
    stats,
    sha256Checksum,
    payload,
  };

  const jsonString = JSON.stringify(envelope, null, 2);

  return {
    envelope,
    filename,
    jsonString,
  };
}

/**
 * Validazione in modalità DRY RUN:
 * Analizza il file JSON, ne controlla la sintassi, verifica lo schema e il perimetro
 * SENZA SCRIVERE NULLA nel LocalStorage.
 */
export async function validateBackupDryRun(rawJsonText: string): Promise<DryRunValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const detectedViolations: string[] = [];

  if (!rawJsonText || !rawJsonText.trim()) {
    return {
      isValid: false,
      errors: ["Il file caricato è completamente vuoto."],
      warnings: [],
    };
  }

  let parsedData: any;
  try {
    parsedData = JSON.parse(rawJsonText);
  } catch (err: any) {
    return {
      isValid: false,
      errors: [`Errore di sintassi JSON: impossibile interpretare il file (${err?.message || "JSON non valido"})`],
      warnings: [],
    };
  }

  if (typeof parsedData !== "object" || parsedData === null || Array.isArray(parsedData)) {
    return {
      isValid: false,
      errors: ["Struttura non conforme: il file di backup deve contenere un oggetto JSON envelope."],
      warnings: [],
    };
  }

  // 1. Controllo schemaVersion
  if (parsedData.schemaVersion === undefined || parsedData.schemaVersion === null) {
    errors.push("Campo obbligatorio 'schemaVersion' mancante nell'intestazione del file.");
  } else if (typeof parsedData.schemaVersion !== "number") {
    errors.push("Il campo 'schemaVersion' deve essere un numero intero.");
  } else if (parsedData.schemaVersion > 1) {
    errors.push(
      `Versione schema futura (${parsedData.schemaVersion}) non supportata. Questa versione dell'app supporta schemaVersion 1. Aggiorna l'applicazione.`
    );
  } else if (parsedData.schemaVersion < 1) {
    errors.push(`Versione schema non valida (${parsedData.schemaVersion}).`);
  }

  // 2. Controllo exportedAt
  if (!parsedData.exportedAt || typeof parsedData.exportedAt !== "string") {
    errors.push("Campo obbligatorio 'exportedAt' (data ISO del backup) mancante o non valido.");
  }

  // 3. Controllo payload
  if (!parsedData.payload || typeof parsedData.payload !== "object") {
    errors.push("Struttura 'payload' assente o non valida.");
  } else {
    const payload = parsedData.payload;
    if (!Array.isArray(payload.history)) {
      errors.push("Il campo 'payload.history' deve essere un elenco di analisi.");
    } else {
      // Verifica ogni record
      payload.history.forEach((rec: any, idx: number) => {
        if (!rec || typeof rec !== "object") {
          errors.push(`Record #${idx + 1} nel payload non è un oggetto valido.`);
          return;
        }
        if (!rec.id || typeof rec.id !== "string") {
          errors.push(`Record #${idx + 1} privo di identificatore 'id' univoco.`);
        }
        if (typeof rec.rawInput !== "string") {
          errors.push(`Record #${idx + 1} privo del testo originale 'rawInput'.`);
        }
      });
    }

    // SCANSIONE PERIMETRALE RICORSIVA PROFONDA SU TUTTI I CAMPI TESTUALI
    // (rawInput, trascrizionePulita, titolo, sintesi, note, decisioni, babyStep, consiglieri, settings, survey, ecc.)
    const deepViolations = scanObjectForPerimeterViolations(payload, "payload");
    deepViolations.forEach((viol) => {
      detectedViolations.push(
        `${viol.path}: ${viol.motivo} (Termini: ${viol.matchedTerms.join(", ")}) [Estratto: "${viol.valueSnippet}"]`
      );
    });
  }

  if (detectedViolations.length > 0) {
    errors.push(
      `Rilevate ${detectedViolations.length} violazioni del perimetro di riservatezza (ASL/MUM) nei dati del file. Il ripristino è bloccato a tutela dei confini personali.`
    );
  }

  // 4. Controllo integrità SHA-256 su rappresentazione canonica deterministica
  if (parsedData.payload && parsedData.sha256Checksum) {
    try {
      const canonicalPayload = canonicalJsonStringify(parsedData.payload);
      const computed = await computeSha256(canonicalPayload);
      if (computed !== parsedData.sha256Checksum) {
        errors.push(
          `Integrità compromessa: l'hash SHA-256 calcolato (${computed.slice(0, 16)}...) non corrisponde al checksum dell'envelope (${parsedData.sha256Checksum.slice(0, 16)}...). Il backup è alterato o corrotto.`
        );
      }
    } catch (err: any) {
      errors.push(`Errore nel calcolo del checksum SHA-256: ${err?.message || "Errore crittografico"}`);
    }
  } else if (!parsedData.sha256Checksum) {
    errors.push("Campo obbligatorio 'sha256Checksum' mancante nell'intestazione del file di backup.");
  }

  // Calcolo statistiche in dry run
  const stats = parsedData.payload?.history
    ? computeBackupStats(
        parsedData.payload.history,
        parsedData.payload.survey,
        parsedData.payload.memories,
        parsedData.payload.dossiers
      )
    : undefined;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    detectedPerimetroViolations: detectedViolations,
    stats,
    envelope: errors.length === 0 ? (parsedData as JarvisBackupEnvelopeV1) : undefined,
    sourceDevice: parsedData.deviceId,
    exportedAt: parsedData.exportedAt,
    schemaVersion: parsedData.schemaVersion,
  };
}

/**
 * Crea uno snapshot automatico di sicurezza prima di eseguire il ripristino.
 */
export function createSafetySnapshot(reason: string): SafetySnapshot {
  const snapshot: SafetySnapshot = {
    snapshotTimestamp: new Date().toISOString(),
    reason,
    history: loadHistory(),
    settings: loadSettings(),
    survey: loadBetaSurvey(),
    memories: loadMemories(true),
    dossiers: loadDossiers(true),
  };
  try {
    localStorage.setItem(STORAGE_KEY_SAFETY_SNAPSHOT, JSON.stringify(snapshot));
  } catch (e) {
    console.error("Errore salvataggio snapshot di sicurezza", e);
  }
  return snapshot;
}

/**
 * Recupera l'ultimo snapshot di sicurezza disponibile per eventuale rollback.
 */
export function getLatestSafetySnapshot(): SafetySnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAFETY_SNAPSHOT);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

let isRestoreLockActive = false;

/**
 * Esegue il rollback immediato allo snapshot di sicurezza.
 * Include gestione protetta da corruzione dello snapshot.
 */
export function restoreSafetySnapshot(): { success: boolean; error?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAFETY_SNAPSHOT);
    if (!raw) {
      return { success: false, error: "Nessuno snapshot di sicurezza disponibile per il rollback." };
    }
    let snapshot: SafetySnapshot;
    try {
      snapshot = JSON.parse(raw);
    } catch {
      return {
        success: false,
        error: "Snapshot di sicurezza corrotto (JSON non valido): rollback bloccato a tutela dei dati.",
      };
    }
    if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.history)) {
      return {
        success: false,
        error: "Struttura dello snapshot di sicurezza alterata o non conforme: rollback rifiutato.",
      };
    }
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(snapshot.history));
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(snapshot.settings || DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEY_SURVEY, JSON.stringify(snapshot.survey || DEFAULT_SURVEY));
    if (snapshot.memories && Array.isArray(snapshot.memories)) {
      saveAllMemories(snapshot.memories);
    }
    if (snapshot.dossiers && Array.isArray(snapshot.dossiers)) {
      saveAllDossiers(snapshot.dossiers);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Errore durante il rollback." };
  }
}

/**
 * Esegue il ripristino transazionale con validazione pre-scrittura:
 * 1. Convalida preventiva obbligatoria (dry-run): hash SHA-256, schemaVersion, perimetro.
 *    Se non valida, il ripristino viene rifiutato SENZA toccare localStorage.
 * 2. Blocco concorrenza per evitare doppi clic o sovrascritture simultanee.
 * 3. Snapshot di sicurezza preventivo dello stato attuale.
 * 4. Scrittura transazionale dei dati nel browser.
 * 5. Se la scrittura o verifica fallisce, rollback automatico dallo snapshot.
 */
export async function executeSafeRestore(envelopeInput: JarvisBackupEnvelopeV1 | string): Promise<{
  success: boolean;
  error?: string;
  stats?: JarvisBackupStats;
  safetySnapshotTimestamp?: string;
}> {
  if (isRestoreLockActive) {
    return {
      success: false,
      error: "Operazione di ripristino già in corso. Richiesta concorrente ignorata a tutela dell'integrità.",
    };
  }

  isRestoreLockActive = true;
  try {
    const rawJson = typeof envelopeInput === "string" ? envelopeInput : JSON.stringify(envelopeInput);

    // 1. Validazione preventiva rigorosa prima di toccare lo storage
    const validation = await validateBackupDryRun(rawJson);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Ripristino rifiutato: backup non valido (${validation.errors.join("; ")}). Nessuna modifica apportata ai dati locali.`,
      };
    }

    const envelope = validation.envelope || (JSON.parse(rawJson) as JarvisBackupEnvelopeV1);

    // 2. Snapshot di sicurezza dello stato corrente
    const safety = createSafetySnapshot("Snapshot automatico pre-ripristino");

    // 3. Scrittura transazionale dei dati nel browser
    const newHistory = envelope.payload.history || [];
    const newSettings = envelope.payload.settings || DEFAULT_SETTINGS;
    const newSurvey = envelope.payload.survey || DEFAULT_SURVEY;

    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory));
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    localStorage.setItem(STORAGE_KEY_SURVEY, JSON.stringify(newSurvey));

    if (envelope.payload.memories && Array.isArray(envelope.payload.memories)) {
      saveAllMemories(envelope.payload.memories);
    }
    if (envelope.payload.dossiers && Array.isArray(envelope.payload.dossiers)) {
      saveAllDossiers(envelope.payload.dossiers);
    }

    // 4. Verifica post-scrittura
    const verified = loadHistory();
    if (verified.length !== newHistory.length) {
      throw new Error("Verifica post-scrittura fallita: discrepanza nel numero di record ripristinati.");
    }

    return {
      success: true,
      stats: envelope.stats || computeBackupStats(newHistory, newSurvey, envelope.payload.memories, envelope.payload.dossiers),
      safetySnapshotTimestamp: safety.snapshotTimestamp,
    };
  } catch (err: any) {
    console.error("[RIPRISTINO] Errore durante la scrittura: esecuzione rollback automatico...", err);
    // 5. Rollback immediato
    restoreSafetySnapshot();
    return {
      success: false,
      error: `Errore durante il ripristino transazionale: ${err?.message || "Anomalia storage"}. I dati precedenti sono stati ripristinati dallo snapshot di sicurezza.`,
    };
  } finally {
    isRestoreLockActive = false;
  }
}
