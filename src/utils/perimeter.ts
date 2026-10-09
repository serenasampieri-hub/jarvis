/**
 * Modulo di classificazione e blindatura perimetrale a 4 stati per Jarvis.
 * Utilizzabile sia client-side (pre-flight check) sia server-side.
 */

export type PerimetroClassification =
  | "PERSONALE_AMMESSO"
  | "MUM_ESCLUSO"
  | "ASL_ESCLUSO"
  | "DUBBIO_DA_NON_SALVARE";

export interface PerimeterCheckResult {
  classification: PerimetroClassification;
  isAllowed: boolean;
  motivo: string;
  matchedTerms: string[];
}

export interface PerimeterViolationDetail {
  path: string;
  classification: PerimetroClassification;
  motivo: string;
  matchedTerms: string[];
  valueSnippet: string;
}

// 1. Pattern strettamente legati alla sanità istituzionale / d'ufficio ASL Roma 1
const ASL_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /\basl\b/i, label: "ASL" },
  { regex: /asl\s*roma/i, label: "ASL Roma" },
  { regex: /\bazienda\s+sanitaria\b/i, label: "Azienda Sanitaria" },
  { regex: /\bdistretto\s+sanitario\b/i, label: "Distretto Sanitario" },
  { regex: /presidio\s+ospedaliero/i, label: "Presidio Ospedaliero" },
  { regex: /\bcartella\s+clinica\b/i, label: "Cartella Clinica" },
  { regex: /\bdetermina\s+(?:asl|dirigenziale|aziendale|n\.)\b|\bdetermina\s+asl\b|\bdelibera\s+(?:asl|aziendale|regionale|n\.|dg|direttore|commissar)|\bdelibere\s+asl\b|\batto\s+deliberativo\b/i, label: "Delibera/Determina Istituzionale" },
  { regex: /\bprotocollo\s+asl\b/i, label: "Protocollo ASL" },
  { regex: /\bcolleghi\s+asl\b/i, label: "Colleghi ASL" },
  { regex: /\bdirezione\s+asl\b/i, label: "Direzione ASL" },
  { regex: /\bgara\s+protesica\b/i, label: "Gara Protesica" },
  { regex: /\bassistenza\s+protesica\b/i, label: "Assistenza Protesica Istituzionale" },
  { regex: /\b(?:gara|appalto|fornitura)\s+ventiloterapia\b|\bventiloterapia\s+(?:asl|aziendale|ospedaliera|distretto)\b/i, label: "Gara/Fornitura Ventiloterapia Istituzionale" },
  { regex: /\bstock\s+di\s+debito\b/i, label: "Stock di debito" },
  { regex: /\briformulazione\s+budget\b/i, label: "Budget ASL" },
  { regex: /\bcommissione\s+extra\s+tariffario\b/i, label: "Commissione Extra Tariffario" },
  { regex: /\bverbale\s+di\s+riunione\s+distretto\b/i, label: "Verbale Distretto" },
  { regex: /\bverbale\s+(?:di\s+)?gara\b/i, label: "Verbale Gara" },
];

// 2. Pattern legati al Progetto editoriale/podcast MUM
const MUM_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /\bprogetto\s+mum\b/i, label: "Progetto MUM" },
  { regex: /podcast\s+mum/i, label: "Podcast MUM" },
  { regex: /blog\s+mum/i, label: "Blog MUM" },
  { regex: /canale\s+mum/i, label: "Canale MUM" },
  { regex: /redazione\s+mum/i, label: "Redazione MUM" },
  { regex: /episodio\s+mum/i, label: "Episodio MUM" },
  { regex: /\bmum\b(?!\s+(?:and|or|said|says)\b)/i, label: "MUM" },
];

// 3. Pattern che indicano virtù morale/pazienza o metafora personale (es. "essere paziente", "deliberare tra me e me")
const PAZIENZA_VIRTU_REGEX = /(?:essere|stato|stata|stare|molto|più|poco|tanto|abbastanza|troppo|sii|abbi|abbiate|portare|avere|con|devo\s+essere|dovrei\s+essere)\s+pazien(?:za|te)\b|\bpaziente\s+con\b|\bdeliberare\s+(?:se|tra|come|cosa|sul|sulla)\b/i;

// 4. Pattern che indicano sanità strettamente personale o familiare
const SANITARIO_PERSONALE_REGEX = /\b(?:mia\s+madre|mio\s+padre|mamma|papà|mio\s+figlio|mia\s+figlia|mio\s+fratello|mia\s+sorella|mio\s+marito|mia\s+moglie|mio\s+nonno|mia\s+nonna|per\s+me|personale|privat[oa]|dentista|oculista|visita\s+specialistica)\b/i;

// 5. Pattern per contesti clinico-amministrativi non personali
const DUBBIO_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /\b(?:il|un|dei|ai|al)\s+paziente\b|\bpazienti\b|\bpaziente\s+ricoverat[oa]\b/i, label: "Paziente Clinico" },
  { regex: /\bricover(?:o|ato|ata|ati|ate)\b|\bdimissione\s+protetta\b/i, label: "Ricovero / Dimissione Ospedaliera" },
  { regex: /\bventiloterapia\b/i, label: "Ventiloterapia Clinica" },
  { regex: /\bdirigente\s+medico\b/i, label: "Dirigente Medico" },
  { regex: /\bdirettore\s+sanitario\b/i, label: "Direttore Sanitario" },
];

