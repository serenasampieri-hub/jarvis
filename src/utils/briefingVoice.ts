/**
 * Modulo Briefing Quotidiano PULL e Sintesi Vocale Sobria (Fase 6).
 * Destinataria: Serena Sampieri
 * 
 * Principi Guida:
 * 1. Rigorosamente PULL: Nessuna notifica push invasiva alle 08:00, nessun trigger automatico.
 *    Attivabile unicamente su richiesta ("Dammi il punto di oggi").
 * 2. Formato Ultra-Compatto:
 *    - 1 sola priorità reale aperta;
 *    - 1 baby step da 5-10 minuti eseguibile subito;
 *    - eventuali scadenze/vincoli oggettivi entro 24-48h.
 * 3. Tono René Ferretti:
 *    Sobrio, pragmatico, zero prediche motivazionali, zero compiacimento.
 *    "Portiamo a casa la giornata, poi si vedrà".
 * 4. Barriera Perimetrale Invalicabile:
 *    Filtro categorico ASL Roma 1 & MUM applicato a monte e a valle.
 */

import { AnalysisRecord, JarvisDailyBriefing, JarvisMemoryItem } from "../types";
import { loadHistory } from "./storage";
import { loadMemories } from "./memoryManager";
import { classifyPerimeter, scanObjectForPerimeterViolations } from "./perimeter";

export interface VoicePlaybackCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
  onPause?: () => void;
  onResume?: () => void;
}

const RENE_FERRETTI_MOTTI = [
  "Poco fumo, un passo per volta: portiamo a casa la giornata, poi si vedrà.",
  "Niente ansie preventive: chiudiamo questo baby step e la giornata è al sicuro.",
  "Una cosa per volta, fatta bene: concentrati su questo e archiviamo la pratica.",
  "Nessun sovraccarico inutile: un passo concreto ora e il resto segue a ruota.",
];

function isTermineImminente(termine: string, vincolante: boolean): boolean {
  if (vincolante) return true;
  const lower = termine.toLowerCase();
  return (
    lower.includes("oggi") ||
    lower.includes("domani") ||
    lower.includes("24") ||
    lower.includes("48") ||
    lower.includes("subito") ||
    lower.includes("urgente") ||
    lower.includes("immediato") ||
    lower.includes("stasera") ||
    lower.includes("entro le")
  );
}

/**
 * Genera il briefing quotidiano compatto in modalità deterministica PULL.
 * Filtra a monte qualsiasi record o elemento fuori dal perimetro personale.
 */
