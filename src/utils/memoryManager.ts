/**
 * Modulo di Gestione della Memoria Storica Trasparente e Dossier Evolutivi (Fase 5).
 * Destinataria esclusiva: Serena Sampieri
 * 
 * Principi di Governance:
 * 1. Fatti vs Ipotesi: Chiara distinzione tra fatti certi confermati e ipotesi da validare.
 * 2. Divieto Assoluto di Inferenze Arbitrarie: Nessuna etichetta d'identità o diagnosi psicologica.
 * 3. Sovranità di Modifica ed Oblio: Ogni memoria è visibile, modificabile e cancellabile da Serena.
 * 4. Blindatura Perimetrale: Zero riferimenti ad ASL Roma 1 o Progetto MUM.
 */

import { JarvisMemoryItem, JarvisDossier, MemoryType, MemoryStatus, MemoryCategory } from "../types";
import { getOrCreateDeviceId } from "./crypto";
import { classifyPerimeter } from "./perimeter";

export const STORAGE_KEY_MEMORIES = "jarvis_memorie_progetti_v1";
export const STORAGE_KEY_DOSSIERS = "jarvis_dossier_tematici_v1";

export const DEFAULT_DOSSIERS: Omit<JarvisDossier, "createdAt" | "updatedAt" | "revision" | "deviceId">[] = [
  {
    id: "benessere",
    titolo: "Salute, Energia & Ritmi Personali",
    descrizione: "Registro oggettivo di abitudini di riposo, alimentazione ed energie (Sfera personale)",
    stato: "attivo",
    ultimoAggiornamento: new Date().toISOString(),
  },
  {
    id: "casa",
    titolo: "Casa, Spazi & Logistica Quotidiana",
    descrizione: "Manutenzioni, organizzazione spazi domestici, commissioni e logistica",
    stato: "attivo",
    ultimoAggiornamento: new Date().toISOString(),
  },
  {
    id: "finanze",
    titolo: "Finanze, Risorse & Budget Personale",
    descrizione: "Scadenze fiscali personali, decisioni d'acquisto e salvaguardia economica",
    stato: "attivo",
    ultimoAggiornamento: new Date().toISOString(),
  },
  {
    id: "scrittura",
    titolo: "Studio, Scrittura & Idee Creative",
    descrizione: "Appunti personali di pensiero, letture, progetti creativi e riflessioni",
    stato: "attivo",
    ultimoAggiornamento: new Date().toISOString(),
  },
];

/**
 * Parole e pattern di divieto etico assoluto:
 * Jarvis non può mai etichettare l'identità o diagnosticare tratti psicologici negativi.
 */
const FORBIDDEN_IDENTITY_PATTERNS = [
  /procrastina(?:trice|tore| sempre)/i,
  /(?:persona\s+pigra|sei\s+pigra|[èe]\s+pigra|\bpigr[ao]\b)/i,
  /(?:cronica\s+incapacit[àa]|incapace\s+di\s+(?:decidere|gestire)|\bincapace\b)/i,
  /(?:disorganizzat[ao]\s+per\s+natura|disordinat[ao]\s+cronic[ao])/i,
  /(?:disturbo\s+della\s+personalit[àa]|patologia\s+psichica|ansios[ao]\s+per\s+natura)/i,
  /(?:fallimento\s+personale|destinat[ao]\s+a\s+fallire)/i,
];

/**
 * Valida il testo di una memoria per conformità etica e perimetrale.
 */
export function validateAndSanitizeMemory(text: string): {
  isValid: boolean;
  sanitizedText: string;
  error?: string;
} {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { isValid: false, sanitizedText: "", error: "Il testo della memoria non può essere vuoto." };
  }

  // 1. Controllo Perimetro ASL / MUM
  const perimeter = classifyPerimeter(trimmed);
  if (!perimeter.isAllowed) {
    return {
      isValid: false,
      sanitizedText: trimmed,
      error: `Violazione perimetro di riservatezza (${perimeter.classification}): ${perimeter.motivo}`,
    };
  }

  // 2. Controllo Divieto Etico di Inferenze Psicologiche Arbitrarie
  for (const pattern of FORBIDDEN_IDENTITY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        sanitizedText: trimmed,
        error: "Violazione di governance etica: Jarvis ha il divieto tassativo di formulare etichette psicologiche o giudizi sull'identità di Serena.",
      };
    }
  }

  return { isValid: true, sanitizedText: trimmed };
}

