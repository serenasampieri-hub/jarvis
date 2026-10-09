import React, { useState, useEffect } from "react";
import {
  X,
  ClipboardCheck,
  Copy,
  Check,
  Brain,
  Layers,
  Target,
  Volume2,
  GitBranch,
  Scale,
  Sparkles,
  RotateCcw,
  Gauge,
  HelpCircle,
  ShieldCheck,
  BookOpen,
  ListChecks,
} from "lucide-react";
import {
  BetaSurveyData,
  loadBetaSurvey,
  saveBetaSurvey,
  formatSurveyToText,
  DEFAULT_SURVEY,
} from "../utils/storage";

interface BetaSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CognitiveQuestionConfig {
  key: keyof Omit<
    BetaSurveyData,
    "caricoMentalePrima" | "caricoMentaleDopo" | "correzioniCognitive" | "dataUltimoAggiornamento"
  >;
  number: number;
  title: string;
  subtitle: string;
  question: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  options: string[];
}

const QUESTIONS: CognitiveQuestionConfig[] = [
  {
    key: "problemaReale",
    number: 1,
    title: "1. Problema Reale e Parole",
    subtitle: "Comprensione del contesto e dell'intenzione profonda.",
    question: "Jarvis ha compreso il problema reale oppure ha elaborato soltanto le parole che ho utilizzato?",
    icon: Brain,
    accentColor: "text-sky-600 bg-sky-50 border border-sky-200",
    options: [
      "Ha compreso il problema reale e il contesto di fondo",
      "Ha elaborato le parole ma senza cogliere la vera complessità",
      "Ha frainteso l'intenzione o la vera priorità",
      "Risposta generica da assistente standard",
    ],
  },
  {
    key: "prioritaEdEnergia",
    number: 2,
    title: "2. Tempo ed Energia Reale",
    subtitle: "Calibrazione delle priorità sul dispendio energetico.",
    question: "Le priorità proposte erano compatibili con il tempo, i vincoli e l'energia realmente disponibili?",
    icon: Layers,
    accentColor: "text-indigo-600 bg-indigo-50 border border-indigo-200",
    options: [
      "Perfettamente compatibili con l'energia di oggi (1, 2 o 3)",
      "Troppo ambiziose per le forze o il tempo reale",
      "Ha forzato 3 compiti quando ne bastava uno solo",
      "Ha scambiato un vincolo logistico per una priorità",
    ],
  },
  {
    key: "babyStepEffettivo",
    number: 3,
    title: "3. Baby Step Efficace (Eseguibile & Giusto)",
    subtitle: "Avanzamento reale vs illusione di movimento.",
    question: "Il baby step era eseguibile e ha prodotto un avanzamento concreto oppure soltanto un'illusione di movimento?",
    icon: Target,
    accentColor: "text-teal-600 bg-teal-50 border border-teal-200",
    options: [
      "Eseguibile e GIUSTO: ha sbloccato davvero il nodo in 5-10 min",
      "Eseguibile ma marginale (non ha avvicinato la soluzione)",
      "Troppo pesante (richiedeva più di 10-15 minuti)",
      "Azione fuori strada rispetto alla reale necessità",
    ],
  },
  {
    key: "voceScaricoVsAzione",
    number: 4,
    title: "4. Voce, Fedeltà e Intenzione (Deposito vs Azione)",
    subtitle: "Non tutto ciò che si dice deve diventare un compito.",
    question: "La sintesi vocale era breve, completa e fedele? Ha distinto tra deposito, elaborazione e azione?",
    icon: Volume2,
    accentColor: "text-amber-600 bg-amber-50 border border-amber-200",
    options: [
      "Ha distinto correttamente: ha accolto il deposito senza imporre compiti",
      "Sintesi audio di 30s asciutta, fedele e pronta all'ascolto",
      "Ha trasformato un semplice scarico mentale in un elenco di compiti",
      "Ha semplificato o interpretato troppo il mio pensiero originale",
    ],
  },
  {
    key: "replicaEContinuita",
    number: 5,
    title: "5. Replica e Continuità dei Dossier",
    subtitle: "Memoria di progetto senza ricominciare da zero.",
    question: "Replica & Integra ha mantenuto la storia, i vincoli e lo stato reale del dossier senza costringermi a ricominciare?",
    icon: GitBranch,
    accentColor: "text-cyan-600 bg-cyan-50 border border-cyan-200",
    options: [
      "Ha tenuto il filo, riconosciuto gli avanzamenti e integrato i nuovi dati",
      "Funziona bene, ma vorrei poter modificare i singoli punti a mano",
      "Ha dimenticato vincoli o decisioni stabilite in precedenza",
      "Non l'ho ancora testato abbastanza in questi giorni",
    ],
  },
  {
    key: "consiglioDeiQuattro",
    number: 6,
    title: "6. Consiglio dei Quattro",
    subtitle: "Prospettive indipendenti: Pragmatico, Economo, Scettico, Serena del Futuro.",
    question: "Le quattro prospettive hanno fatto emergere differenze, rischi e costi nascosti oppure hanno ripetuto la stessa conclusione?",
    icon: Scale,
    accentColor: "text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-200",
    options: [
      "Ha fatto emergere tensioni reali, costi nascosti e rischi utili",
      "Le quattro voci hanno ripetuto la stessa cosa con parole diverse",
      "Non ho avuto bivi o scelte d'acquisto da sottoporre",
      "Verdetto provvisorio poco netto o troppo generico",
    ],
  },
  {
    key: "secondoCervelloVsAssistente",
    number: 7,
    title: "7. Secondo Cervello vs Semplice Assistente",
    subtitle: "Il bilancio definitivo: riduzione del lavoro mentale.",
    question: "Jarvis ha iniziato davvero a pensare con Serena, riducendo la fatica, o si è comportato da comune chatbot?",
    icon: Sparkles,
    accentColor: "text-rose-600 bg-rose-50 border border-rose-200",
    options: [
      "È un secondo cervello: mi alleggerisce la mente e tiene i nodi",
      "A metà strada: molto utile per chiarire, ma richiede ancora supervisione",
      "Si comporta ancora da assistente standard che produce compiti",
      "Troppo rigido su alcune risposte",
    ],
  },
];