export function generateDailyBriefing(options?: {
  history?: AnalysisRecord[];
  memories?: JarvisMemoryItem[];
}): JarvisDailyBriefing {
  const allRecords = options?.history || (typeof window !== "undefined" ? loadHistory() : []);
  const allMemories = options?.memories || (typeof window !== "undefined" ? loadMemories() : []);

  // 1. Filtraggio rigoroso perimetro personale (No ASL, No MUM)
  const safeRecords = allRecords.filter((rec) => {
    if (rec.fuoriPerimetro) return false;
    const violations = scanObjectForPerimeterViolations(rec);
    return violations.length === 0;
  });

  const safeMemories = allMemories.filter((m) => {
    if (m.deletedAt) return false;
    const check = classifyPerimeter(m.testo);
    return check.isAllowed;
  });

  // Ordina la storia dalla più recente alla più vecchia
  const sortedRecords = [...safeRecords].sort((a, b) => {
    const timeA = a.timestampMs || 0;
    const timeB = b.timestampMs || 0;
    return timeB - timeA;
  });

  // 2. Estrazione candidati: Priorità aperta, Baby step pendente, Scadenze imminenti
  interface CandidateTask {
    id: string;
    titolo: string;
    origine: "Organizzazione" | "Decisione" | "Consiglio" | "Memoria";
    recordId: string;
    isBabyStep: boolean;
    durataStimata?: string;
    motivo?: string;
    hasImminentDeadline?: boolean;
    timestampMs: number;
    subId?: string;
  }

  const openTasks: CandidateTask[] = [];
  const openBabySteps: CandidateTask[] = [];
  const vincoliImminenti: {
    id: string;
    termine: string;
    oggetto: string;
    vincolante: boolean;
    recordId: string;
  }[] = [];

  sortedRecords.forEach((rec) => {
    const effMode = rec.modalitaEffettiva || rec.modalita;
    const recTime = rec.timestampMs || 0;

    // Scadenze
    if (rec.scadenze && Array.isArray(rec.scadenze)) {
      rec.scadenze.forEach((s) => {
        if (s.termine || s.oggetto) {
          const isImm = isTermineImminente(s.termine, Boolean(s.vincolante));
          if (isImm) {
            vincoliImminenti.push({
              id: `${rec.id}__scad__${s.id}`,
              termine: s.termine,
              oggetto: s.oggetto,
              vincolante: Boolean(s.vincolante),
              recordId: rec.id,
            });
          }
        }
      });
    }

    // Baby step in organizzazione
    if (rec.babyStep && rec.babyStep.azione && !rec.babyStep.completato) {
      const bTask: CandidateTask = {
        id: `${rec.id}__babystep`,
        titolo: rec.babyStep.azione,
        origine: "Organizzazione",
        recordId: rec.id,
        isBabyStep: true,
        durataStimata: rec.babyStep.durataStimata || "10 min",
        motivo: rec.babyStep.motivo,
        timestampMs: recTime,
      };
      openBabySteps.push(bTask);
      openTasks.push(bTask);
    }

    // Azioni in organizzazione
    if (rec.azioni && Array.isArray(rec.azioni)) {
      rec.azioni.forEach((a) => {
        if (a.testo && !a.completata) {
          openTasks.push({
            id: `${rec.id}__act__${a.id}`,
            titolo: a.testo,
            origine: "Organizzazione",
            recordId: rec.id,
            isBabyStep: false,
            timestampMs: recTime,
            subId: a.id,
          });
        }
      });
    }

    // Decisione - prossimo passo
    if (
      effMode === "decisione" &&
      rec.decisione?.prossimoPasso?.azione &&
      !rec.decisione.prossimoPasso.completato
    ) {
      const dTask: CandidateTask = {
        id: `${rec.id}__decstep`,
        titolo: rec.decisione.prossimoPasso.azione,
        origine: "Decisione",
        recordId: rec.id,
        isBabyStep: true,
        durataStimata: "10 min",
        timestampMs: recTime,
      };
      openBabySteps.push(dTask);
      openTasks.push(dTask);
    }

    // Consiglio - prossimo passo
    if (
      effMode === "consiglio" &&
      rec.consiglio?.prossimoPasso?.azione &&
      !rec.consiglio.prossimoPasso.completato
    ) {
      const cTask: CandidateTask = {
        id: `${rec.id}__consstep`,
        titolo: rec.consiglio.prossimoPasso.azione,
        origine: "Consiglio",
        recordId: rec.id,
        isBabyStep: true,
        durataStimata: "10 min",
        timestampMs: recTime,
      };
      openBabySteps.push(cTask);
      openTasks.push(cTask);
    }
  });

  // 3. Selezione di 1 sola priorità reale
  // Preferenza: task con vincolo imminente o il task più recente non baby-step; se solo baby-step, usa quello.
  let prioritaSelezionata: CandidateTask | null = null;
  const nonBabyTasks = openTasks.filter((t) => !t.isBabyStep);

  if (nonBabyTasks.length > 0) {
    // Seleziona il più recente
    prioritaSelezionata = nonBabyTasks[0];
  } else if (openTasks.length > 0) {
    prioritaSelezionata = openTasks[0];
  }

  // 4. Selezione di 1 solo baby step concreto
  let babyStepSelezionato: CandidateTask | null = null;
  if (prioritaSelezionata) {
    // Cerca baby step collegato allo stesso record della priorità
    const collegato = openBabySteps.find((b) => b.recordId === prioritaSelezionata!.recordId);
    if (collegato) {
      babyStepSelezionato = collegato;
    }
  }

  if (!babyStepSelezionato && openBabySteps.length > 0) {
    babyStepSelezionato = openBabySteps[0];
  }

  // Se ancora non c'è baby step ma c'è una priorità, formula un baby step essenziale da 5-10 min
  if (!babyStepSelezionato && prioritaSelezionata) {
    babyStepSelezionato = {
      id: `${prioritaSelezionata.recordId}__quickstep`,
      titolo: `Definire il primo passaggio di 5 minuti per: ${prioritaSelezionata.titolo}`,
      origine: prioritaSelezionata.origine,
      recordId: prioritaSelezionata.recordId,
      isBabyStep: true,
      durataStimata: "5 min",
      motivo: "Sbloccare l'inerzia iniziale senza affanno",
      timestampMs: prioritaSelezionata.timestampMs,
    };
  }

  // 5. Selezione max 2 vincoli oggettivi più imminenti
  const vincoliSelezionati = vincoliImminenti.slice(0, 2);

  // 6. Contesto Memoria Storica Trasparente (Fase 5)
  // Cerca fatti confermati pertinenti a ritmi, orari o benessere
  const contestoMemoriaApplicato: string[] = [];
  const keywordRitmi = /(?:ritm|orari|mattin|pomeriggi|ripos|energi|paus|abitudin|blocch)/i;
  const memorieRitmo = safeMemories.filter((m) => m.tipo === "fatto" && keywordRitmi.test(m.testo));
  if (memorieRitmo.length > 0) {
    contestoMemoriaApplicato.push(memorieRitmo[0].testo);
  }

  // 7. Selezione Motto René Ferretti sobrio
  let motto = RENE_FERRETTI_MOTTI[0];
  if (!prioritaSelezionata && !babyStepSelezionato && vincoliSelezionati.length === 0) {
    motto = "Orizzonte sgombro: nessuna pendenza aperta. Goditi lo spazio libero senza inventarti urgenze.";
  } else if (openTasks.length > 3) {
    motto = RENE_FERRETTI_MOTTI[2]; // "Una cosa per volta, fatta bene: concentrati su questo e archiviamo la pratica."
  } else {
    motto = RENE_FERRETTI_MOTTI[Math.floor(Math.random() * RENE_FERRETTI_MOTTI.length)];
  }

  // 8. Costruzione del testo parlato compatto (20-30s) per Web Speech API
  let testoParlato = "";
  if (!prioritaSelezionata && !babyStepSelezionato && vincoliSelezionati.length === 0) {
    testoParlato = "Ciao Serena. Ecco il punto essenziale di oggi: non ci sono priorità pendenti né scadenze urgenti registrate. Orizzonte completamente sgombro. Ottimo così: giornata libera da urgenze.";
  } else {
    const parti: string[] = ["Ciao Serena, ecco il punto essenziale di oggi."];

    if (prioritaSelezionata) {
      parti.push(`Una sola priorità reale: ${ripulisciPerVoce(prioritaSelezionata.titolo)}.`);
    }

    if (babyStepSelezionato) {
      const durata = babyStepSelezionato.durataStimata ? `, circa ${babyStepSelezionato.durataStimata}` : "";
      parti.push(`Il baby step concreto per iniziare: ${ripulisciPerVoce(babyStepSelezionato.titolo)}${durata}.`);
    }

    if (vincoliSelezionati.length > 0) {
      const descrVincoli = vincoliSelezionati
        .map((v) => `${ripulisciPerVoce(v.oggetto || "impegno")} entro ${ripulisciPerVoce(v.termine)}`)
        .join("; ");
      parti.push(`Vincoli oggettivi da ricordare: ${descrVincoli}.`);
    } else {
      parti.push("Nessun vincolo inderogabile nelle prossime ventiquattro ore.");
    }

    if (contestoMemoriaApplicato.length > 0) {
      parti.push(`Ricorda la tua abitudine confermata: ${ripulisciPerVoce(contestoMemoriaApplicato[0])}.`);
    }

    parti.push(motto);
    testoParlato = parti.join(" ");
  }

  // Validazione di sicurezza finale sul testo parlato generato
  const checkParlato = classifyPerimeter(testoParlato);
  if (!checkParlato.isAllowed) {
    testoParlato = "Ciao Serena, punto di oggi: concentrati su una cosa alla volta con calma. Portiamo a casa la giornata, poi si vedrà.";
  }

  // Stima secondi di ascolto (~130 parole al minuto)
  const parole = testoParlato.split(/\s+/).filter(Boolean).length;
  const durataStimataSecondi = Math.max(15, Math.min(45, Math.round((parole / 130) * 60)));

  return {
    id: `briefing_${Date.now()}`,
    generatoIl: new Date().toISOString(),
    prioritaReale: prioritaSelezionata
      ? {
          id: prioritaSelezionata.id,
          titolo: prioritaSelezionata.titolo,
          origine: prioritaSelezionata.origine,
          recordId: prioritaSelezionata.recordId,
        }
      : null,
    babyStep: babyStepSelezionato
      ? {
          id: babyStepSelezionato.id,
          azione: babyStepSelezionato.titolo,
          durataStimata: babyStepSelezionato.durataStimata,
          motivo: babyStepSelezionato.motivo,
          recordId: babyStepSelezionato.recordId,
          subId: babyStepSelezionato.subId,
          completato: false,
        }
      : null,
    vincoliOggettivi: vincoliSelezionati,
    messaggioPragmatico: motto,
    testoParlatoCompleto: testoParlato,
    durataStimataSecondi,
    contestoMemoria: contestoMemoriaApplicato.length > 0 ? contestoMemoriaApplicato : undefined,
  };
}

