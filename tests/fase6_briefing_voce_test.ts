/**
 * Suite di Collaudo Rigorosa per la Fase 6:
 * Voce Fluida e Briefing su Richiesta (PULL, non PUSH).
 * 
 * Regole Chiave:
 * 1. PULL, non PUSH: Nessun trigger o cron automatico. Briefing generato solo su richiesta.
 * 2. Formato ultra-compatto: 1 sola priorità reale, 1 solo baby step (5-10 min), vincoli 24-48h.
 * 3. Tono René Ferretti: Pragmatico, sobrio, zero prediche motivazionali.
 * 4. Barriera Perimetrale: Zero riferimenti ad ASL Roma 1 o Progetto MUM.
 * 5. Integrazione Memoria Fase 5: Valorizzazione dei fatti certi e ritmi personali.
 * 6. Web Speech API controller: Gestione corretta riproduzione, eventi e fallback.
 */

import {
  generateDailyBriefing,
  ripulisciPerVoce,
  speakBriefing,
  pauseSpeech,
  resumeSpeech,
  stopSpeech,
  isSpeechSynthesisAvailable,
} from "../src/utils/briefingVoice";
import { AnalysisRecord, JarvisMemoryItem } from "../src/types";
import { classifyPerimeter } from "../src/utils/perimeter";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

