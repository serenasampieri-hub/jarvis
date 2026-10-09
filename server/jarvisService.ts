import { GoogleGenAI, Type } from "@google/genai";
import { classifyPerimeter, PerimeterCheckResult } from "../src/utils/perimeter";

export interface JarvisRispostaVocale {
  situazione: string;
  puntiSalienti: string[]; // massimo tre punti rilevanti
  prossimoPasso: string;
  testoParlatoCompleto: string; // testo fluido per sintesi vocale di ~30s
  durataStimataSecondi: number;
}

export interface JarvisOrganizationResult {
  fuoriPerimetro: boolean;
  messaggioPerimetro?: string;
  trascrizionePulita?: string;
  modalitaRilevata?: "organizzazione" | "decisione" | "consiglio";
  domandaDisambiguazioneModalita?: string;
  rispostaVocale?: JarvisRispostaVocale;
  sintesi: string;
  babyStep: {
    azione: string;
    durataStimata: string;
    motivo: string;
    tempistica: "Da fare ora" | "Da fare prima della scadenza";
  };
  azioni: Array<{
    testo: string;
    energiaRichiesta: "bassa" | "media" | "alta";
    tipo: "fatto" | "deduzione" | "suggerimento";
  }>;
  scadenze: Array<{
    termine: string;
    oggetto: string;
    vincolante: boolean;
  }>;
  scadenzaNote?: string;
  criticita: Array<{
    ostacolo: string;
    soluzionePragmatica: string;
  }>;
  domandaIndispensabile?: string;
  fontiWeb?: Array<{
    fonte: string;
    dettaglio: string;
    tipo: "fatto_verificato" | "opinione";
    ufficiale?: boolean;
  }>;
}

export interface JarvisDecisionResult {
  fuoriPerimetro: boolean;
  messaggioPerimetro?: string;
  trascrizionePulita?: string;
  modalitaRilevata?: "organizzazione" | "decisione" | "consiglio";
  domandaDisambiguazioneModalita?: string;
  rispostaVocale?: JarvisRispostaVocale;
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
  };
  datiMancanti?: string;
  fontiWeb?: Array<{
    fonte: string;
    dettaglio: string;
    tipo: "fatto_verificato" | "opinione";
    ufficiale?: boolean;
  }>;
}

export interface JarvisConsiglioResult {
  fuoriPerimetro: boolean;
  messaggioPerimetro?: string;
  trascrizionePulita?: string;
  modalitaRilevata?: "organizzazione" | "decisione" | "consiglio";
  domandaDisambiguazioneModalita?: string;
  rispostaVocale?: JarvisRispostaVocale;
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
  };
  fontiWeb?: Array<{
    fonte: string;
    dettaglio: string;
    tipo: "fatto_verificato" | "opinione";
    ufficiale?: boolean;
  }>;
}

export interface JarvisAutoResult {
  fuoriPerimetro: boolean;
  messaggioPerimetro?: string;
  trascrizionePulita: string;
  modalitaRilevata: "organizzazione" | "decisione" | "consiglio";
  domandaDisambiguazioneModalita?: string;
  rispostaVocale: JarvisRispostaVocale;
  sintesi?: string;
  babyStep?: {
    azione: string;
    durataStimata: string;
    motivo: string;
    tempistica: "Da fare ora" | "Da fare prima della scadenza";
  };
  azioni?: Array<{
    testo: string;
    energiaRichiesta: "bassa" | "media" | "alta";
    tipo: "fatto" | "deduzione" | "suggerimento";
  }>;
  scadenze?: Array<{
    termine: string;
    oggetto: string;
    vincolante: boolean;
  }>;
  scadenzaNote?: string;
  criticita?: Array<{
    ostacolo: string;
    soluzionePragmatica: string;
  }>;
  domandaIndispensabile?: string;
  decisione?: {
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
    };
    datiMancanti?: string;
  };
  consiglio?: {
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
    };
  };
  fontiWeb?: Array<{
    fonte: string;
    dettaglio: string;
    tipo: "fatto_verificato" | "opinione";
    ufficiale?: boolean;
  }>;
}

export interface JarvisDepositoResult {
  fuoriPerimetro: boolean;
  messaggioPerimetro?: string;
  trascrizionePulita?: string;
  modalitaRilevata: "deposito";
  domandaDisambiguazioneModalita?: string;
  sintesi: string;
  chiaviDiPensiero: string[];
  annotazioneSilenziosa?: string;
  rispostaVocale?: JarvisRispostaVocale;
}

export type JarvisAnalysisResult =
  | JarvisOrganizationResult
  | JarvisDecisionResult
  | JarvisConsiglioResult
  | JarvisAutoResult
  | JarvisDepositoResult;

export interface ContestoPrecedente {
  inputIniziale?: string;
  sintesiPrecedente?: string;
  babyStepPrecedente?: string;
  azioniPrecedenti?: string[];
  decisionePrecedente?: string;
  consiglioPrecedente?: string;
  memorieStoricheSnippet?: string;
}

/**
 * Controllo stringente perimetrale:
 * Delega alla funzione unificata a 4 stati (ASL, MUM, Dubbio, Personale).
 */
export function isOutsideScope(text: string): boolean {
  return !classifyPerimeter(text).isAllowed;
}

const RISPOSTA_VOCALE_SCHEMA = {
  type: Type.OBJECT,
  description: "Sintesi parlata breve per ascolto ad alta voce (circa 25-35 secondi).",
  properties: {
    situazione: {
      type: Type.STRING,
      description: "Inquadramento immediato in 1 frase chiara e diretta.",
    },
    puntiSalienti: {
      type: Type.ARRAY,
      description: "Massimo tre punti rilevanti, con frasi brevi.",
      items: { type: Type.STRING },
    },
    prossimoPasso: {
      type: Type.STRING,
      description: "Una sola azione concreta ed eseguibile subito.",
    },
    testoParlatoCompleto: {
      type: Type.STRING,
      description: "Testo fluido e naturale per la lettura vocale in circa 30 secondi.",
    },
    durataStimataSecondi: {
      type: Type.INTEGER,
      description: "Stima in secondi della durata di lettura parlata (circa 25-35s).",
    },
  },
  required: [
    "situazione",
    "puntiSalienti",
    "prossimoPasso",
    "testoParlatoCompleto",
    "durataStimataSecondi",
  ],
};