function generateMemoryId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return "mem_" + crypto.randomUUID();
    }
  } catch {
    // fallback
  }
  return "mem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
}

function generateDossierId(titolo: string): string {
  const base = titolo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || ("dossier_" + Date.now());
}

// =============================================================================
// GESTIONE MEMORIE
// =============================================================================

/**
 * Carica tutte le memorie persistite nel LocalStorage.
 * Per default esclude i record eliminati con tombstone (soft-delete).
 */
export function loadMemories(includeDeleted = false): JarvisMemoryItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMORIES);
    if (!raw) return [];
    const parsed: JarvisMemoryItem[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (includeDeleted) return parsed;
    return parsed.filter((m) => !m.deletedAt);
  } catch (err) {
    console.error("Errore nel caricamento delle memorie:", err);
    return [];
  }
}

/**
 * Salva l'intero elenco delle memorie in memoria locale (usata da restore e sync).
 */
export function saveAllMemories(memories: JarvisMemoryItem[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_MEMORIES, JSON.stringify(memories));
  } catch (err) {
    console.error("Errore nel salvataggio globale delle memorie:", err);
  }
}

/**
 * Inserisce o aggiorna una singola memoria applicando le regole di sovranità e perimetro.
 */
export function saveMemory(
  item: Omit<JarvisMemoryItem, "id" | "createdAt" | "updatedAt" | "revision" | "deviceId" | "status"> &
    Partial<Pick<JarvisMemoryItem, "id" | "createdAt" | "updatedAt" | "revision" | "deviceId" | "status">>
): { success: boolean; memory?: JarvisMemoryItem; error?: string } {
  const validation = validateAndSanitizeMemory(item.testo);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const all = loadMemories(true);
    const nowIso = new Date().toISOString();
    const existingIdx = all.findIndex((m) => m.id === item.id);

    let memoryRecord: JarvisMemoryItem;

    if (existingIdx >= 0) {
      const existing = all[existingIdx];
      memoryRecord = {
        ...existing,
        ...item,
        testo: validation.sanitizedText,
        updatedAt: nowIso,
        revision: (existing.revision || 1) + 1,
        deviceId: getOrCreateDeviceId(),
      };
      all[existingIdx] = memoryRecord;
    } else {
      memoryRecord = {
        id: item.id || generateMemoryId(),
        tipo: item.tipo,
        categoria: item.categoria || "personale",
        progettoId: item.progettoId,
        progettoNome: item.progettoNome,
        testo: validation.sanitizedText,
        fonteRecordId: item.fonteRecordId,
        status: item.status || (item.tipo === "ipotesi" ? "da_validare" : "confermato"),
        createdAt: item.createdAt || nowIso,
        updatedAt: nowIso,
        revision: item.revision || 1,
        deviceId: item.deviceId || getOrCreateDeviceId(),
        deletedAt: null,
      };
      all.unshift(memoryRecord);
    }

    saveAllMemories(all);
    return { success: true, memory: memoryRecord };
  } catch (err: any) {
    return { success: false, error: `Errore durante il salvataggio: ${err?.message || err}` };
  }
}

/**
 * Modifica parziale di una memoria esistente (testo, categoria, stato).
 */
export function updateMemory(
  id: string,
  updates: Partial<Pick<JarvisMemoryItem, "testo" | "categoria" | "progettoId" | "progettoNome" | "status" | "tipo">>
): { success: boolean; memory?: JarvisMemoryItem; error?: string } {
  if (updates.testo !== undefined) {
    const validation = validateAndSanitizeMemory(updates.testo);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }
    updates.testo = validation.sanitizedText;
  }

  try {
    const all = loadMemories(true);
    const idx = all.findIndex((m) => m.id === id);
    if (idx < 0) {
      return { success: false, error: "Memoria non trovata." };
    }

    const existing = all[idx];
    const nowIso = new Date().toISOString();
    const updated: JarvisMemoryItem = {
      ...existing,
      ...updates,
      updatedAt: nowIso,
      revision: (existing.revision || 1) + 1,
      deviceId: getOrCreateDeviceId(),
    };

    all[idx] = updated;
    saveAllMemories(all);
    return { success: true, memory: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || "Errore sconosciuto." };
  }
}

/**
 * Converte un'ipotesi formulata da Jarvis in un fatto oggettivo confermato da Serena.
 */
export function confirmHypothesis(id: string): { success: boolean; memory?: JarvisMemoryItem; error?: string } {
  return updateMemory(id, {
    tipo: "fatto",
    status: "confermato",
  });
}

