import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, RotateCcw, AlertTriangle, Compass, CheckSquare, Users, Volume2, Archive } from "lucide-react";
import { ModalitaJarvis } from "../types";

interface InputPanelProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSubmit: (text: string) => void;
  isLoading: boolean;
  modalita: ModalitaJarvis;
  onSelectModalita: (modalita: ModalitaJarvis) => void;
}

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

const AUTO_VOICE_PRESETS = [
  {
    titolo: "Dettatura mista: farmacia, pacco e commissioni",
    testo:
      "Allora ehm ascolta domani devo andare in farmacia poi forse passare a prendere un pacco e ricordarmi di controllare alcune cose per Flavio",
  },
  {
    titolo: "Dilemma: riparazione caldaia o sostituzione",
    testo:
      "Senti ho un dubbio perché la caldaia ha nove anni e perde pressione. Il tecnico chiede 300 euro per il pezzo di ricambio, mentre un modello a condensazione nuovo costa 1.100 euro. Vorrei capire cosa conviene fare.",
  },
  {
    titolo: "Confronto prospettive: master formativo",
    testo:
      "Vorrei valutare se investire 2.800 euro in un master specialistico di sei mesi oppure studiare in autonomia sui libri nel fine settimana, soppesando tempo, costi ed efficacia professionale reale.",
  },
];

const DEPOSITO_PRESETS = [
  {
    titolo: "Sfogo mentale senza compiti",
    testo:
      "Oggi mi sento sopraffatta da mille pensieri sparsi sulla settimana. Non voglio un piano d'azione né baby step adesso: voglio solo scaricare la mente e sapere che questo pensiero è al sicuro.",
  },
  {
    titolo: "Spunto creativo da conservare",
    testo:
      "Idea per il futuro: ripensare il modo in cui gestisco le pause di lavoro nel pomeriggio, magari dedicando 15 minuti a camminare invece di guardare lo schermo. Solo un promemoria concettuale da custodire.",
  },
  {
    titolo: "Riflessione personale a caldo",
    testo:
      "Dopo la conversazione di oggi con Flavio ho capito che devo chiarire meglio i miei orari di reperibilità serale per non sentirmi in affanno. Nessun compito da fare subito, solo consapevolezza.",
  },
];

const ORG_PRESETS = [
  {
    titolo: "Cambio guardaroba e scatoloni",
    testo:
      "Devo fare il cambio stagione tra autunno e inverno ma ho la camera invasa da 4 scatoloni aperti. Vorrei selezionare i capi da donare e sistemare maglioni e cappotti entro domenica, ma continuo a procrastinare perché l'armadio sembra troppo piccolo e non so da quale cassetto iniziare.",
  },
  {
    titolo: "Bollette casa e disdetta servizi",
    testo:
      "Ho una pila di lettere sul tavolo dell'ingresso: due bollette del gas di cui non ricordo la scadenza precisa, la ricevuta della tassa rifiuti e un abbonamento a un servizio streaming che non apro da quattro mesi ma continua a prelevare 14 euro al mese. Devo fare chiarezza senza impazzire tra login e conti.",
  },
  {
    titolo: "Weekend di riposo fuori porta",
    testo:
      "Voglio organizzare due giorni di stacco completo nel fine settimana prossimo, posto raggiungibile in treno massimo due ore, zona silenziosa per camminare e leggere. Non voglio passare mezza giornata a confrontare 20 alberghi diversi: mi serve una decisione rapida, prenotare e fare una valigia con il minimo indispensabile.",
  },
];

const DECISION_PRESETS = [
  {
    titolo: "Riparare o sostituire lavastoviglie",
    testo:
      "La lavastoviglie di 7 anni fa rumore e non scarica bene. Il tecnico chiede 120 euro solo per l'uscita e diagnosi, con spesa totale stimata di 250 euro per ripararla. Un modello nuovo analogo con classe energetica superiore costa circa 480 euro. Sono indecisa se rischiare la riparazione o sostituirla subito.",
  },
  {
    titolo: "Abbonamento annuale vs carnet ingressi",
    testo:
      "Devo scegliere tra iscrivermi alla palestra con abbonamento annuale a 550 euro (conveniente se vado con costanza) oppure prendere un carnet da 10 ingressi a 140 euro senza vincoli. In passato per periodi di stanchezza ho saltato mesi interi.",
  },
  {
    titolo: "Cambiare fornitore utenza o tenere l'attuale",
    testo:
      "Mi hanno proposto un cambio di fornitore luce con un risparmio promesso del 15% sulla materia energia. L'attuale fornitore ha un servizio clienti rapido e bollette chiare. Vale la pena investire tempo ed energia mentale per la procedura di voltura e cambio?",
  },
];