export const BetaSurveyModal: React.FC<BetaSurveyModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"diario" | "protocollo">("diario");
  const [survey, setSurvey] = useState<BetaSurveyData>(loadBetaSurvey);
  const [copied, setCopied] = useState(false);
  const [savedNotification, setSavedNotification] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSurvey(loadBetaSurvey());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const completedCount = QUESTIONS.filter(
    (q) => Boolean(survey[q.key]?.giudizio)
  ).length;

  const handleSelectOption = (key: CognitiveQuestionConfig["key"], value: string) => {
    const nowStr = new Date().toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const currentObj = (survey[key] as { giudizio?: string; note?: string }) || {};
    const updated: BetaSurveyData = {
      ...survey,
      dataUltimoAggiornamento: nowStr,
      [key]: {
        ...currentObj,
        giudizio: value,
      },
    };

    setSurvey(updated);
    saveBetaSurvey(updated);
    triggerSaved();
  };

  const handleNoteChange = (key: CognitiveQuestionConfig["key"], note: string) => {
    const nowStr = new Date().toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const currentObj = (survey[key] as { giudizio?: string; note?: string }) || {};
    const updated: BetaSurveyData = {
      ...survey,
      dataUltimoAggiornamento: nowStr,
      [key]: {
        ...currentObj,
        note,
      },
    };

    setSurvey(updated);
    saveBetaSurvey(updated);
    triggerSaved();
  };

  const handleMentalLoadChange = (type: "prima" | "dopo", value: number) => {
    const nowStr = new Date().toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updated: BetaSurveyData = {
      ...survey,
      dataUltimoAggiornamento: nowStr,
      caricoMentalePrima: type === "prima" ? value : survey.caricoMentalePrima,
      caricoMentaleDopo: type === "dopo" ? value : survey.caricoMentaleDopo,
    };

    setSurvey(updated);
    saveBetaSurvey(updated);
    triggerSaved();
  };

  const handleCorrectionsChange = (text: string) => {
    const nowStr = new Date().toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updated: BetaSurveyData = {
      ...survey,
      dataUltimoAggiornamento: nowStr,
      correzioniCognitive: text,
    };

    setSurvey(updated);
    saveBetaSurvey(updated);
    triggerSaved();
  };

  const triggerSaved = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2000);
  };

  const handleCopyReport = async () => {
    const text = formatSurveyToText(survey);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleReset = () => {
    if (window.confirm("Vuoi azzerare le risposte registrate nel diario di collaudo?")) {
      setSurvey(DEFAULT_SURVEY);
      saveBetaSurvey(DEFAULT_SURVEY);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modale */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
                <Brain className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wider">
                Protocollo Personale di Collaudo (7 Giorni)
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Jarvis — Secondo Cervello Virtuale di Serena Sampieri
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab di commutazione: DIARIO VERIFICHE vs TESTO COMPLETO PROTOCOLLO */}
        <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab("diario")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "diario"
                  ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListChecks className="w-3.5 h-3.5 text-sky-600" />
              <span>Diario di Collaudo ({completedCount}/7)</span>
            </button>

            <button
              onClick={() => setActiveTab("protocollo")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "protocollo"
                  ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Testo del Protocollo (10 Punti)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {savedNotification ? (
              <span className="text-[11px] text-emerald-700 font-mono font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" /> Salvato in locale
              </span>
            ) : survey.dataUltimoAggiornamento ? (
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                Aggiornato: {survey.dataUltimoAggiornamento}
              </span>
            ) : null}
          </div>
        </div>

        {/* CONTENUTO SCROLLABILE: SCHEDA 1 (DIARIO INTERATTIVO) */}
        {activeTab === "diario" ? (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
            
            {/* Sezione Carico Mentale Prima vs Dopo (1-10) */}
            <div className="bg-sky-50/50 border border-sky-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-sky-100 text-sky-700">
                  <Gauge className="w-4 h-4" />
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Indice di Carico Mentale (da 1 a 10)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Prima: quanto ti sentivi satura o confusa? Dopo: c'è stato un alleggerimento tangibile o ha generato altro attrito?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-600 font-semibold">Carico Mentale PRIMA:</span>
                    <span className="text-amber-700 font-bold text-sm bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{survey.caricoMentalePrima ?? 7}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={survey.caricoMentalePrima ?? 7}
                    onChange={(e) => handleMentalLoadChange("prima", Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>1 (Leggero)</span>
                    <span>10 (Saturazione totale)</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-600 font-semibold">Carico Mentale DOPO:</span>
                    <span className="text-emerald-700 font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{survey.caricoMentaleDopo ?? 3}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={survey.caricoMentaleDopo ?? 3}
                    onChange={(e) => handleMentalLoadChange("dopo", Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>1 (Sbloccato e chiaro)</span>
                    <span>10 (Ancora carico/confuso)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* I 7 Check del Collaudo */}
            {QUESTIONS.map((q) => {
              const Icon = q.icon;
              const currentVal = survey[q.key];

              return (
                <div
                  key={String(q.key)}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`p-2 rounded-xl ${q.accentColor} shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold border border-slate-200">
                          Punto #{q.number}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                          {q.title}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 font-semibold">
                        {q.question}
                      </p>
                      <p className="text-[11px] text-slate-500 font-normal">
                        {q.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Opzioni Rapide */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt) => {
                      const isSelected = currentVal?.giudizio === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelectOption(q.key, opt)}
                          className={`text-left text-xs p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                            isSelected
                              ? "bg-sky-50 border-sky-300 text-sky-950 shadow-xs font-semibold"
                              : "bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                              isSelected
                                ? "border-sky-600 bg-sky-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span className="leading-snug flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Note pratiche */}
                  <div className="pt-1">
                    <input
                      type="text"
                      value={currentVal?.note || ""}
                      onChange={(e) => handleNoteChange(q.key, e.target.value)}
                      placeholder="Nota di contesto reale (es: la caldaia, la valigia, il master, la stanchezza serale...)"
                      className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition shadow-xs"
                    />
                  </div>
                </div>
              );
            })}

            {/* Correzioni Cognitive & Collegamenti da Memorizzare */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
                  <Brain className="w-4 h-4" />
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Correzioni Cognitive & Collegamenti da Memorizzare
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Cosa avrebbe dovuto capire diversamente? Quali collegamenti tra i tuoi progetti personali o abitudini deve fare propri?
              </p>
              <textarea
                value={survey.correzioniCognitive}
                onChange={(e) => handleCorrectionsChange(e.target.value)}
                rows={3}
                placeholder="Annota liberamente ogni volta che noti una discrepanza tra come pensi tu e come ha risposto Jarvis..."
                className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition resize-y shadow-xs"
              />
            </div>

            {/* Avviso di Riservatezza */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Riservatezza & Archiviazione Locale</span>
              </div>
              <p>
                Le analisi, i dossier e le note sono conservati nel LocalStorage del browser. Durante questo collaudo evita informazioni personali o sensibili finché non saranno verificati tutti i flussi tecnici dell'elaborazione vocale e testuale.
              </p>
            </div>
          </div>
        ) : (
          /* CONTENUTO SCROLLABILE: SCHEDA 2 (TESTO COMPLETO DEL PROTOCOLLO) */
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs sm:text-sm leading-relaxed">
            
            <div className="border-b border-slate-200 pb-4 space-y-2">
              <span className="text-[11px] font-mono text-sky-700 uppercase tracking-wider font-bold">Documento Ufficiale</span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                PROTOCOLLO PERSONALE DI COLLAUDO, 7 GIORNI
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Jarvis, Secondo Cervello Virtuale di Serena Sampieri
              </p>
            </div>

            {/* 1. Scopo del Collaudo */}
            <section className="space-y-2">
              <h4 className="font-bold text-sky-800 uppercase tracking-wide text-xs">
                1. Scopo del Collaudo
              </h4>
              <p className="text-slate-700">
                Questo test non serve a verificare se Jarvis possa piacere a un pubblico generico. Serve a misurare se Jarvis è capace di <strong>pensare con Serena</strong>, riducendo la fatica mentale, mantenendo il contesto, riconoscendo le dispersioni e restituendo chiarezza senza creare nuovo lavoro.
              </p>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-slate-900">Domanda centrale:</div>
                <div className="text-slate-600 italic">
                  "Jarvis comprende Serena abbastanza da ridurre il suo lavoro mentale oppure produce altro materiale intelligente che Serena deve ancora leggere, correggere e organizzare?"
                </div>
              </div>
            </section>

            {/* 2. Principi Cardine */}
            <section className="space-y-3">
              <h4 className="font-bold text-sky-800 uppercase tracking-wide text-xs">
                2. Principi Cardine di Jarvis
              </h4>
              <ul className="space-y-2 pl-3 border-l-2 border-slate-200">
                <li>
                  <strong className="text-slate-900">Zero compiacimento e onestà leale:</strong> lucidità e giudizio senza durezza fine a sé stessa. Dice chiaramente se un'idea è dispersiva o se la priorità reale è riposare.
                </li>
                <li>
                  <strong className="text-slate-900">Non tutto è un'azione (Le 3 intenzioni):</strong>
                  <ul className="mt-1 pl-4 space-y-1 text-slate-600">
                    <li>• <em>Deposito:</em> togliersi un pensiero dalla testa senza compiti o soluzioni forzate.</li>
                    <li>• <em>Elaborazione:</em> comprendere collegamenti e contraddizioni senza ancora decidere.</li>
                    <li>• <em>Azione o decisione:</em> direzione, priorità (1-3) e baby step concreto.</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-slate-900">Minima spesa cognitiva, massima resa:</strong> priorità compatibili con l'energia disponibile e baby step (5-10 min) che sblocca davvero il problema anziché dare solo l'illusione di muoversi.
                </li>
                <li>
                  <strong className="text-slate-900">Fedeltà al pensiero di Serena:</strong> ordinare e chiarire senza sostituire il pensiero con schemi estranei.
                </li>
                <li>
                  <strong className="text-slate-900">Continuità reale:</strong> mantenere lo stato reale dei dossier, i vincoli e le decisioni passate.
                </li>
              </ul>
            </section>

            {/* 3 & 4. Modalità & Micro-Verifica */}
            <section className="space-y-2">
              <h4 className="font-bold text-sky-800 uppercase tracking-wide text-xs">
                3 & 4. Micro-Verifica dopo l'utilizzo reale
              </h4>
              <p className="text-slate-700">
                Usare Jarvis durante la giornata solo quando nasce un bisogno reale. Osservare: intenzione compresa, variazione del carico mentale (1-10), fedeltà della sintesi, efficacia del baby step e lavoro risparmiato.
              </p>
            </section>

            {/* 5. Collaudo della Voce */}
            <section className="space-y-2">
              <h4 className="font-bold text-sky-800 uppercase tracking-wide text-xs">
                5. Collaudo della Voce in Mobilità
              </h4>
              <p className="text-slate-700">
                Verificare durante gli spostamenti o con le cuffie: pulizia degli intercalari senza perdere dettagli, sintesi vocale di ~30s asciutta e rispetto del tono originale.
              </p>
            </section>

            {/* 6. Collaudo Replica & Integra */}
            <section className="space-y-2">
              <h4 className="font-bold text-sky-800 uppercase tracking-wide text-xs">
                6. Collaudo di Replica & Integra
              </h4>
              <p className="text-slate-700">
                Verificare se mantiene la memoria del dossier, riconosce ciò che è stato fatto ed elimina ciò che non è più valido senza riscrivere tutto da zero.
              </p>
            </section>

            {/* 7. Consiglio dei Quattro */}
            <section className="space-y-2">
              <h4 className="font-bold text-sky-800 uppercase tracking-wide text-xs">
                7. Collaudo del Consiglio dei Quattro
              </h4>
              <p className="text-slate-700">
                Pragmatico, Economo, Scettico, Serena del Futuro: le quattro voci devono far emergere tensioni reali, costi nascosti e rischi trascurati, non ripetere la stessa cosa con parole diverse.
              </p>
            </section>

            {/* 8 & 9. Domande Finali & Criterio di Riuscita */}
            <section className="space-y-2">
              <h4 className="font-bold text-sky-800 uppercase tracking-wide text-xs">
                8 & 9. Criterio Finale di Riuscita
              </h4>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div>
                  <strong className="text-emerald-700 font-bold">Jarvis diventa un Secondo Cervello se:</strong> comprende l'intenzione, distingue deposito da azione, calibra sull'energia reale, conserva la voce di Serena e riduce il lavoro cognitivo residuo.
                </div>
                <div>
                  <strong className="text-rose-700 font-bold">Jarvis resta un semplice assistente se:</strong> produce risposte generiche, perde il contesto, trasforma ogni pensiero in compito e genera ulteriore materiale da amministrare.
                </div>
              </div>
            </section>

            {/* 10. Riservatezza */}
            <section className="space-y-1 text-slate-500 text-xs">
              <h4 className="font-bold text-sky-800 uppercase tracking-wide text-[11px]">
                10. Riservatezza & Archiviazione
              </h4>
              <p>
                Dati conservati nel LocalStorage del browser. Evitare credenziali o dati bancari durante il collaudo in mobilità.
              </p>
            </section>
          </div>
        )}

        {/* Footer con Azioni */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-slate-500 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1 font-mono font-medium"
            title="Azzera le risposte inserite nel diario"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Azzera diario</span>
          </button>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={handleCopyReport}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
              title="Copia negli appunti l'intero resoconto del collaudo per la chat"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Resoconto Copiato!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-sky-600" />
                  <span>Copia Resoconto per Chat</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Fatto / Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