/**
 * Rifiuta un'ipotesi formulata (la elimina con tombstone o la archivia).
 */
export function rejectHypothesis(id: string): boolean {
  return deleteMemory(id, true);
}

/**
 * Elimina una memoria. Con soft=true appone il marcatore deletedAt per sync deterministico.
 */
export function deleteMemory(id: string, soft = true): boolean {
  try {
    const all = loadMemories(true);
    const idx = all.findIndex((m) => m.id === id);
    if (idx < 0) return false;

    if (soft) {
      all[idx] = {
        ...all[idx],
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revision: (all[idx].revision || 1) + 1,
        deviceId: getOrCreateDeviceId(),
      };
    } else {
      all.splice(idx, 1);
    }

    saveAllMemories(all);
    return true;
  } catch (err) {
    console.error("Errore eliminazione memoria:", err);
    return false;
  }
}

// =============================================================================
// GESTIONE DOSSIER EVOLUTIVI
// =============================================================================

/**
 * Inizializza i dossier di default se lo storage locale è vuoto.
 */
function initDefaultDossiersIfEmpty(): JarvisDossier[] {
  const nowIso = new Date().toISOString();
  const devId = getOrCreateDeviceId();
  const initialList: JarvisDossier[] = DEFAULT_DOSSIERS.map((d, idx) => ({
    ...d,
    createdAt: nowIso,
    updatedAt: nowIso,
    revision: 1,
    deviceId: devId,
    deletedAt: null,
  }));
  try {
    localStorage.setItem(STORAGE_KEY_DOSSIERS, JSON.stringify(initialList));
  } catch (e) {
    console.warn("Impossibile salvare i dossier iniziali:", e);
  }
  return initialList;
}

/**
 * Carica tutti i dossier tematici personali.
 */
export function loadDossiers(includeDeleted = false): JarvisDossier[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOSSIERS);
    if (!raw) {
      return initDefaultDossiersIfEmpty().filter((d) => includeDeleted || !d.deletedAt);
    }
    const parsed: JarvisDossier[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return initDefaultDossiersIfEmpty().filter((d) => includeDeleted || !d.deletedAt);
    }
    if (includeDeleted) return parsed;
    return parsed.filter((d) => !d.deletedAt);
  } catch (err) {
    console.error("Errore caricamento dossier:", err);
    return [];
  }
}

/**
 * Salva l'elenco completo dei dossier tematici.
 */
export function saveAllDossiers(dossiers: JarvisDossier[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_DOSSIERS, JSON.stringify(dossiers));
  } catch (err) {
    console.error("Errore nel salvataggio dei dossier:", err);
  }
}

/**
 * Crea o aggiorna un dossier personale.
 */
export function saveDossier(
  dossier: Omit<JarvisDossier, "id" | "ultimoAggiornamento" | "createdAt" | "updatedAt" | "revision" | "deviceId" | "stato"> &
    Partial<Pick<JarvisDossier, "id" | "ultimoAggiornamento" | "createdAt" | "updatedAt" | "revision" | "deviceId" | "stato">>
): { success: boolean; dossier?: JarvisDossier; error?: string } {
  // Controllo perimetro sul titolo e descrizione
  const checkTitolo = classifyPerimeter(dossier.titolo || "");
  const checkDesc = classifyPerimeter(dossier.descrizione || "");
  if (!checkTitolo.isAllowed || !checkDesc.isAllowed) {
    return {
      success: false,
      error: `Violazione perimetro nel dossier: ${checkTitolo.motivo || checkDesc.motivo}`,
    };
  }

  try {
    const all = loadDossiers(true);
    const nowIso = new Date().toISOString();
    const existingIdx = all.findIndex((d) => d.id === dossier.id);

    let resultDossier: JarvisDossier;
    if (existingIdx >= 0) {
      const existing = all[existingIdx];
      resultDossier = {
        ...existing,
        ...dossier,
        updatedAt: nowIso,
        revision: (existing.revision || 1) + 1,
        deviceId: getOrCreateDeviceId(),
      };
      all[existingIdx] = resultDossier;
    } else {
      resultDossier = {
        id: dossier.id || generateDossierId(dossier.titolo),
        titolo: dossier.titolo.trim(),
        descrizione: dossier.descrizione?.trim(),
        stato: dossier.stato || "attivo",
        ultimoAggiornamento: nowIso,
        createdAt: dossier.createdAt || nowIso,
        updatedAt: nowIso,
        revision: dossier.revision || 1,
        deviceId: dossier.deviceId || getOrCreateDeviceId(),
        deletedAt: null,
      };
      all.push(resultDossier);
    }

    saveAllDossiers(all);
    return { success: true, dossier: resultDossier };
  } catch (err: any) {
    return { success: false, error: err?.message || "Errore durante il salvataggio del dossier." };
  }
}

