export type ModalitaJarvis = "auto" | "deposito" | "organizzazione" | "decisione" | "consiglio";

export interface RispostaVocale {
  situazione: string;
  puntiSalienti: string[]; // massimo tre punti rilevanti
  prossimoPasso: string;
  testoParlatoCompleto: string; // testo fluido per sintesi vocale di ~30s
  durataStimataSecondi: number;
}

export interface BabyStep {
  azione: string;
  durataStimata: string;
  motivo: string;
  tempistica?: "Da fare ora" | "Da fare prima della scadenza";
  completato?: boolean;
}

export interface Azione {
  id: string;
  testo: string;
  energiaRichiesta: "bassa" | "media" | "alta";
  tipo: "fatto" | "deduzione" | "suggerimento";
  completata?: boolean;
}

export interface Scadenza {
  id: string;
  termine: string;
  oggetto: string;
  vincolante: boolean;
}

export interface Criticita {
  id: string;
  ostacolo: string;
  soluzionePragmatica: string;
  risolta?: boolean;
}

export interface FonteWeb {
  fonte: string;
  dettaglio: string;
  tipo: "fatto_verificato" | "opinione";
  ufficiale?: boolean;
}

export interface DecisioneData {
  situazione: string;
  vantaggi: string[];
  svantaggi: string[];
  costiReali: {
    denaro: string;
    tempo: string;
    energiaMentale: string;
    complessitaLogistica: string;
  };
  soluzioneAlternativaEconomica: string;
  rischioPentimento: {
    livello: "basso" | "medio" | "alto";
    motivazione: string;
  };
  verdettoProvvisorio: string;
  prossimoPasso: {
    azione: string;
    completato?: boolean;
  };
  datiMancanti?: string;
  fontiWeb?: FonteWeb[];
}

export interface ConsiglioData {
  tema: string;
  consiglieri: {
    pragmatico: string[];
    economo: string[];
    scettico: string[];
    serenaDelFuturo: string[];
  };
  sintesiConsiglio: string;
  puntiAccordo: string[];
  puntiDisaccordo: string[];
  verdettoProvvisorio: string;
  prossimoPasso: {
    azione: string;
    completato?: boolean;
  };
  fontiWeb?: FonteWeb[];
}

export interface AnalysisRecord {
  id: string;
  timestamp: string;
  timestampMs?: number; // millisecondi per ordinamento cronologico certo
  rawInput: string;
  trascrizionePulita?: string; // Input vocale ripulito da intercalari e rumore mantenendo il senso
  modalita: ModalitaJarvis;
  modalitaEffettiva?: "deposito" | "organizzazione" | "decisione" | "consiglio"; // Se auto, modalità determinata
  domandaDisambiguazioneModalita?: string; // Se la modalità non è chiara, una sola domanda breve
  fuoriPerimetro: boolean;
  messaggioPerimetro?: string;
  // Risposta vocale breve (~30 secondi)
  rispostaVocale?: RispostaVocale;
  // Sezione Deposito (Presa d'atto, ordine mentale, zero compiti forzati)
  deposito?: {
    sintesi: string;
    chiaviDiPensiero: string[];
    annotazioneSilenziosa?: string;
  };
  // Sezione Organizzazione
  sintesi?: string;
  babyStep?: BabyStep;
  azioni?: Azione[];
  scadenze?: Scadenza[];
  scadenzaNote?: string;
  criticita?: Criticita[];
  domandaIndispensabile?: string;
  // Sezione Decisione
  decisione?: DecisioneData;
  // Sezione Consiglio
  consiglio?: ConsiglioData;
  fontiWeb?: FonteWeb[];
  // Repliche successive per ampliare il progetto step-by-step
  repliche?: ReplicaStep[];
  titoloProgetto?: string;
  // Metadati di sincronizzazione e sovranità
  createdAt?: string; // ISO 8601
  updatedAt?: string; // ISO 8601
  revision?: number; // Contatore incrementale di versione del record
  deviceId?: string; // ID stabile del dispositivo che ha generato l'aggiornamento
  deletedAt?: string | null; // Soft-delete per evitare sovrascritture distruttive
}

export interface ReplicaStep {
  id: string;
  timestamp: string;
  richiesta: string;
  rispostaSintetica?: string;
  nuovoBabyStep?: string;
}