/**
 * Pulisce il testo da formattazioni markdown o simboli tecnici prima della sintesi vocale.
 */
export function ripulisciPerVoce(testo: string): string {
  if (!testo) return "";
  return testo
    .replace(/[*_#`~]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\d+)\s*h\b/gi, "$1 ore")
    .replace(/(\d+)\s*min\b/gi, "$1 minuti")
    .trim();
}

// =============================================================================
// WEB SPEECH API CONTROLLER
// =============================================================================

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Restituisce le voci italiane disponibili nel browser.
 */
export function getItalianVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisAvailable()) return [];
  const voices = window.speechSynthesis.getVoices();
  return voices.filter(
    (v) =>
      v.lang === "it-IT" ||
      v.lang === "it_IT" ||
      v.lang.toLowerCase().startsWith("it")
  );
}

/**
 * Avvia la sintesi vocale del testo con configurazione naturale e sobria.
 */
export function speakBriefing(
  text: string,
  callbacks?: VoicePlaybackCallbacks
): () => void {
  if (!isSpeechSynthesisAvailable()) {
    callbacks?.onError?.(new Error("Web Speech API non supportata da questo browser"));
    return () => {};
  }

  // Interrompi qualsiasi parlato precedente
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  utterance.rate = 1.0; // Velocità naturale di conversazione
  utterance.pitch = 1.0; // Tono naturale sobrio

  const italianVoices = getItalianVoices();
  if (italianVoices.length > 0) {
    // Preferisci voce naturale o di sistema se disponibile
    const naturalVoice = italianVoices.find(
      (v) => v.name.includes("Natural") || v.name.includes("Premium") || v.name.includes("Alice") || v.name.includes("Elsa")
    );
    utterance.voice = naturalVoice || italianVoices[0];
  }

  utterance.onstart = () => {
    callbacks?.onStart?.();
  };

  utterance.onend = () => {
    callbacks?.onEnd?.();
  };

  utterance.onerror = (event) => {
    callbacks?.onError?.(event);
  };

  utterance.onpause = () => {
    callbacks?.onPause?.();
  };

  utterance.onresume = () => {
    callbacks?.onResume?.();
  };

  window.speechSynthesis.speak(utterance);

  // Restituisce funzione di cleanup/stop immediato
  return () => {
    if (isSpeechSynthesisAvailable()) {
      window.speechSynthesis.cancel();
    }
  };
}

export function pauseSpeech(): void {
  if (isSpeechSynthesisAvailable()) {
    window.speechSynthesis.pause();
  }
}

export function resumeSpeech(): void {
  if (isSpeechSynthesisAvailable()) {
    window.speechSynthesis.resume();
  }
}

export function stopSpeech(): void {
  if (isSpeechSynthesisAvailable()) {
    window.speechSynthesis.cancel();
  }
}