/**
 * Elimina un dossier tematico.
 */
export function deleteDossier(id: string, soft = true): boolean {
  try {
    const all = loadDossiers(true);
    const idx = all.findIndex((d) => d.id === id);
    if (idx < 0) return false;

    if (soft) {
      all[idx] = {
        ...all[idx],
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revision: (all[idx].revision || 1) + 1,
        deviceId: getOrCreateDeviceId(),
      };
    } else {
      all.splice(idx, 1);
    }

    saveAllDossiers(all);
    return true;
  } catch (err) {
    console.error("Errore cancellazione dossier:", err);
    return false;
  }
}

/**
 * Restituisce le memorie attive collegate a uno specifico dossier.
 */
export function getMemoriesForDossier(dossierId: string): JarvisMemoryItem[] {
  const allMemories = loadMemories(false);
  return allMemories.filter((m) => m.progettoId === dossierId);
}

// =============================================================================
// COSTRUTTORE DI CONTESTO TRASPARENTE PER INTEGRAZIONE AI
// =============================================================================

/**
 * Costruisce il blocco di memoria trasparente da passare nel contesto della chiamata AI.
 * 
 * Regole ferree di governance:
 * - Vengono iniettati ESCLUSIVAMENTE i fatti e le preferenze con status="confermato".
 * - Le ipotesi formulate ma non ancora convalidate da Serena vengono RIGOROSAMENTE ESCLUSE,
 *   per scongiurare allucinazioni o sedimentazione di deduzioni arbitrarie.
 * - Massimo 10 elementi più recenti/rilevanti per preservare concisione e token.
 */
export function buildMemoryContextForAI(progettoId?: string): {
  promptSnippet: string;
  factsCount: number;
  activeProjects: string[];
} {
  const allMemories = loadMemories(false);
  const confirmedFacts = allMemories.filter(
    (m) => (m.tipo === "fatto" || m.tipo === "preferenza") && m.status === "confermato"
  );

  const dossiers = loadDossiers(false).filter((d) => d.stato === "attivo");
  const activeProjects = dossiers.map((d) => d.titolo);

  // Filtra se specificato un progetto/dossier, altrimenti prendi i più rilevanti
  const relevantFacts = progettoId
    ? confirmedFacts.filter((m) => m.progettoId === progettoId)
    : confirmedFacts;

  // Massimo 10 fatti
  const selectedFacts = relevantFacts.slice(0, 10);

  if (selectedFacts.length === 0 && dossiers.length === 0) {
    return {
      promptSnippet: "",
      factsCount: 0,
      activeProjects,
    };
  }

  const lines: string[] = [];
  lines.push("--- CONTESTO DI MEMORIA STORICA ACCERTATA (SECONDO CERVELLO) ---");
  lines.push("REGOLE ETICHE ASSOLUTE PER JARVIS:");
  lines.push("1. I seguenti elementi sono FATTI CONFERMATI comunicati direttamente da Serena. Trattali come contesto oggettivo.");
  lines.push("2. DIVIETO CATEGORICO di formulare giudizi morali o etichette psicologiche sull'identità di Serena.");
  lines.push("3. Se formuli una correlazione o un'idea nuova non presente nei fatti noti, presentala ESPLICITAMENTE come 'Ipotesi da convalidare' e non come dato certo.");
  lines.push("");

  if (dossiers.length > 0) {
    lines.push("DOSSIER PROGETTUALI APERTI:");
    dossiers.forEach((d) => {
      lines.push(`• [${d.titolo}]${d.descrizione ? `: ${d.descrizione}` : ""}`);
    });
    lines.push("");
  }

  if (selectedFacts.length > 0) {
    lines.push("FATTI & PREFERENZE ACCERTATE:");
    selectedFacts.forEach((f) => {
      const tag = f.progettoNome ? `[${f.progettoNome}] ` : "";
      lines.push(`• ${tag}${f.testo}`);
    });
    lines.push("");
  }

  lines.push("----------------------------------------------------------------");

  return {
    promptSnippet: lines.join("\n"),
    factsCount: selectedFacts.length,
    activeProjects,
  };
}