/**
 * Classifica il testo in ingresso secondo i 4 stati formali:
 * - PERSONALE_AMMESSO: Contenuti personali, inclusa la salute privata e la virtù della pazienza.
 * - ASL_ESCLUSO: Sanità pubblica istituzionale o ufficio ASL Roma 1.
 * - MUM_ESCLUSO: Canali editoriali, podcast o blog MUM.
 * - DUBBIO_DA_NON_SALVARE: Casi clinici o amministrativi privi di contesto familiare/personale chiaro.
 */
export function classifyPerimeter(text: string): PerimeterCheckResult {
  if (!text || !text.trim()) {
    return {
      classification: "PERSONALE_AMMESSO",
      isAllowed: true,
      motivo: "Testo vuoto",
      matchedTerms: [],
    };
  }

  const normalized = text.toLowerCase();
  const matchedTerms: string[] = [];

  // 1. Verifica ASL
  for (const { regex, label } of ASL_PATTERNS) {
    if (regex.test(normalized)) {
      matchedTerms.push(label);
    }
  }
  if (matchedTerms.length > 0) {
    return {
      classification: "ASL_ESCLUSO",
      isAllowed: false,
      motivo: "Rilevati riferimenti all'ambito ASL Roma 1 o sanità istituzionale d'ufficio.",
      matchedTerms,
    };
  }

  // 2. Verifica MUM
  for (const { regex, label } of MUM_PATTERNS) {
    if (regex.test(normalized)) {
      matchedTerms.push(label);
    }
  }
  if (matchedTerms.length > 0) {
    return {
      classification: "MUM_ESCLUSO",
      isAllowed: false,
      motivo: "Rilevati riferimenti al Progetto MUM o canali editoriali correlati.",
      matchedTerms,
    };
  }

  // 3. Verifica virtù morale (es. "devo essere paziente con questa situazione", "deliberare se cambiare casa")
  if (PAZIENZA_VIRTU_REGEX.test(normalized)) {
    return {
      classification: "PERSONALE_AMMESSO",
      isAllowed: true,
      motivo: "Uso personale/metaforico ammesso.",
      matchedTerms: [],
    };
  }

  // 4. Verifica Dubbio con esenzione per salute personale/familiare
  for (const { regex, label } of DUBBIO_PATTERNS) {
    if (regex.test(normalized)) {
      // Se il termine è associato a contesto strettamente familiare/personale, è ammesso
      if (SANITARIO_PERSONALE_REGEX.test(normalized)) {
        return {
          classification: "PERSONALE_AMMESSO",
          isAllowed: true,
          motivo: "Salute strettamente personale o familiare ammessa.",
          matchedTerms: [],
        };
      }
      matchedTerms.push(label);
    }
  }
  if (matchedTerms.length > 0) {
    return {
      classification: "DUBBIO_DA_NON_SALVARE",
      isAllowed: false,
      motivo:
        "Rilevati termini clinici o amministrativi ambigui privi di chiaro contesto familiare. Per precauzione il testo non viene inviato né salvato: ti invito a riformulare separando la sfera personale da quella d'ufficio.",
      matchedTerms,
    };
  }

  return {
    classification: "PERSONALE_AMMESSO",
    isAllowed: true,
    motivo: "Contenuto conforme al perimetro personale di Jarvis.",
    matchedTerms: [],
  };
}

const METADATA_FIELDS_TO_SKIP = new Set([
  "id",
  "deviceId",
  "schemaVersion",
  "sha256Checksum",
  "revision",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "appVersion",
  "timestamp",
]);

/**
 * Scansione ricorsiva profonda su qualsiasi oggetto o albero JSON.
 * Esamina ogni proprietà testuale (titolo, sintesi, note, decisioni, baby step, consigli, impostazioni, ecc.)
 * per individuare qualsiasi residuo o violazione di perimetro ASL/MUM/DUBBIO.
 */
export function scanObjectForPerimeterViolations(
  obj: any,
  currentPath = ""
): PerimeterViolationDetail[] {
  const violations: PerimeterViolationDetail[] = [];

  if (obj === null || obj === undefined) return violations;

  if (typeof obj === "string") {
    const check = classifyPerimeter(obj);
    if (!check.isAllowed) {
      violations.push({
        path: currentPath || "(root)",
        classification: check.classification,
        motivo: check.motivo,
        matchedTerms: check.matchedTerms,
        valueSnippet: obj.length > 80 ? obj.substring(0, 80) + "..." : obj,
      });
    }
    return violations;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const childPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
      violations.push(...scanObjectForPerimeterViolations(item, childPath));
    });
    return violations;
  }

  if (typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      if (METADATA_FIELDS_TO_SKIP.has(key)) {
        continue;
      }
      const childPath = currentPath ? `${currentPath}.${key}` : key;
      violations.push(...scanObjectForPerimeterViolations(obj[key], childPath));
    }
  }

  return violations;
}