const CONSIGLIO_PRESETS = [
  {
    titolo: "Master formativo specialistico o autoapprendimento",
    testo:
      "Sto valutando se iscrivermi a un percorso specialistico di 6 mesi dal costo di 2.800 euro (circa 8 ore a settimana richieste) oppure strutturare un piano di autoapprendimento con libri ed esercitazioni autonome nel weekend senza scadenze esterne.",
  },
  {
    titolo: "Rinnovare laptop professionale o riparare l'attuale",
    testo:
      "Il mio computer portatile ha 4 anni. Funziona ancora ma la batteria dura solo un'ora e con troppe applicazioni aperte rallenta. Valuto se spendere 1.600 euro per un modello nuovo professionale o cambiare batteria e alimentatore per 120 euro.",
  },
  {
    titolo: "Esternalizzare gestione contabilità o mantenere l'autonomia",
    testo:
      "Dedico circa 4 ore ogni fine mese tra archiviazione fatture, scadenze fiscali e F24. Un commercialista mi chiede 800 euro l'anno per gestire tutto. Vorrei capire se delegare ripaga la spesa o se conviene migliorare la mia procedura interna.",
  },
];

export const InputPanel: React.FC<InputPanelProps> = ({
  inputText,
  setInputText,
  onSubmit,
  isLoading,
  modalita,
  onSelectModalita,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  const handleScaricoRapido = () => {
    onSelectModalita("deposito");
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 60);
  };

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "it-IT";

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }

        if (event.results[event.results.length - 1].isFinal) {
          setInputText(inputText ? `${inputText.trim()} ${currentTranscript.trim()}` : currentTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          setSpeechError("Impossibile accedere al microfono o dettatura interrotta.");
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [inputText, setInputText]);

  const toggleRecording = () => {
    setSpeechError(null);
    if (!recognitionRef.current) {
      setSpeechError(
        "Su Chrome per iPhone, Apple limita l'API microfono ai browser non-Safari: puoi usare comodamente il tasto microfono della tastiera dell'iPhone (in basso a destra 🎙️) all'interno del campo di testo, oppure aprire il link su Safari per usare il pulsante a schermo."
      );
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        setSpeechError("Errore durante l'avvio della dettatura vocale.");
        setIsRecording(false);
      }
    }
  };

  const handleClear = () => {
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
    }
    setInputText("");
    setSpeechError(null);
  };

  const handlePresetClick = (presetText: string) => {
    setInputText(presetText);
    setSpeechError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !inputText.trim()) return;
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
    }
    onSubmit(inputText);
  };

  const charCount = inputText.length;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const activePresets =
    modalita === "auto"
      ? AUTO_VOICE_PRESETS
      : modalita === "deposito"
      ? DEPOSITO_PRESETS
      : modalita === "consiglio"
      ? CONSIGLIO_PRESETS
      : modalita === "decisione"
      ? DECISION_PRESETS
      : ORG_PRESETS;

  return (
    <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Intestazione e Selettore di Modalità Segmentato (5 Modalità con DEPOSITO) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
              Modalità Operativa
            </h2>
          </div>
          <button
            type="button"
            onClick={handleScaricoRapido}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[36px]"
            title="Passa a Deposito e posiziona il cursore per scrivere o dettare con 1 tap"
          >
            <span>⚡ Scarico Rapido (2 Tocchi)</span>
          </button>
        </div>

        {/* Segmented Control (Zero-Pill, bottoni strutturati a tastiera) */}
        <div className="flex flex-wrap items-center p-1 bg-slate-100 border border-slate-200/80 rounded-xl self-start sm:self-auto gap-1">
          <button
            type="button"
            onClick={() => onSelectModalita("auto")}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[40px] sm:min-h-[36px] ${
              modalita === "auto"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Riconoscimento vocale e auto-rilevamento della modalità"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-600" />
            <span>AUTO (VOCE)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectModalita("deposito")}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[40px] sm:min-h-[36px] ${
              modalita === "deposito"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Deposito puro: scarico mentale, ascolto e archiviazione sicura senza compiti o baby step"
          >
            <Archive className="w-3.5 h-3.5 text-amber-600" />
            <span>DEPOSITO</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectModalita("organizzazione")}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[40px] sm:min-h-[36px] ${
              modalita === "organizzazione"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>ORGANIZZAZIONE</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectModalita("decisione")}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[40px] sm:min-h-[36px] ${
              modalita === "decisione"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-sky-600" />
            <span>DECISIONE</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectModalita("consiglio")}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[40px] sm:min-h-[36px] ${
              modalita === "consiglio"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>CONSIGLIO</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500 font-medium">
          {modalita === "auto"
            ? "Modalità Voce intelligente: pulizia automatica dell'input, rilevamento modalità e sintesi parlata di 30s"
            : modalita === "deposito"
            ? "Deposito puro: scarico mentale, ascolto attivo e archiviazione sicura senza forzare compiti o baby step"
            : modalita === "consiglio"
            ? "Discussione strutturata tra 4 consiglieri permanenti (Pragmatico, Economo, Scettico, Serena del Futuro)"
            : modalita === "decisione"
            ? "Valutazione neutrale di una scelta: vantaggi, svantaggi, costi reali e verdetto"
            : "Scomposizione pragmatica: sintesi, baby step, priorità, scadenze e criticità"}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono tabular-nums">
          <span>{wordCount} parole</span>
          <span aria-hidden="true">·</span>
          <span>{charCount} caratteri</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner discreto per dettatura rapida da tastiera iOS */}
        {isIOS && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-sky-50/90 border border-sky-200/80 text-[11px] sm:text-xs text-sky-900 leading-relaxed shadow-xs">
            <span className="text-base leading-none">🎙️</span>
            <span>
              <strong>Dettatura rapida da iPhone:</strong> tocca il campo e usa il tasto microfono della tastiera nativa Apple (in basso a destra) per parlare a lungo senza blocchi del browser.
            </span>
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={
              modalita === "auto"
                ? "Parla o scrivi liberamente: Jarvis rimuoverà intercalari e rumore verbale, individuerà la modalità più adatta e preparerà la sintesi vocale di 30s..."
                : modalita === "deposito"
                ? "Scarica qui pensieri, note sparse o riflessioni senza alcuna pressione: Jarvis non ti assegnerà compiti né baby step forzati, ma custodirà il tuo pensiero..."
                : modalita === "consiglio"
                ? "Descrivi la questione o il dilemma da sottoporre al Consiglio: alternative considerate, vincoli o dubbi..."
                : modalita === "decisione"
                ? "Descrivi la scelta o il dubbio da valutare: opzioni in gioco, vincoli, timori o costi da soppesare..."
                : "Scrivi o detta liberamente: appunti confusi, compiti rimandati, cose da sistemare o situazioni da sbrogliare..."
            }
            rows={5}
            className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl p-3.5 sm:p-4 text-base sm:text-sm text-slate-800 placeholder-slate-400 leading-relaxed outline-none transition resize-y font-normal shadow-xs"
          />

          {isRecording && (
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-2.5 py-1 rounded-lg font-medium shadow-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Dettatura in corso...</span>
            </div>
          )}
        </div>

        {speechError && (
          <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 p-3 rounded-xl font-medium shadow-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{speechError}</span>
          </div>
        )}

        {/* Esempi rapidi contestuali alla modalità */}
        <div className="pt-1">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 font-bold">
            Scenari di Prova ({modalita === "auto" ? "Dettatura Naturale & Voce" : modalita === "deposito" ? "Scarico & Custodia Mentale" : modalita === "consiglio" ? "Consiglio dei 4" : modalita === "decisione" ? "Dilemmi Decisionali" : "Organizzazione Attività"})
          </div>
          <div className="flex flex-wrap gap-2">
            {activePresets.map((p) => (
              <button
                key={p.titolo}
                type="button"
                onClick={() => handlePresetClick(p.testo)}
                disabled={isLoading}
                className="text-xs text-slate-700 hover:text-slate-950 bg-slate-50/80 hover:bg-slate-100 border border-slate-200/90 px-3 py-1.5 rounded-lg transition-colors text-left cursor-pointer font-medium min-h-[36px]"
              >
                {p.titolo}
              </button>
            ))}
          </div>
        </div>

        {/* Barra controlli inferiori */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isLoading}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs px-3.5 py-2.5 rounded-xl border transition-colors cursor-pointer font-medium shadow-xs min-h-[44px] ${
                isRecording
                  ? "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              }`}
              title="Dettatura vocale in lingua italiana"
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4 text-rose-600" />
                  <span>Interrompi Dettatura</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-slate-500" />
                  <span>Dettatura Vocale (it-IT)</span>
                </>
              )}
            </button>

            {inputText && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading}
                className="flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer min-h-[44px]"
                title="Cancella testo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pulisci</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs min-h-[44px]"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                <span>Elaborazione in corso...</span>
              </>
            ) : (
              <>
                {modalita === "auto" ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Elabora con Jarvis (Voce)</span>
                  </>
                ) : modalita === "deposito" ? (
                  <>
                    <Archive className="w-3.5 h-3.5 text-amber-400" />
                    <span>Deposita Pensiero</span>
                  </>
                ) : modalita === "consiglio" ? (
                  <>
                    <Users className="w-3.5 h-3.5 text-slate-300" />
                    <span>Convoca il Consiglio</span>
                  </>
                ) : modalita === "decisione" ? (
                  <>
                    <Compass className="w-3.5 h-3.5 text-slate-300" />
                    <span>Valuta Decisione</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-slate-300" />
                    <span>Analizza & Scomponi</span>
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