export type SyncStatus = "synced" | "syncing" | "offline" | "error" | "unconfigured";

export interface JarvisSettings {
  salvataggioAutomatico: boolean;
  googleClientId?: string;
  autoSyncOnStartup?: boolean;
  lastSyncedAt?: string;
  syncStatus?: SyncStatus;
}

export interface SyncEngineResult {
  success: boolean;
  status: SyncStatus;
  lastSyncedAt?: string;
  recordsMergedCount?: number;
  conflictsResolvedCount?: number;
  details?: string;
  error?: string;
}

export interface BetaSurveyData {
  problemaReale: { giudizio: string; note: string };
  prioritaEdEnergia: { giudizio: string; note: string };
  babyStepEffettivo: { giudizio: string; note: string };
  voceScaricoVsAzione: { giudizio: string; note: string };
  replicaEContinuita: { giudizio: string; note: string };
  consiglioDeiQuattro: { giudizio: string; note: string };
  secondoCervelloVsAssistente: { giudizio: string; note: string };
  caricoMentalePrima?: number;
  caricoMentaleDopo?: number;
  correzioniCognitive: string;
  dataUltimoAggiornamento?: string;
}

export type MemoryType = "fatto" | "ipotesi" | "preferenza";
export type MemoryStatus = "confermato" | "da_validare" | "archiviato";
export type MemoryCategory = "progetto" | "personale" | "abitudine" | "vincolo" | "decisione";

export interface JarvisMemoryItem {
  id: string;
  tipo: MemoryType;
  categoria?: MemoryCategory;
  progettoId?: string;
  progettoNome?: string;
  testo: string;
  fonteRecordId?: string;
  status: MemoryStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  revision: number;
  deviceId: string;
  deletedAt?: string | null;
}

export interface JarvisDossier {
  id: string;
  titolo: string;
  descrizione?: string;
  stato: "attivo" | "in_pausa" | "completato";
  ultimoAggiornamento: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  revision: number;
  deviceId: string;
  deletedAt?: string | null;
}

export interface JarvisBackupStats {
  totalRecords: number;
  openTasks: number;
  completedTasks: number;
  babyStepsCount: number;
  scadenzeCount: number;
  surveyAnsweredQuestions: number;
  memoriesCount?: number;
  dossiersCount?: number;
}

export interface JarvisBackupEnvelopeV1 {
  schemaVersion: 1;
  appVersion: string;
  exportedAt: string; // ISO 8601
  deviceId: string;
  stats: JarvisBackupStats;
  sha256Checksum: string;
  payload: {
    history: AnalysisRecord[];
    settings: JarvisSettings;
    survey?: BetaSurveyData;
    memories?: JarvisMemoryItem[];
    dossiers?: JarvisDossier[];
  };
}

export interface DryRunValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedPerimetroViolations?: string[];
  stats?: JarvisBackupStats;
  envelope?: JarvisBackupEnvelopeV1;
  sourceDevice?: string;
  exportedAt?: string;
  schemaVersion?: number;
}

export interface SafetySnapshot {
  snapshotTimestamp: string;
  reason: string;
  history: AnalysisRecord[];
  settings: JarvisSettings;
  survey: BetaSurveyData;
  memories?: JarvisMemoryItem[];
  dossiers?: JarvisDossier[];
}

// =============================================================================
// FASE 6: VOCE FLUIDA & BRIEFING SU RICHIESTA (PULL)
// =============================================================================

export interface JarvisDailyBriefing {
  id: string;
  generatoIl: string; // ISO 8601
  prioritaReale: {
    id: string;
    titolo: string;
    origine: "Organizzazione" | "Decisione" | "Consiglio" | "Memoria";
    recordId?: string;
  } | null;
  babyStep: {
    id: string;
    azione: string;
    durataStimata?: string;
    motivo?: string;
    recordId?: string;
    subId?: string;
    completato?: boolean;
  } | null;
  vincoliOggettivi: {
    id: string;
    termine: string;
    oggetto: string;
    vincolante: boolean;
    recordId?: string;
  }[];
  messaggioPragmatico: string; // Tono René Ferretti ("Portiamo a casa la giornata, poi si vedrà")
  testoParlatoCompleto: string; // Testo per sintesi vocale fluido, sobrio (~20-30s di ascolto)
  durataStimataSecondi: number;
  contestoMemoria?: string[];
}