export async function handleJarvisAnalysis(
  text: string,
  modalita: "auto" | "deposito" | "organizzazione" | "decisione" | "consiglio" = "auto",
  contestoPrecedente?: ContestoPrecedente
): Promise<JarvisAnalysisResult> {
  const cleanInput = (text || "").trim();
  if (!cleanInput) {
    throw new Error("Testo di input vuoto.");
  }

  // Costruisci il prompt effettivo includendo il contesto del progetto precedente se si tratta di una replica
  // o iniettando la memoria storica dei fatti confermati
  let effectiveInput = cleanInput;
  if (contestoPrecedente) {
    const contextParts: string[] = [];
    if (contestoPrecedente.memorieStoricheSnippet) {
      contextParts.push(contestoPrecedente.memorieStoricheSnippet);
    }
    if (contestoPrecedente.inputIniziale) {
      contextParts.push(`- Richiesta iniziale del progetto: "${contestoPrecedente.inputIniziale}"`);
    }
    if (contestoPrecedente.sintesiPrecedente) {
      contextParts.push(`- Sintesi precedente: "${contestoPrecedente.sintesiPrecedente}"`);
    }
    if (contestoPrecedente.babyStepPrecedente) {
      contextParts.push(`- Baby Step precedente: "${contestoPrecedente.babyStepPrecedente}"`);
    }
    if (contestoPrecedente.azioniPrecedenti && contestoPrecedente.azioniPrecedenti.length > 0) {
      contextParts.push(`- Azioni già individuate: ${contestoPrecedente.azioniPrecedenti.join("; ")}`);
    }
    if (contestoPrecedente.decisionePrecedente) {
      contextParts.push(`- Valutazione decisionale precedente: "${contestoPrecedente.decisionePrecedente}"`);
    }
    if (contestoPrecedente.consiglioPrecedente) {
      contextParts.push(`- Confronto dei consiglieri precedente: "${contestoPrecedente.consiglioPrecedente}"`);
    }

    if (contestoPrecedente.inputIniziale || contestoPrecedente.sintesiPrecedente) {
      effectiveInput = `[REPLICA SU PROGETTO AVVIATO - INTEGRAZIONE CONTINUA STEP BY STEP]
${contextParts.join("\n")}

[NUOVA REPLICA / AGGIORNAMENTO DI SERENA]:
"${cleanInput}"

[DIRETTIVA PER QUESTA REPLICA]:
Serena sta replicando per ampliare il progetto su cui state già lavorando e integrarlo step by step.
NON ripartire da zero:
1. Mantieni e sviluppa la coerenza del progetto.
2. Se il baby step precedente è stato completato o i nuovi dettagli ne richiedono un altro, fornisci il NUOVO baby step concreto.
3. Aggiorna la sintesi e le priorità incorporando i nuovi sviluppi senza eliminare le azioni precedenti ancora valide.
4. Fornisci la sintesi vocale di 30s orientata all'avanzamento pratico.`;
    } else if (contestoPrecedente.memorieStoricheSnippet) {
      effectiveInput = `${contestoPrecedente.memorieStoricheSnippet}

[RICHIESTA OPERATIVA DI SERENA]:
"${cleanInput}"`;
    }
  }

  // Verifica immediata del perimetro con classificazione a 4 stati
  const perimCheck = classifyPerimeter(cleanInput);
  if (!perimCheck.isAllowed) {
    const msg = perimCheck.motivo;
    const fallbackVocale: JarvisRispostaVocale = {
      situazione: "Richiesta esterna al perimetro personale.",
      puntiSalienti: [msg],
      prossimoPasso: "Nessuna azione consentita in Jarvis per questo ambito.",
      testoParlatoCompleto: msg,
      durataStimataSecondi: 6,
    };

    if (modalita === "deposito") {
      return {
        fuoriPerimetro: true,
        messaggioPerimetro: msg,
        trascrizionePulita: cleanInput,
        modalitaRilevata: "deposito",
        sintesi: msg,
        chiaviDiPensiero: [],
        annotazioneSilenziosa: "Rilevata violazione di perimetro.",
        rispostaVocale: fallbackVocale,
      };
    }

    if (modalita === "decisione") {
      return {
        fuoriPerimetro: true,
        messaggioPerimetro: msg,
        trascrizionePulita: cleanInput,
        rispostaVocale: fallbackVocale,
        situazione: "",
        vantaggi: [],
        svantaggi: [],
        costiReali: { denaro: "", tempo: "", energiaMentale: "", complessitaLogistica: "" },
        soluzioneAlternativaEconomica: "",
        rischioPentimento: { livello: "basso", motivazione: "" },
        verdettoProvvisorio: "",
        prossimoPasso: { azione: "" },
      };
    }

    if (modalita === "consiglio") {
      return {
        fuoriPerimetro: true,
        messaggioPerimetro: msg,
        trascrizionePulita: cleanInput,
        rispostaVocale: fallbackVocale,
        tema: "",
        consiglieri: {
          pragmatico: [],
          economo: [],
          scettico: [],
          serenaDelFuturo: [],
        },
        sintesiConsiglio: "",
        puntiAccordo: [],
        puntiDisaccordo: [],
        verdettoProvvisorio: "",
        prossimoPasso: { azione: "" },
      };
    }

    return {
      fuoriPerimetro: true,
      messaggioPerimetro: msg,
      trascrizionePulita: cleanInput,
      modalitaRilevata: "organizzazione",
      rispostaVocale: fallbackVocale,
      sintesi: "",
      babyStep: {
        azione: "",
        durataStimata: "",
        motivo: "",
        tempistica: "Da fare ora",
      },
      azioni: [],
      scadenze: [],
      scadenzaNote: "",
      criticita: [],
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chiave GEMINI_API_KEY non configurata sul server.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const modelsToTry = ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash"];

  // =========================================================================
  // 1. MODALITÀ AUTO (Riconoscimento vocale, pulizia input e auto-rilevamento)
  // =========================================================================
  if (modalita === "auto") {
    const systemInstructionAuto = `Sei Jarvis, cabina di regia personale e decisionale riservata esclusivamente a Serena Sampieri.
Non sei destinato a un pubblico generico.
Jarvis è un assistente progettato principalmente per l'uso vocale.
Anche quando l'input arriva per iscritto, devi comportarti come se Serena ti stesse parlando a voce.

DIRETTIVA FONDAMENTALE DI CARATTERE (ZERO COMPIACIMENTO & ONESTÀ LEALE):
- NON COMPIACERE MAI SERENA. Non validare le sue idee o scelte solo per cortesia, condiscendenza o empatia artificiale.
- Zero frasi accomodanti o rassicuranti (niente "È un'ottima idea", "Capisco perfettamente", "È comprensibile", "Hai ragione").
- Sii SEMPRE LUCIDO E LEALE nelle analisi e nei verdetti: niente aggressività o mortificazioni, ma zero sconti sulla realtà. Se una scelta è dispersiva, se un piano orario è irrealistico, se una spesa è superflua o se oggi la vera priorità è recuperare energia, dillo chiaramente.
- Distingui senza sconti tra fatti oggettivi, ipotesi non dimostrate e razionalizzazioni emotive.
- DISTINZIONE FONDAMENTALE DELLE TRE INTENZIONI (NON TUTTO È UN'AZIONE):
  1. DEPOSITO: Serena vuole togliersi un pensiero dalla testa senza ricevere automaticamente soluzioni o elenchi di compiti. Prendi atto con precisione, riordina il pensiero e confermane il deposito senza imporre compiti forzati.
  2. ELABORAZIONE: Serena vuole comprendere meglio un problema, riconoscere collegamenti o contraddizioni e ottenere una sintesi, senza essere ancora pronta a decidere. Offri lucidità e mappa logica senza forzare decisioni premature.
  3. AZIONE O DECISIONE: Serena chiede una direzione, una scelta, delle priorità o un baby step. Solo qui isola le priorità (da 1 a max 3 compatibili con l'energia reale) e un baby step concreto.
- NON FORZARE L'OBBLIGO DI TROVARE 3 PRIORITÀ PER FORZA: seleziona il numero reale di priorità sostenibili (1, 2 o massimo 3) per l'energia effettiva disponibile. Se una sola cosa conta davvero, indicala senza riempire per dovere.
- IL BABY STEP DEVE ESSERE SIA ESEGUIBILE SUBITO (5-10 min) SIA GIUSTO: deve produrre un avanzamento effettivo del problema anziché muovere solo polvere o dare un'illusione di movimento.
- Mantieni sempre una fermezza calma, analitica, autorevole e leale.

OBIETTIVO DELLA MODALITÀ AUTO (VOCE):

1. RICONOSCIMENTO E PULIZIA INPUT VOCALE:
- Trascrivi in 'trascrizionePulita' il testo inserito rimuovendo tutti gli intercalari, esitazioni e rumore verbale non utile (es. "allora", "ehm", "ascolta", "poi forse", "cioè", "tipo", "senti", false partenze).
- Mantieni tutte le informazioni rilevanti, orari, vincoli, compiti, persone citate e preserva fedelmente il significato originale.

2. RICONOSCIMENTO AUTOMATICO DELLA MODALITÀ:
Identifica la modalità più adatta e specificala in 'modalitaRilevata':
- 'organizzazione': se Serena porta attività pratiche, scadenze, commissioni, cose da sistemare, gestione del tempo o disordine da riordinare.
- 'decisione': se Serena sta valutando una scelta tra opzioni, un bivio o un acquisto/spesa.
- 'consiglio': se Serena desidera confrontare molteplici punti di vista e consultare i quattro consiglieri permanenti (Pragmatico, Economo, Scettico, Serena del Futuro).
Se la modalità non è chiaramente identificabile dall'input: formula in 'domandaDisambiguazioneModalita' una sola domanda secca e diretta per chiarire l'intento di Serena.

3. RISPOSTA VOCALE BREVE (CIRCA 30 SECONDI DI ASCOLTO):
Ogni risposta deve poter essere letta ad alta voce senza risultare pesante.
Costruisci in 'rispostaVocale':
- 'situazione': inquadramento conciso e disincantato in 1 frase diretta.
- 'puntiSalienti': massimo tre punti rilevanti (sintesi cruda di vincoli, priorità o frizioni reali).
- 'prossimoPasso': una sola azione concreta ed eseguibile subito.
- 'testoParlatoCompleto': testo fluido, asciutto, diretto e autorevole per la lettura vocale in circa 25-35 secondi.
- 'durataStimataSecondi': stima in secondi (circa 25-35).
STILE VOCALE:
- Frasi corte, asciutte, chirurgiche. Zero compiacimento, zero coaching, zero frasi da guru, zero toni cerimoniosi.

4. RISPOSTA SCRITTA COMPLETA (VERSIONE AUTOREVOLE):
In base alla modalità rilevata ('modalitaRilevata'):
- Se 'organizzazione': compila 'sintesi' (oggettiva e priva di fronzoli), 'babyStep', 'azioni' (max 3), 'scadenze', 'criticita', 'domandaIndispensabile'.
- Se 'decisione': compila l'oggetto 'decisione' con situazione, vantaggi (max 5), svantaggi (max 5 reali e non addolciti), costiReali (denaro, tempo, energia mentale, logistica senza sconti), soluzioneAlternativaEconomica, rischioPentimento (valutato con rigore), verdettoProvvisorio (netto, perentorio), prossimoPasso, datiMancanti.
- Se 'consiglio': compila l'oggetto 'consiglio' rispettando l'identità spietata dei 4 consiglieri permanenti (Pragmatico, Economo, Scettico, Serena del Futuro con max 5 punti ciascuno), sintesiConsiglio, puntiAccordo, puntiDisaccordo, verdettoProvvisorio (espresso con fermezza da Jarvis), prossimoPasso.

5. PRINCIPI FONDAMENTALI DI JARVIS:
- Non inventare mai orari. Se mancano punto di partenza o tragitto, specifica 'Orario di partenza da determinare in base al tragitto e al mezzo utilizzato.'
- Distinguere rigorosamente fatti da deduzioni e suggerimenti.
- Applicare sempre la minima spesa e la massima resa.
- Se utilizzi fonti web o esterne, inseriscile in 'fontiWeb' specificando fonte ufficiale e se si tratta di fatto verificato o opinione.

6. PERIMETRO RIGOROSO DI ESCLUSIONE:
Se il testo menziona ASL Roma 1 o Progetto MUM, imposta 'fuoriPerimetro' a true e 'messaggioPerimetro' a 'Contenuto esterno al perimetro personale di Jarvis.'`;

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await ai.models.generateContent({
            model: modelName,
            contents: `Elabora l'input vocale per Serena Sampieri identificando la modalità e producendo sia la risposta vocale breve che la versione completa:\n\n${effectiveInput}`,
            config: {
              systemInstruction: systemInstructionAuto,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  fuoriPerimetro: { type: Type.BOOLEAN },
                  messaggioPerimetro: { type: Type.STRING },
                  trascrizionePulita: { type: Type.STRING },
                  modalitaRilevata: { type: Type.STRING },
                  domandaDisambiguazioneModalita: { type: Type.STRING },
                  rispostaVocale: RISPOSTA_VOCALE_SCHEMA,
                  // Payload Organizzazione
                  sintesi: { type: Type.STRING },
                  babyStep: {
                    type: Type.OBJECT,
                    properties: {
                      azione: { type: Type.STRING },
                      durataStimata: { type: Type.STRING },
                      motivo: { type: Type.STRING },
                      tempistica: { type: Type.STRING },
                    },
                  },
                  azioni: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        testo: { type: Type.STRING },
                        energiaRichiesta: { type: Type.STRING },
                        tipo: { type: Type.STRING },
                      },
                    },
                  },
                  scadenze: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        termine: { type: Type.STRING },
                        oggetto: { type: Type.STRING },
                        vincolante: { type: Type.BOOLEAN },
                      },
                    },
                  },
                  scadenzaNote: { type: Type.STRING },
                  criticita: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        ostacolo: { type: Type.STRING },
                        soluzionePragmatica: { type: Type.STRING },
                      },
                    },
                  },
                  domandaIndispensabile: { type: Type.STRING },
                  // Payload Decisione
                  decisione: {
                    type: Type.OBJECT,
                    properties: {
                      situazione: { type: Type.STRING },
                      vantaggi: { type: Type.ARRAY, items: { type: Type.STRING } },
                      svantaggi: { type: Type.ARRAY, items: { type: Type.STRING } },
                      costiReali: {
                        type: Type.OBJECT,
                        properties: {
                          denaro: { type: Type.STRING },
                          tempo: { type: Type.STRING },
                          energiaMentale: { type: Type.STRING },
                          complessitaLogistica: { type: Type.STRING },
                        },
                      },
                      soluzioneAlternativaEconomica: { type: Type.STRING },
                      rischioPentimento: {
                        type: Type.OBJECT,
                        properties: {
                          livello: { type: Type.STRING },
                          motivazione: { type: Type.STRING },
                        },
                      },
                      verdettoProvvisorio: { type: Type.STRING },
                      prossimoPasso: {
                        type: Type.OBJECT,
                        properties: {
                          azione: { type: Type.STRING },
                        },
                      },
                      datiMancanti: { type: Type.STRING },
                    },
                  },
                  // Payload Consiglio
                  consiglio: {
                    type: Type.OBJECT,
                    properties: {
                      tema: { type: Type.STRING },
                      consiglieri: {
                        type: Type.OBJECT,
                        properties: {
                          pragmatico: { type: Type.ARRAY, items: { type: Type.STRING } },
                          economo: { type: Type.ARRAY, items: { type: Type.STRING } },
                          scettico: { type: Type.ARRAY, items: { type: Type.STRING } },
                          serenaDelFuturo: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                      },
                      sintesiConsiglio: { type: Type.STRING },
                      puntiAccordo: { type: Type.ARRAY, items: { type: Type.STRING } },
                      puntiDisaccordo: { type: Type.ARRAY, items: { type: Type.STRING } },
                      verdettoProvvisorio: { type: Type.STRING },
                      prossimoPasso: {
                        type: Type.OBJECT,
                        properties: {
                          azione: { type: Type.STRING },
                        },
                      },
                    },
                  },
                  fontiWeb: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        fonte: { type: Type.STRING },
                        dettaglio: { type: Type.STRING },
                        tipo: { type: Type.STRING },
                        ufficiale: { type: Type.BOOLEAN },
                      },
                      required: ["fonte", "dettaglio", "tipo"],
                    },
                  },
                },
                required: [
                  "fuoriPerimetro",
                  "trascrizionePulita",
                  "modalitaRilevata",
                  "rispostaVocale",
                ],
              },
            },
          });

          const parsed = JSON.parse(res.text || "{}") as JarvisAutoResult;
          if (parsed.rispostaVocale?.puntiSalienti && parsed.rispostaVocale.puntiSalienti.length > 3) {
            parsed.rispostaVocale.puntiSalienti = parsed.rispostaVocale.puntiSalienti.slice(0, 3);
          }
          return parsed;
        } catch (err: any) {
          lastError = err;
          const errMessage = String(err?.message || err);
          const isQuota =
            errMessage.includes("429") ||
            errMessage.includes("RESOURCE_EXHAUSTED") ||
            errMessage.includes("Quota");
          if (isQuota) {
            // Passa subito al modello successivo
            break;
          }
          const isRetryable = errMessage.includes("503") || errMessage.includes("UNAVAILABLE");
          if (isRetryable && attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            continue;
          }
          break;
        }
      }
    }

    const errStr = String(lastError) + " " + String(lastError?.message || "");
    const isBusy =
      errStr.includes("503") ||
      errStr.includes("429") ||
      errStr.includes("high demand") ||
      errStr.includes("UNAVAILABLE") ||
      errStr.includes("RESOURCE_EXHAUSTED");

    if (isBusy) {
      throw new Error(
        "Il motore di Jarvis è temporaneamente occupato. Il testo inserito non è stato perso. Riprova tra poco."
      );
    }
    throw lastError;
  }

  // =========================================================================
  // MODALITÀ DEPOSITO (Scarico pensieri a basso attrito: presa d'atto e ordine)
  // =========================================================================
  if (modalita === "deposito") {
    const systemInstructionDeposito = `Sei Jarvis, cabina di regia personale e secondo cervello virtuale di Serena Sampieri.
Sei in modalità DEPOSITO: Serena si sta togliendo un pensiero dalla testa, sta annotando uno sfogo emotivo, una preoccupazione o un appunto personale grezzo.

DIRETTIVA CATEGORICA DELLA MODALITÀ DEPOSITO:
1. NON GENERARE ALCUNA LISTA DI COMPITI, AZIONI O DOVERI.
2. NON CREARE ALCUN BABY STEP NÉ FORZARE ATTIVITÀ OPERATIVE.
3. Il tuo unico scopo è accogliere il pensiero, riordinarlo in una sintesi limpida e calma, isolare 2-3 chiavi di pensiero e tacere.
4. Nessun finto ottimismo, nessun compiacimento, nessun consiglio paternalistico. Limiti a dare struttura al pensiero in modo che la mente di Serena possa staccare.
5. In 'rispostaVocale' genera un riscontro brevissimo (15-20 secondi) calmo e sobrio, confermando che il pensiero è archiviato in sicurezza e non richiede azione immediata.

PERIMETRO RIGOROSO:
Se il testo menziona ASL Roma 1 o Progetto MUM, imposta fuoriPerimetro a true e messaggioPerimetro a 'Contenuto esterno al perimetro personale di Jarvis.'`;

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await ai.models.generateContent({
            model: modelName,
            contents: `Pensiero da depositare per Serena Sampieri:\n\n${effectiveInput}`,
            config: {
              systemInstruction: systemInstructionDeposito,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  fuoriPerimetro: { type: Type.BOOLEAN },
                  messaggioPerimetro: { type: Type.STRING },
                  trascrizionePulita: { type: Type.STRING },
                  modalitaRilevata: { type: Type.STRING },
                  sintesi: { type: Type.STRING },
                  chiaviDiPensiero: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  annotazioneSilenziosa: { type: Type.STRING },
                  rispostaVocale: RISPOSTA_VOCALE_SCHEMA,
                },
                required: [
                  "fuoriPerimetro",
                  "trascrizionePulita",
                  "modalitaRilevata",
                  "sintesi",
                  "chiaviDiPensiero",
                  "rispostaVocale",
                ],
              },
            },
          });

          const parsed = JSON.parse(res.text || "{}") as JarvisDepositoResult;
          parsed.modalitaRilevata = "deposito";
          if (parsed.rispostaVocale?.puntiSalienti && parsed.rispostaVocale.puntiSalienti.length > 3) {
            parsed.rispostaVocale.puntiSalienti = parsed.rispostaVocale.puntiSalienti.slice(0, 3);
          }
          return parsed;
        } catch (err: any) {
          lastError = err;
          const errMessage = String(err?.message || err);
          const isQuota =
            errMessage.includes("429") ||
            errMessage.includes("RESOURCE_EXHAUSTED") ||
            errMessage.includes("Quota");
          if (isQuota) break;
          const isRetryable = errMessage.includes("503") || errMessage.includes("UNAVAILABLE");
          if (isRetryable && attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            continue;
          }
          break;
        }
      }
    }

    const errStr = String(lastError) + " " + String(lastError?.message || "");
    const isBusy =
      errStr.includes("503") ||
      errStr.includes("429") ||
      errStr.includes("high demand") ||
      errStr.includes("UNAVAILABLE") ||
      errStr.includes("RESOURCE_EXHAUSTED");

    if (isBusy) {
      throw new Error(
        "Il motore di Jarvis è temporaneamente occupato. Il pensiero inserito non è andato perso. Riprova tra poco."
      );
    }
    throw lastError;
  }

  // =========================================================================
  // 2. MODALITÀ DECISIONE (con trascrizionePulita e rispostaVocale)
  // =========================================================================
  if (modalita === "decisione") {
    const systemInstructionDecisione = `Sei Jarvis, cabina di regia personale e decisionale riservata esclusivamente a Serena Sampieri.
Non sei destinato a un pubblico generico.
Jarvis è un assistente progettato come primariamente vocale. Anche con input scritto, rispondi come a voce.

DIRETTIVA FONDAMENTALE DI CARATTERE (ZERO COMPIACIMENTO & ONESTÀ LEALE):
- NON COMPIACERE MAI SERENA. Non validare i suoi dubbi o acquisti per cortesia o finta rassicurazione.
- Zero frasi accomodanti. Se la scelta è velleitaria, costosa o superflua, dillo con lucidità e lealtà.
- Se Serena sta razionalizzando una spesa emotiva o procrastinando una decisione, smonta l'alibi con logica implacabile senza mortificare.
- I 4 costi reali (Denaro, Tempo, Energia Mentale, Complessità Logistica) devono essere calcolati con estremo rigore, senza sottostimarli.
- Il Verdetto Provvisorio deve essere netto, perentorio, privo di mezze misure e senza rifugiarsi nel 'dipende da te', indicando un baby step reversibile ed effettivo.

OBIETTIVO DELLA MODALITÀ DECISIONE:
Aiutare Serena a soppesare una scelta specifica (acquisto, riparazione, abbonamento, cambiamento personale).

1. RICONOSCIMENTO E PULIZIA INPUT VOCALE:
- Trascrivi in 'trascrizionePulita' il testo inserito rimuovendo intercalari, esitazioni e rumore verbale superfluo, preservando ogni fatto e vincolo.

2. RISPOSTA VOCALE BREVE (CIRCA 30 SECONDI DI ASCOLTO):
Costruisci in 'rispostaVocale':
- 'situazione': 1 frase concisa, disincantata e diretta.
- 'puntiSalienti': massimo 3 punti rilevanti (sintesi cruda di costi reali, svantaggi e rischio pentimento).
- 'prossimoPasso': un'azione concreta ed eseguibile subito.
- 'testoParlatoCompleto': testo fluido, tagliente e autorevole pronto per la lettura vocale in circa 30s.
- 'durataStimataSecondi': circa 25-35s.
Stile vocale: frasi corte, chiare, autorevoli, nessun compiacimento o slogan.

3. RISPOSTA SCRITTA COMPLETA:
- Situazione, Vantaggi (max 5), Svantaggi (max 5 realistici), Costi Reali (denaro, tempo, energia mentale, logistica senza sconti), Soluzione Alternativa a Costo Zero/Minimo, Rischio Pentimento (valutato con rigore), Verdetto Provvisorio (netto), Prossimo Passo.

REGOLE PER GOOGLE SEARCH E FONTI ESTERNE:
- Se utilizzi dati esterni o web, privilegia fonti ufficiali, indicale in 'fontiWeb' e distingui fatti verificati da opinioni.

PERIMETRO RIGOROSO:
Se il testo menziona ASL Roma 1 o Progetto MUM, imposta fuoriPerimetro a true e messaggioPerimetro a 'Contenuto esterno al perimetro personale di Jarvis.'`;

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await ai.models.generateContent({
            model: modelName,
            contents: `Analizza questa decisione per Serena Sampieri producendo sia la risposta vocale di 30 secondi sia la scheda completa:\n\n${effectiveInput}`,
            config: {
              systemInstruction: systemInstructionDecisione,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  fuoriPerimetro: { type: Type.BOOLEAN },
                  messaggioPerimetro: { type: Type.STRING },
                  trascrizionePulita: { type: Type.STRING },
                  modalitaRilevata: { type: Type.STRING },
                  rispostaVocale: RISPOSTA_VOCALE_SCHEMA,
                  situazione: { type: Type.STRING },
                  vantaggi: { type: Type.ARRAY, items: { type: Type.STRING } },
                  svantaggi: { type: Type.ARRAY, items: { type: Type.STRING } },
                  costiReali: {
                    type: Type.OBJECT,
                    properties: {
                      denaro: { type: Type.STRING },
                      tempo: { type: Type.STRING },
                      energiaMentale: { type: Type.STRING },
                      complessitaLogistica: { type: Type.STRING },
                    },
                    required: ["denaro", "tempo", "energiaMentale", "complessitaLogistica"],
                  },
                  soluzioneAlternativaEconomica: { type: Type.STRING },
                  rischioPentimento: {
                    type: Type.OBJECT,
                    properties: {
                      livello: { type: Type.STRING },
                      motivazione: { type: Type.STRING },
                    },
                    required: ["livello", "motivazione"],
                  },
                  verdettoProvvisorio: { type: Type.STRING },
                  prossimoPasso: {
                    type: Type.OBJECT,
                    properties: {
                      azione: { type: Type.STRING },
                    },
                    required: ["azione"],
                  },
                  datiMancanti: { type: Type.STRING },
                  fontiWeb: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        fonte: { type: Type.STRING },
                        dettaglio: { type: Type.STRING },
                        tipo: { type: Type.STRING },
                        ufficiale: { type: Type.BOOLEAN },
                      },
                      required: ["fonte", "dettaglio", "tipo"],
                    },
                  },
                },
                required: [
                  "fuoriPerimetro",
                  "trascrizionePulita",
                  "rispostaVocale",
                  "situazione",
                  "vantaggi",
                  "svantaggi",
                  "costiReali",
                  "soluzioneAlternativaEconomica",
                  "rischioPentimento",
                  "verdettoProvvisorio",
                  "prossimoPasso",
                ],
              },
            },
          });

          const parsed = JSON.parse(res.text || "{}") as JarvisDecisionResult;
          parsed.modalitaRilevata = "decisione";
          if (parsed.vantaggi && parsed.vantaggi.length > 5) parsed.vantaggi = parsed.vantaggi.slice(0, 5);
          if (parsed.svantaggi && parsed.svantaggi.length > 5) parsed.svantaggi = parsed.svantaggi.slice(0, 5);
          if (parsed.rispostaVocale?.puntiSalienti && parsed.rispostaVocale.puntiSalienti.length > 3) {
            parsed.rispostaVocale.puntiSalienti = parsed.rispostaVocale.puntiSalienti.slice(0, 3);
          }
          return parsed;
        } catch (err: any) {
          lastError = err;
          const errMessage = String(err?.message || err);
          const isQuota =
            errMessage.includes("429") ||
            errMessage.includes("RESOURCE_EXHAUSTED") ||
            errMessage.includes("Quota");
          if (isQuota) {
            break;
          }
          const isRetryable = errMessage.includes("503") || errMessage.includes("UNAVAILABLE");
          if (isRetryable && attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            continue;
          }
          break;
        }
      }
    }

    const errStr = String(lastError) + " " + String(lastError?.message || "");
    const isBusy =
      errStr.includes("503") ||
      errStr.includes("429") ||
      errStr.includes("high demand") ||
      errStr.includes("UNAVAILABLE") ||
      errStr.includes("RESOURCE_EXHAUSTED");

    if (isBusy) {
      throw new Error(
        "Il motore di Jarvis è temporaneamente occupato. Il testo inserito non è stato perso. Riprova tra poco."
      );
    }
    throw lastError;
  }

  // =========================================================================
  // 3. MODALITÀ CONSIGLIO (con trascrizionePulita e rispostaVocale)
  // =========================================================================
  if (modalita === "consiglio") {
    const systemInstructionConsiglio = `Sei Jarvis, cabina di regia personale e decisionale riservata esclusivamente a Serena Sampieri.
Non sei destinato a un pubblico generico.
Jarvis è un assistente progettato come primariamente vocale. Anche con input scritto, rispondi come a voce.

DIRETTIVA FONDAMENTALE DI CARATTERE (ZERO COMPIACIMENTO & ONESTÀ BRUTALE):
- NESSUN CONSIGLIERE DEVE MAI COMPIACERE SERENA. Nessuna adulazione, nessuna diplomatica accondiscendenza, nessuna timidezza nel dire verità sgradevoli.
- Ciascuna delle quattro voci deve preservare la propria identità strutturale specifica in modo tagliente, onesto e privo di censure:

1. IL PRAGMATICO (Brutale sull'Esecuzione):
- Valuta: fattibilità tecnica cruda, velocità, fatica richiesta, probabilità di riuscita (max 5 punti).
- Ruolo: demolisce senza pietà le complicazioni inutili, i piani arzigogolati e le perdite di tempo. Dice ciò che funziona nel mondo reale oggi, a costo di sembrare cinico.

2. L'ECONOMO (Brutale sulle Risorse):
- Valuta: costi reali, costi nascosti, rapporto costo/beneficio, impatto sul bilancio personale e mentale (max 5 punti).
- Ruolo: non si fa incantare dalle giustificazioni emotive. Attacca le spese superflue, il tempo sprecato e le fughe in avanti economiche. Difende il patrimonio di Serena anche contro la sua stessa volontà impulsiva.

3. LO SCETTICO (Brutale sui Rischi e le Ipotesi):
- Valuta: punti deboli, ipotesi non dimostrate, informazioni mancanti, errori di calcolo, conseguenze indesiderate (max 5 punti).
- Ruolo: cerca il punto esatto in cui il castello crolla. Smonta l'ottimismo ingenuo e formula senza esitazione la domanda scomoda che Serena sta evitando di farsi.

4. SERENA DEL FUTURO (Brutale sulla Prospettiva 6-12 Mesi):
- Valuta: beneficio durevole reale, rischio concreto di rimpianto, sostenibilità nel tempo (max 5 punti).
- Ruolo: parla con il disincanto della distanza temporale. Dice chiaramente se questa scelta tra sei mesi sarà considerata una sciocchezza logorante o un passo solido. Non protegge i sentimenti del presente.

1. RICONOSCIMENTO E PULIZIA INPUT VOCALE:
- Trascrivi in 'trascrizionePulita' il testo inserito ripulito da intercalari e rumore superfluo.

2. RISPOSTA VOCALE BREVE (CIRCA 30 SECONDI DI ASCOLTO):
Costruisci in 'rispostaVocale':
- 'situazione': inquadramento del tema in 1 frase chiara e disincantata.
- 'puntiSalienti': massimo 3 punti rilevanti (le frizioni e le verità più scomode emerse dal consiglio).
- 'prossimoPasso': una sola azione concreta ed eseguibile subito.
- 'testoParlatoCompleto': testo fluido, incisivo e autorevole per la lettura vocale in circa 30s.
- 'durataStimataSecondi': circa 25-35s.
Stile vocale: frasi corte, zero enfasi, zero battute, tono autorevole, fermo e calmo.

3. RISPOSTA SCRITTA COMPLETA:
- Sintesi del Consiglio, Punti di Accordo, Punti di Disaccordo, Verdetto Provvisorio espresso da Jarvis in prima persona in modo netto e decisionista, Prossimo Passo.

REGOLE TASSATIVE:
- Nessun coaching motivazionale, nessuna teatralità, nessun dialogo comico, zero compiacimento.
- Ogni consigliere massimo 5 punti sintetici e spietatamente concreti.
- Applicare minima spesa e massima resa.

PERIMETRO RIGOROSO:
Se il testo menziona ASL Roma 1 o Progetto MUM, imposta fuoriPerimetro a true e messaggioPerimetro a 'Contenuto esterno al perimetro personale di Jarvis.'`;

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await ai.models.generateContent({
            model: modelName,
            contents: `Simula il Consiglio per Serena Sampieri sulla seguente questione producendo sia la risposta vocale breve che il resoconto completo:\n\n${effectiveInput}`,
            config: {
              systemInstruction: systemInstructionConsiglio,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  fuoriPerimetro: { type: Type.BOOLEAN },
                  messaggioPerimetro: { type: Type.STRING },
                  trascrizionePulita: { type: Type.STRING },
                  modalitaRilevata: { type: Type.STRING },
                  rispostaVocale: RISPOSTA_VOCALE_SCHEMA,
                  tema: { type: Type.STRING },
                  consiglieri: {
                    type: Type.OBJECT,
                    properties: {
                      pragmatico: { type: Type.ARRAY, items: { type: Type.STRING } },
                      economo: { type: Type.ARRAY, items: { type: Type.STRING } },
                      scettico: { type: Type.ARRAY, items: { type: Type.STRING } },
                      serenaDelFuturo: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["pragmatico", "economo", "scettico", "serenaDelFuturo"],
                  },
                  sintesiConsiglio: { type: Type.STRING },
                  puntiAccordo: { type: Type.ARRAY, items: { type: Type.STRING } },
                  puntiDisaccordo: { type: Type.ARRAY, items: { type: Type.STRING } },
                  verdettoProvvisorio: { type: Type.STRING },
                  prossimoPasso: {
                    type: Type.OBJECT,
                    properties: {
                      azione: { type: Type.STRING },
                    },
                    required: ["azione"],
                  },
                  fontiWeb: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        fonte: { type: Type.STRING },
                        dettaglio: { type: Type.STRING },
                        tipo: { type: Type.STRING },
                        ufficiale: { type: Type.BOOLEAN },
                      },
                      required: ["fonte", "dettaglio", "tipo"],
                    },
                  },
                },
                required: [
                  "fuoriPerimetro",
                  "trascrizionePulita",
                  "rispostaVocale",
                  "tema",
                  "consiglieri",
                  "sintesiConsiglio",
                  "puntiAccordo",
                  "puntiDisaccordo",
                  "verdettoProvvisorio",
                  "prossimoPasso",
                ],
              },
            },
          });

          const parsed = JSON.parse(res.text || "{}") as JarvisConsiglioResult;
          parsed.modalitaRilevata = "consiglio";
          if (parsed.consiglieri) {
            if (parsed.consiglieri.pragmatico?.length > 5) parsed.consiglieri.pragmatico = parsed.consiglieri.pragmatico.slice(0, 5);
            if (parsed.consiglieri.economo?.length > 5) parsed.consiglieri.economo = parsed.consiglieri.economo.slice(0, 5);
            if (parsed.consiglieri.scettico?.length > 5) parsed.consiglieri.scettico = parsed.consiglieri.scettico.slice(0, 5);
            if (parsed.consiglieri.serenaDelFuturo?.length > 5) parsed.consiglieri.serenaDelFuturo = parsed.consiglieri.serenaDelFuturo.slice(0, 5);
          }
          if (parsed.rispostaVocale?.puntiSalienti && parsed.rispostaVocale.puntiSalienti.length > 3) {
            parsed.rispostaVocale.puntiSalienti = parsed.rispostaVocale.puntiSalienti.slice(0, 3);
          }
          return parsed;
        } catch (err: any) {
          lastError = err;
          const errMessage = String(err?.message || err);
          const isQuota =
            errMessage.includes("429") ||
            errMessage.includes("RESOURCE_EXHAUSTED") ||
            errMessage.includes("Quota");
          if (isQuota) {
            break;
          }
          const isRetryable = errMessage.includes("503") || errMessage.includes("UNAVAILABLE");
          if (isRetryable && attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            continue;
          }
          break;
        }
      }
    }

    const errStr = String(lastError) + " " + String(lastError?.message || "");
    const isBusy =
      errStr.includes("503") ||
      errStr.includes("429") ||
      errStr.includes("high demand") ||
      errStr.includes("UNAVAILABLE") ||
      errStr.includes("RESOURCE_EXHAUSTED");

    if (isBusy) {
      throw new Error(
        "Il motore di Jarvis è temporaneamente occupato. Il testo inserito non è stato perso. Riprova tra poco."
      );
    }
    throw lastError;
  }

  // =========================================================================
  // 4. MODALITÀ ORGANIZZAZIONE (con trascrizionePulita e rispostaVocale)
  // =========================================================================
  const systemInstructionOrganizzazione = `Sei Jarvis, cabina di regia personale e decisionale riservata esclusivamente a Serena Sampieri.
Non sei destinato a un pubblico generico.
Jarvis è un assistente progettato come primariamente vocale. Anche con input scritto, rispondi come a voce.

DIRETTIVA FONDAMENTALE DI CARATTERE (ZERO COMPIACIMENTO & ONESTÀ LEALE):
- NON COMPIACERE MAI SERENA. Non assecondare la tendenza a voler fare tutto o a sovraccaricare la giornata.
- Se l'elenco di impegni è eccessivo, caotico o mal congegnato, denuncialo chiaramente.
- Riduci le priorità al numero reale sostenibile (1, 2 o massimo 3): tutto il resto è scarto o distrazione differibile. Se l'energia del giorno richiede di fare una sola cosa o di recuperare energia, dillo chiaramente.
- Il Baby Step deve essere sia eseguibile subito (5-10 minuti) sia GIUSTO: un'azione minima che produca un avanzamento effettivo del problema, sbloccando l'inerzia senza alibi.
- Zero paternalismo, zero tifoseria. Solo rigore logico, lealtà e chiarezza esecutiva.

OBIETTIVO:
Aiutare Serena a trasformare informazioni personali e pensieri confusi in azioni pratiche con minima spesa e massima resa.

1. RICONOSCIMENTO E PULIZIA INPUT VOCALE:
- Trascrivi in 'trascrizionePulita' il testo inserito rimuovendo intercalari e rumore superfluo, mantenendo intatte tutte le attività e scadenze.

2. RISPOSTA VOCALE BREVE (CIRCA 30 SECONDI DI ASCOLTO):
Costruisci in 'rispostaVocale':
- 'situazione': 1 frase chiara su cosa c'è realmente da fare.
- 'puntiSalienti': massimo 3 punti rilevanti (priorità e scadenze immediate depurate da illusioni).
- 'prossimoPasso': il baby step da fare subito.
- 'testoParlatoCompleto': testo fluido, disincantato e autorevole pronto per la lettura vocale in circa 30s.
- 'durataStimataSecondi': circa 25-35s.
Stile vocale: diretto, pragmatico, calmo, chirurgico, senza coaching.

3. RISPOSTA SCRITTA COMPLETA:
- Non inventare mai orari. Se mancano punto di partenza o tragitto, scrivi 'Orario di partenza da determinare in base al tragitto e al mezzo utilizzato.'
- Distinguere rigorosamente fatti da deduzioni e suggerimenti.
- Massimo 3 azioni prioritarie in 'azioni'.
- Non inventare scadenze.

PERIMETRO RIGOROSO:
Se il testo menziona ASL Roma 1 o Progetto MUM, imposta fuoriPerimetro a true e messaggioPerimetro a 'Contenuto esterno al perimetro personale di Jarvis.'`;

  let lastError: any = null;
  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model: modelName,
          contents: `Testo da riordinare per Serena Sampieri con risposta vocale breve e scomposizione scritta completa:\n\n${effectiveInput}`,
          config: {
            systemInstruction: systemInstructionOrganizzazione,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                fuoriPerimetro: { type: Type.BOOLEAN },
                messaggioPerimetro: { type: Type.STRING },
                trascrizionePulita: { type: Type.STRING },
                modalitaRilevata: { type: Type.STRING },
                rispostaVocale: RISPOSTA_VOCALE_SCHEMA,
                sintesi: { type: Type.STRING },
                babyStep: {
                  type: Type.OBJECT,
                  properties: {
                    azione: { type: Type.STRING },
                    durataStimata: { type: Type.STRING },
                    motivo: { type: Type.STRING },
                    tempistica: { type: Type.STRING },
                  },
                  required: ["azione", "durataStimata", "motivo", "tempistica"],
                },
                azioni: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      testo: { type: Type.STRING },
                      energiaRichiesta: { type: Type.STRING },
                      tipo: { type: Type.STRING },
                    },
                    required: ["testo", "energiaRichiesta", "tipo"],
                  },
                },
                scadenze: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      termine: { type: Type.STRING },
                      oggetto: { type: Type.STRING },
                      vincolante: { type: Type.BOOLEAN },
                    },
                    required: ["termine", "oggetto", "vincolante"],
                  },
                },
                scadenzaNote: { type: Type.STRING },
                criticita: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      ostacolo: { type: Type.STRING },
                      soluzionePragmatica: { type: Type.STRING },
                    },
                    required: ["ostacolo", "soluzionePragmatica"],
                  },
                },
                domandaIndispensabile: { type: Type.STRING },
                fontiWeb: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      fonte: { type: Type.STRING },
                      dettaglio: { type: Type.STRING },
                      tipo: { type: Type.STRING },
                      ufficiale: { type: Type.BOOLEAN },
                    },
                    required: ["fonte", "dettaglio", "tipo"],
                  },
                },
              },
              required: [
                "fuoriPerimetro",
                "trascrizionePulita",
                "rispostaVocale",
                "sintesi",
                "babyStep",
                "azioni",
                "scadenze",
                "criticita",
              ],
            },
          },
        });

        const parsed = JSON.parse(res.text || "{}") as JarvisOrganizationResult;
        parsed.modalitaRilevata = "organizzazione";
        if (parsed.azioni && parsed.azioni.length > 3) parsed.azioni = parsed.azioni.slice(0, 3);
        if (parsed.rispostaVocale?.puntiSalienti && parsed.rispostaVocale.puntiSalienti.length > 3) {
          parsed.rispostaVocale.puntiSalienti = parsed.rispostaVocale.puntiSalienti.slice(0, 3);
        }
        return parsed;
      } catch (err: any) {
        lastError = err;
        const errMessage = String(err?.message || err);
        const isQuota =
          errMessage.includes("429") ||
          errMessage.includes("RESOURCE_EXHAUSTED") ||
          errMessage.includes("Quota");
        if (isQuota) {
          break;
        }
        const isRetryable = errMessage.includes("503") || errMessage.includes("UNAVAILABLE");
        if (isRetryable && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        break;
      }
    }
  }

  const errStr = String(lastError) + " " + String(lastError?.message || "");
  const isBusy =
    errStr.includes("503") ||
    errStr.includes("429") ||
    errStr.includes("high demand") ||
    errStr.includes("UNAVAILABLE") ||
    errStr.includes("RESOURCE_EXHAUSTED");

  if (isBusy) {
    throw new Error(
      "Il motore di Jarvis è temporaneamente occupato. Il testo inserito non è stato perso. Riprova tra poco."
    );
  }
  throw lastError;
}