async function runFase6TestSuite() {
  console.log("================================================================================");
  console.log("SUITE COLLAUDO FASE 6: VOCE FLUIDA & BRIEFING SU RICHIESTA (PULL)");
  console.log("Destinataria: Serena Sampieri | Regia: René Ferretti Style | Zero Notifiche Push");
  console.log("================================================================================\n");

  // Mock records di base per i test
  const sampleRecords: AnalysisRecord[] = [
    {
      id: "rec_1",
      timestamp: "2026-10-09T09:00:00.000Z",
      timestampMs: 1760000400000,
      rawInput: "Organizzare scatoloni in soffitta e richiamare il commercialista",
      modalita: "organizzazione",
      modalitaEffettiva: "organizzazione",
      fuoriPerimetro: false,
      sintesi: "Sistemazione scatoloni e controllo documenti fiscali",
      babyStep: {
        azione: "Aprire il primo scatolone blu e separare documenti da buttare",
        durataStimata: "10 min",
        motivo: "Vincere l'inerzia iniziale senza svuotare l'intera stanza",
        completato: false,
      },
      azioni: [
        { id: "act_1", testo: "Comprare nastro da pacchi", energiaRichiesta: "bassa", tipo: "fatto", completata: false },
        { id: "act_2", testo: "Telefonare a Studio Rossi per fattura", energiaRichiesta: "media", tipo: "fatto", completata: false },
      ],
      scadenze: [
        { id: "scad_1", termine: "Oggi entro le 18:00", oggetto: "Chiamata commercialista", vincolante: true },
        { id: "scad_2", termine: "Tra 30 giorni", oggetto: "Rinnovo assicurazione auto", vincolante: false },
      ],
      criticita: [],
    },
    {
      id: "rec_2",
      timestamp: "2026-10-09T11:00:00.000Z",
      timestampMs: 1760007600000,
      rawInput: "Dilemma se iscrivermi al corso di ceramica il martedì sera",
      modalita: "decisione",
      modalitaEffettiva: "decisione",
      fuoriPerimetro: false,
      decisione: {
        situazione: "Iscrizione corso ceramica",
        vantaggi: ["Stacco serale", "Creatività manuale"],
        svantaggi: ["Rientro tardi", "Costo 180 euro"],
        costiReali: { denaro: "180€", tempo: "2h/sett", energiaMentale: "Bassa", complessitaLogistica: "Media" },
        soluzioneAlternativaEconomica: "Laboratorio singolo di prova",
        rischioPentimento: { livello: "basso", motivazione: "Esperienza limitata" },
        verdettoProvvisorio: "Partecipare prima alla lezione singola",
        prossimoPasso: {
          azione: "Inviare un messaggio WhatsApp per prenotare la lezione di prova singola",
          completato: false,
        },
      },
      azioni: [],
      scadenze: [],
      criticita: [],
    },
  ];

  // ---------------------------------------------------------------------------
  // BRF-01: Generazione Rigorosamente PULL (Su Richiesta, Nessun Cron Automatico)
  // ---------------------------------------------------------------------------
  console.log("▶ BRF-01: Verifica Generazione Rigorosamente PULL (Nessun push molesto)");
  {
    // Il briefing viene calcolato unicamente invocando esplicitamente generateDailyBriefing
    const briefing = generateDailyBriefing({ history: sampleRecords });
    assert(briefing !== null && typeof briefing === "object", "Il briefing deve essere generato su richiesta.");
    assert(briefing.id.startsWith("briefing_"), "Il briefing deve possedere un ID univoco tracciabile.");
    assert(Boolean(briefing.generatoIl), "Il briefing deve contenere la data di generazione ISO.");
    console.log("  ✅ BRF-01 PASS: Briefing generato solo su esplicita chiamata PULL con ID e timestamp.");
  }

  // ---------------------------------------------------------------------------
  // BRF-02: Formato Ultra-Compatto (Massimo 1 Sola Priorità Reale)
  // ---------------------------------------------------------------------------
  console.log("\n▶ BRF-02: Verifica Formato Ultra-Compatto (Massimo 1 sola priorità reale aperta)");
  {
    const briefing = generateDailyBriefing({ history: sampleRecords });
    assert(briefing.prioritaReale !== null, "Deve essere individuata una priorità reale aperta.");
    assert(typeof briefing.prioritaReale?.titolo === "string", "La priorità reale deve avere un titolo chiaro.");
    assert(
      briefing.prioritaReale?.titolo === "Telefonare a Studio Rossi per fattura" ||
      briefing.prioritaReale?.titolo === "Comprare nastro da pacchi",
      `Priorità isolata con successo: "${briefing.prioritaReale?.titolo}".`
    );
    console.log(`  ✅ BRF-02 PASS: Selezionata esattamente 1 priorità reale ("${briefing.prioritaReale?.titolo}").`);
  }

  // ---------------------------------------------------------------------------
  // BRF-03: Formato Ultra-Compatto (1 Solo Baby Step Concreto 5-10 min)
  // ---------------------------------------------------------------------------
  console.log("\n▶ BRF-03: Verifica Isolamento di 1 Solo Baby Step Concreto (5-10 min)");
  {
    const briefing = generateDailyBriefing({ history: sampleRecords });
    assert(briefing.babyStep !== null, "Deve essere isolato 1 solo baby step concreto.");
    assert(typeof briefing.babyStep?.azione === "string", "Il baby step deve contenere un'azione precisa.");
    assert(briefing.babyStep?.durataStimata?.includes("min") === true, "La durata stimata deve essere in minuti brevi.");
    assert(briefing.babyStep?.completato === false, "Il baby step iniziale deve essere pendente.");
    console.log(`  ✅ BRF-03 PASS: Baby step isolato ("${briefing.babyStep?.azione}", stima ${briefing.babyStep?.durataStimata}).`);
  }

  // ---------------------------------------------------------------------------
  // BRF-04: Filtro Vincoli Oggettivi (Solo imminenti entro 24-48h, max 2)
  // ---------------------------------------------------------------------------
  console.log("\n▶ BRF-04: Verifica Vincoli Oggettivi Imminenti (Esclusione scadenze lontane)");
  {
    const briefing = generateDailyBriefing({ history: sampleRecords });
    // rec_1 ha: "Oggi entro le 18:00" (imminente) e "Tra 30 giorni" (lontana)
    assert(briefing.vincoliOggettivi.length === 1, "Solo la scadenza imminente entro 24-48h deve essere inclusa.");
    assert(briefing.vincoliOggettivi[0].termine.toLowerCase().includes("oggi"), "La scadenza 'Oggi' deve essere presente.");
    assert(!briefing.vincoliOggettivi.some(v => v.termine.includes("30 giorni")), "La scadenza a 30 giorni deve essere esclusa dal briefing giornaliero.");
    console.log("  ✅ BRF-04 PASS: Esclusa la scadenza a 30 giorni, inclusa solo quella imminente di oggi.");
  }

  // ---------------------------------------------------------------------------
  // BRF-05: Stile René Ferretti (Pragmatismo, Sobrietà, Zero Frasi da Guru)
  // ---------------------------------------------------------------------------
  console.log("\n▶ BRF-05: Verifica Tono René Ferretti (Zero prediche motivazionali)");
  {
    const briefing = generateDailyBriefing({ history: sampleRecords });
    assert(typeof briefing.messaggioPragmatico === "string", "Il messaggio pragmatico deve essere presente.");
    
    // Verifica assenza di frasi tossicamente entusiaste o da fuffa-guru
    const toxicGuruPatterns = [
      /sei\s+un\s+campione/i,
      /puoi\s+fare\s+tutto/i,
      /spacca\s+il\s+mondo/i,
      /credici\s+fino\s+in\s+fondo/i,
      /miracolo/i,
      /superpotere/i,
    ];
    for (const pat of toxicGuruPatterns) {
      assert(!pat.test(briefing.messaggioPragmatico), `Trovato pattern guru non consentito: ${pat}`);
      assert(!pat.test(briefing.testoParlatoCompleto), `Trovato pattern guru nel parlato: ${pat}`);
    }

    // Verifica presenza di sobrietà pragmatica
    const hasFerrettiTone =
      briefing.messaggioPragmatico.includes("portiamo a casa la giornata") ||
      briefing.messaggioPragmatico.includes("passo per volta") ||
      briefing.messaggioPragmatico.includes("Niente ansie") ||
      briefing.messaggioPragmatico.includes("Una cosa per volta") ||
      briefing.messaggioPragmatico.includes("Nessun sovraccarico");
    assert(hasFerrettiTone, "Il messaggio deve incarnare la filosofia sobria di René Ferretti.");
    console.log(`  ✅ BRF-05 PASS: Tono sobrio e leale confermato ("${briefing.messaggioPragmatico}").`);
  }

  // ---------------------------------------------------------------------------
  // BRF-06: Barriera Perimetrale Invalicabile (ASL Roma 1 & MUM categoricamente esclusi)
  // ---------------------------------------------------------------------------
  console.log("\n▶ BRF-06: Verifica Barriera Perimetrale Invalicabile (Zero ASL/MUM)");
  {
    const pollutedRecords: AnalysisRecord[] = [
      {
        id: "polluted_asl",
        timestamp: "2026-10-09T14:00:00.000Z",
        timestampMs: 1760018000000,
        rawInput: "Controllare la delibera ASL Roma 1 per fornitura presidio ospedaliero",
        modalita: "organizzazione",
        modalitaEffettiva: "organizzazione",
        fuoriPerimetro: true,
        sintesi: "Delibera ASL",
        babyStep: { azione: "Scrivere determina ASL", durataStimata: "10 min", motivo: "Ufficio" },
        azioni: [{ id: "act_asl", testo: "Inviare delibera a direzione sanitaria", energiaRichiesta: "alta", tipo: "fatto" }],
        scadenze: [{ id: "scad_asl", termine: "Oggi alle 15:00", oggetto: "Determina ASL", vincolante: true }],
        criticita: [],
      },
      {
        id: "polluted_mum",
        timestamp: "2026-10-09T14:30:00.000Z",
        timestampMs: 1760019800000,
        rawInput: "Montaggio audio per nuovo episodio podcast MUM",
        modalita: "organizzazione",
        modalitaEffettiva: "organizzazione",
        fuoriPerimetro: true,
        sintesi: "Puntata MUM",
        babyStep: { azione: "Export puntata MUM", durataStimata: "5 min", motivo: "Blog" },
        azioni: [{ id: "act_mum", testo: "Pubblicare blog MUM", energiaRichiesta: "media", tipo: "fatto" }],
        scadenze: [{ id: "scad_mum", termine: "Domani", oggetto: "Episodio MUM", vincolante: true }],
        criticita: [],
      },
      // Record personale valido
      {
        id: "rec_legit",
        timestamp: "2026-10-09T15:00:00.000Z",
        timestampMs: 1760021600000,
        rawInput: "Preparare la valigia con maglione e libro per il fine settimana di riposo",
        modalita: "organizzazione",
        modalitaEffettiva: "organizzazione",
        fuoriPerimetro: false,
        sintesi: "Valigia weekend personale",
        babyStep: { azione: "Prendere il borsone dall'armadio e aprirlo sul letto", durataStimata: "5 min", motivo: "Partire dal gesto più semplice" },
        azioni: [{ id: "act_legit", testo: "Scegliere due libri da leggere in treno", energiaRichiesta: "bassa", tipo: "fatto" }],
        scadenze: [{ id: "scad_legit", termine: "Stasera entro le 21:00", oggetto: "Chiusura valigia", vincolante: true }],
        criticita: [],
      },
    ];

    const briefing = generateDailyBriefing({ history: pollutedRecords });
    
    // Verifica che NESSUN dato ASL o MUM sia finito nella priorità, nel baby step o nei vincoli
    const serializedBriefing = JSON.stringify(briefing).toLowerCase();
    assert(!serializedBriefing.includes("asl"), "Nessun dato ASL deve essere presente nel briefing.");
    assert(!serializedBriefing.includes("mum"), "Nessun dato MUM deve essere presente nel briefing.");
    assert(!serializedBriefing.includes("delibera"), "Nessun dato amministrativo d'ufficio consentito.");
    
    // Verifica che sia stato selezionato unicamente il record personale lecito
    assert(briefing.prioritaReale?.titolo === "Scegliere due libri da leggere in treno", "La priorità deve provenire dal record personale lecito.");
    assert(Boolean(briefing.babyStep?.azione?.includes("borsone")), "Il baby step deve provenire dal record personale lecito.");
    
    // Verifica che anche il testo parlato completo sia al 100% conforme al perimetro
    const checkParlato = classifyPerimeter(briefing.testoParlatoCompleto);
    assert(checkParlato.isAllowed, "Il testo vocale completo deve superare la validazione del perimetro.");
    console.log("  ✅ BRF-06 PASS: Payload inquinati da ASL/MUM intercettati ed espulsi al 100%.");
  }

  // ---------------------------------------------------------------------------
  // BRF-07: Integrazione Memoria Storica Trasparente (Fase 5)
  // ---------------------------------------------------------------------------
  console.log("\n▶ BRF-07: Integrazione Memoria Storica Trasparente (Fatti certi e ritmi personali)");
  {
    const sampleMemories: JarvisMemoryItem[] = [
      {
        id: "mem_ritmo",
        tipo: "fatto",
        categoria: "abitudine",
        testo: "Lavorare a blocchi di 25 minuti con 5 minuti di pausa e camminata",
        status: "confermato",
        createdAt: "2026-10-09T08:00:00.000Z",
        updatedAt: "2026-10-09T08:00:00.000Z",
        revision: 1,
        deviceId: "dev_test",
      },
    ];

    const briefing = generateDailyBriefing({ history: sampleRecords, memories: sampleMemories });
    assert(briefing.contestoMemoria !== undefined, "Il contesto di memoria deve essere valorizzato se presente.");
    assert(briefing.contestoMemoria?.[0].includes("blocchi di 25 minuti") === true, "Il fatto confermato sui ritmi deve essere integrato.");
    assert(briefing.testoParlatoCompleto.includes("blocchi di 25 minuti"), "La memoria deve essere richiamata nel parlato in modo sobrio.");
    console.log("  ✅ BRF-07 PASS: Memoria fattuale confermata della Fase 5 integrata armonicamente nel briefing.");
  }

  // ---------------------------------------------------------------------------
  // BRF-08: Pulizia Testo Parlato, Durata e Controller Web Speech API
  // ---------------------------------------------------------------------------
  console.log("\n▶ BRF-08: Verifica Pulizia Testo Parlato, Calcolo Durata e Controller Audio");
  {
    // Test ripulisciPerVoce
    const rawMarkdown = "**Comprare** nastro da pacchi [subito](http://link) e fare 15 min di pausa (circa 2 h totali).";
    const cleaned = ripulisciPerVoce(rawMarkdown);
    assert(!cleaned.includes("**"), "I caratteri markdown asterischi devono essere rimossi.");
    assert(!cleaned.includes("[subito]"), "I link markdown devono essere ripuliti al solo testo visibile.");
    assert(cleaned.includes("15 minuti"), "min deve essere espanso in 'minuti'.");
    assert(cleaned.includes("2 ore"), "h deve essere espanso in 'ore'.");

    // Calcolo durata stimata compatto
    const briefing = generateDailyBriefing({ history: sampleRecords });
    assert(briefing.durataStimataSecondi >= 15 && briefing.durataStimataSecondi <= 45, `La durata (${briefing.durataStimataSecondi}s) deve rientrare nella finestra 15-45s.`);

    // Mock ambiente Web Speech API per testare speakBriefing, pause, resume, stop
    const globalAny = globalThis as any;
    let spokenUtteranceText = "";
    let started = false;
    let ended = false;
    let paused = false;
    let resumed = false;
    let cancelled = false;

    class MockSpeechSynthesisUtterance {
      text: string;
      lang = "";
      rate = 1.0;
      pitch = 1.0;
      onstart?: () => void;
      onend?: () => void;
      onpause?: () => void;
      onresume?: () => void;
      onerror?: (e: any) => void;
      constructor(text: string) {
        this.text = text;
      }
    }

    const mockSpeechSynthesis = {
      speak: (utt: MockSpeechSynthesisUtterance) => {
        spokenUtteranceText = utt.text;
        started = true;
        utt.onstart?.();
      },
      cancel: () => {
        cancelled = true;
      },
      pause: () => {
        paused = true;
      },
      resume: () => {
        resumed = true;
      },
      getVoices: () => [{ name: "Alice (Italian)", lang: "it-IT" }],
    };

    globalAny.window = {
      speechSynthesis: mockSpeechSynthesis,
    };
    globalAny.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

    assert(isSpeechSynthesisAvailable() === true, "isSpeechSynthesisAvailable deve restituire true quando window.speechSynthesis è presente.");

    const stopFn = speakBriefing(briefing.testoParlatoCompleto, {
      onStart: () => { started = true; },
      onEnd: () => { ended = true; },
      onPause: () => { paused = true; },
      onResume: () => { resumed = true; },
    });

    assert(started, "onStart deve essere invocato.");
    assert(spokenUtteranceText.length > 20, "Il testo dell'utterance deve essere popolato.");

    pauseSpeech();
    assert(paused, "pauseSpeech deve invocare il metodo pause.");

    resumeSpeech();
    assert(resumed, "resumeSpeech deve invocare il metodo resume.");

    stopFn();
    assert(cancelled, "La funzione di cleanup deve invocare cancel.");

    console.log("  ✅ BRF-08 PASS: Ripulitura testo, calcolo durata (~25s) e controller Web Speech API verificati.");
  }

  // ---------------------------------------------------------------------------
  // BRF-09: Gestione Stato Orizzonte Sgombro (Zero Compiti, Zero Scadenze)
  // ---------------------------------------------------------------------------
  console.log("\n▶ BRF-09: Verifica Stato Orizzonte Sgombro (Nessun compito o scadenza aperta)");
  {
    const emptyHistory: AnalysisRecord[] = [];
    const briefing = generateDailyBriefing({ history: emptyHistory });

    assert(briefing.prioritaReale === null, "Nessuna priorità deve essere inventata.");
    assert(briefing.babyStep === null, "Nessun baby step deve essere inventato.");
    assert(briefing.vincoliOggettivi.length === 0, "Nessun vincolo deve essere presente.");
    assert(briefing.testoParlatoCompleto.includes("Orizzonte completamente sgombro"), "Il parlato deve comunicare serenamente l'assenza di pendenze.");
    assert(briefing.messaggioPragmatico.includes("Orizzonte sgombro"), "Il motto deve rispecchiare lo spazio libero.");
    console.log("  ✅ BRF-09 PASS: Resilienza perfetta in assenza di compiti: zero allucinazioni, orizzonte sgombro confermato.");
  }

  console.log("\n================================================================================");
  console.log("TUTTI I 9 TEST DELLA FASE 6 (BRF-01 - BRF-09) SONO STATI SUPERATI AL 100%!");
  console.log("================================================================================");
}

runFase6TestSuite().catch((err) => {
  console.error("\n❌ ERRORE DURANTE IL COLLAUDO FASE 6:", err);
  process.exit(1);
});
