import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Copy,
  Download,
  Trash2,
  Clock,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  Check,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Boxes,
  HelpCircle as QuestionIcon,
  Globe,
  Users,
  Target,
  Sparkles,
  Play,
  Pause,
  Square,
  Volume2,
  FileText,
  MessageSquarePlus,
  Send,
  CornerDownRight,
  Loader2,
  Archive,
  Brain,
} from "lucide-react";
import { AnalysisRecord } from "../types";
import { formatAnalysisToText } from "../utils/storage";
import { saveMemory } from "../utils/memoryManager";

interface OutputCockpitProps {
  record: AnalysisRecord;
  onUpdateRecord: (updated: AnalysisRecord) => void;
  onDeleteRecord: (id: string) => void;
  onReplica?: (replicaText: string) => Promise<void>;
  isReplicating?: boolean;
}

export const OutputCockpit: React.FC<OutputCockpitProps> = ({
  record,
  onUpdateRecord,
  onDeleteRecord,
  onReplica,
  isReplicating = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [savedToMemory, setSavedToMemory] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isPausedVoice, setIsPausedVoice] = useState(false);
  const [replicaInput, setReplicaInput] = useState("");
  const [localIsReplicating, setLocalIsReplicating] = useState(false);

  const handleMemorizeFact = () => {
    const factText =
      record.babyStep?.azione ||
      record.deposito?.sintesi ||
      record.sintesi ||
      record.rawInput;
    if (!factText) return;

    const res = saveMemory({
      tipo: "fatto",
      categoria: record.modalita === "decisione" ? "decisione" : "progetto",
      testo: factText,
      progettoNome: record.titoloProgetto,
      fonteRecordId: record.id,
      status: "confermato",
    });

    if (res.success) {
      setSavedToMemory(true);
      setTimeout(() => setSavedToMemory(false), 3000);
    }
  };

  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlayingVoice(false);
      setIsPausedVoice(false);
    }
  }, [record.id]);

  const handlePlayVoice = () => {
    if (!("speechSynthesis" in window) || !record.rispostaVocale) return;

    if (isPausedVoice) {
      window.speechSynthesis.resume();
      setIsPausedVoice(false);
      setIsPlayingVoice(true);
      return;
    }

    window.speechSynthesis.cancel();

    const utteranceText =
      record.rispostaVocale.testoParlatoCompleto ||
      `${record.rispostaVocale.situazione}. ${record.rispostaVocale.puntiSalienti.join(". ")}. Prossimo passo: ${record.rispostaVocale.prossimoPasso}.`;

    const utterance = new SpeechSynthesisUtterance(utteranceText);
    utterance.lang = "it-IT";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlayingVoice(true);
      setIsPausedVoice(false);
    };

    utterance.onend = () => {
      setIsPlayingVoice(false);
      setIsPausedVoice(false);
    };

    utterance.onerror = () => {
      setIsPlayingVoice(false);
      setIsPausedVoice(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePauseVoice = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setIsPausedVoice(true);
    setIsPlayingVoice(false);
  };

  const handleStopVoice = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsPlayingVoice(false);
    setIsPausedVoice(false);
  };

  const handleSubmitReplica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replicaInput.trim() || !onReplica || isReplicating || localIsReplicating) return;
    const textToSend = replicaInput.trim();
    setReplicaInput("");
    setLocalIsReplicating(true);
    try {
      await onReplica(textToSend);
    } finally {
      setLocalIsReplicating(false);
    }
  };

  const handleQuickChip = (chipText: string) => {
    setReplicaInput((prev) => (prev ? `${prev} ${chipText}` : chipText));
  };

  // Gestione esclusione perimetrale
  if (record.fuoriPerimetro) {
    return (
      <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-start gap-3.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h2 className="text-base font-bold text-amber-950">
              {record.messaggioPerimetro || "Contenuto esterno al perimetro personale di Jarvis."}
            </h2>
            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
              Questo assistente è calibrato in modo esclusivo per la gestione personale e decisionale di Serena Sampieri.
              Le comunicazioni o attività lavorative di <strong className="text-amber-950 font-bold">ASL Roma 1</strong> e i contenuti o podcast collegati al <strong className="text-amber-950 font-bold">progetto MUM</strong> sono rigorosamente esclusi per preservare la riservatezza e la netta separazione degli ambiti.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onDeleteRecord(record.id)}
                className="text-xs text-amber-700 hover:text-amber-950 underline underline-offset-4 cursor-pointer font-medium"
              >
                Rimuovi questo inserimento
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Toggle Baby Step (Organizzazione)
  const handleToggleBabyStep = () => {
    if (!record.babyStep) return;
    const updated: AnalysisRecord = {
      ...record,
      babyStep: {
        ...record.babyStep,
        completato: !record.babyStep.completato,
      },
    };
    onUpdateRecord(updated);
  };

  // Toggle Azione (Organizzazione)
  const handleToggleAction = (actionId: string) => {
    if (!record.azioni) return;
    const updatedActions = record.azioni.map((a) =>
      a.id === actionId ? { ...a, completata: !a.completata } : a
    );
    onUpdateRecord({ ...record, azioni: updatedActions });
  };

  // Toggle Criticità (Organizzazione)
  const handleToggleCriticita = (critId: string) => {
    if (!record.criticita) return;
    const updatedCrit = record.criticita.map((c) =>
      c.id === critId ? { ...c, risolta: !c.risolta } : c
    );
    onUpdateRecord({ ...record, criticita: updatedCrit });
  };

  // Toggle Prossimo Passo (Decisione)
  const handleToggleProssimoPasso = () => {
    if (!record.decisione) return;
    const updated: AnalysisRecord = {
      ...record,
      decisione: {
        ...record.decisione,
        prossimoPasso: {
          ...record.decisione.prossimoPasso,
          completato: !record.decisione.prossimoPasso.completato,
        },
      },
    };
    onUpdateRecord(updated);
  };

  // Toggle Prossimo Passo (Consiglio)
  const handleToggleConsiglioPasso = () => {
    if (!record.consiglio) return;
    const updated: AnalysisRecord = {
      ...record,
      consiglio: {
        ...record.consiglio,
        prossimoPasso: {
          ...record.consiglio.prossimoPasso,
          completato: !record.consiglio.prossimoPasso?.completato,
        },
      },
    };
    onUpdateRecord(updated);
  };

  // Copia negli appunti
  const handleCopy = async () => {
    try {
      const text = formatAnalysisToText(record);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Errore copia appunti", e);
    }
  };

  // Download file di testo
  const handleDownload = () => {
    const text = formatAnalysisToText(record);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jarvis_${record.modalita}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const completedActionsCount = record.azioni?.filter((a) => a.completata).length || 0;

  const effectiveMode =
    record.modalitaEffettiva ||
    (record.modalita === "auto"
      ? record.deposito
        ? "deposito"
        : record.consiglio
        ? "consiglio"
        : record.decisione
        ? "decisione"
        : "organizzazione"
      : record.modalita);

  return (
    <div className="space-y-6">
      {/* Barra di controllo della sessione */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 px-4 py-3 rounded-2xl text-xs shadow-xs">
        <div className="flex items-center gap-2 text-slate-500 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Registrato il {record.timestamp}</span>
          <span aria-hidden="true">·</span>
          <span className="uppercase text-slate-800 font-bold">
            {record.modalita === "auto"
              ? `Modalità Voce (Auto) → ${effectiveMode.toUpperCase()}`
              : record.modalita === "deposito"
              ? "Modalità Deposito"
              : record.modalita === "consiglio"
              ? "Modalità Consiglio"
              : record.modalita === "decisione"
              ? "Modalità Decisione"
              : "Modalità Organizzazione"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer font-medium shadow-xs"
            title="Copia l'intero resoconto negli appunti"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copiato</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copia Resoconto</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer font-medium shadow-xs"
            title="Scarica file di testo pulito"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Scarica .txt</span>
          </button>

          <button
            type="button"
            onClick={handleMemorizeFact}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium text-xs transition-all cursor-pointer shadow-xs ${
              savedToMemory
                ? "bg-purple-100 border-purple-300 text-purple-900 font-bold"
                : "bg-purple-50 hover:bg-purple-100/80 border-purple-200 text-purple-800"
            }`}
            title="Memorizza la sintesi o il baby step come fatto certo nel secondo cervello (Fase 5)"
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span>{savedToMemory ? "Memorizzato!" : "Memorizza Fatto"}</span>
          </button>

          <button
            onClick={() => onDeleteRecord(record.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-1"
            title="Elimina questa analisi dalla memoria"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Elimina</span>
          </button>
        </div>
      </div>

      {/* DOMANDA DI DISAMBIGUAZIONE DELLA MODALITÀ (se presente) */}
      {record.domandaDisambiguazioneModalita && (
        <section className="bg-sky-50 border border-sky-200 rounded-2xl p-5 sm:p-6 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-sky-800 font-bold text-xs uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 shrink-0 text-sky-600" />
            <span>Chiarimento sull'Intento Operativo</span>
          </div>
          <p className="text-sm text-slate-800 font-medium leading-relaxed">
            {record.domandaDisambiguazioneModalita}
          </p>
        </section>
      )}

      {/* TRASCRIZIONE E PULIZIA VOCALE (se presente) */}
      {record.trascrizionePulita && record.trascrizionePulita.trim() !== record.rawInput.trim() && (
        <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-sky-50 text-sky-600 border border-sky-100">
                <Volume2 className="w-4 h-4" />
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Interpretazione Vocale di Jarvis
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Rumore e intercalari rimossi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Input Originale / Parlato</span>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "{record.rawInput}"
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/80 space-y-1">
              <span className="text-[10px] font-mono uppercase text-sky-700 font-bold">Significato Pulito e Preservato</span>
              <p className="text-xs text-slate-900 leading-relaxed font-semibold">
                "{record.trascrizionePulita}"
              </p>
            </div>
          </div>
        </section>
      )}

      {/* RISPOSTA VOCALE BREVE (~30 SECONDI DI ASCOLTO) */}
      {record.rispostaVocale && (
        <section className="bg-sky-50/60 border border-sky-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-sky-950">
                  Risposta Vocale Breve (~30 Secondi)
                </h2>
                <p className="text-[11px] text-slate-500 font-sans">
                  Sintesi parlata per ascolto rapido · Frasi brevi, zero burocrazia
                </p>
              </div>
            </div>

            {/* Controlli Audio Browser TTS */}
            <div className="flex items-center gap-2">
              {isPlayingVoice ? (
                <button
                  type="button"
                  onClick={handlePauseVoice}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  title="Metti in pausa la voce"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pausa</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePlayVoice}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  title="Ascolta la sintesi parlata di 30 secondi"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isPausedVoice ? "Riprendi" : "Ascolta Vocale (~30s)"}</span>
                </button>
              )}

              {(isPlayingVoice || isPausedVoice) && (
                <button
                  type="button"
                  onClick={handleStopVoice}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs transition-colors cursor-pointer shadow-xs font-medium"
                  title="Ferma audio"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </button>
              )}

              <span className="text-[11px] font-mono text-sky-800 bg-sky-100/80 px-2 py-1 rounded-lg border border-sky-200 font-bold">
                ~{record.rispostaVocale.durataStimataSecondi || 30}s
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                1. Situazione
              </span>
              <p className="text-sm text-slate-900 font-semibold leading-relaxed">
                {record.rispostaVocale.situazione}
              </p>
            </div>

            {record.rispostaVocale.puntiSalienti?.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                  2. Punti Rilevanti (Massimo 3)
                </span>
                <ul className="space-y-1.5">
                  {record.rispostaVocale.puntiSalienti.map((punto, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="text-sky-600 font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{punto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-1 p-3.5 rounded-xl bg-teal-50 border border-teal-200">
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-800 font-bold">
                3. Prossimo Passo Immediato
              </span>
              <p className="text-xs sm:text-sm text-slate-900 font-bold leading-relaxed">
                {record.rispostaVocale.prossimoPasso}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Intestazione Versione Scritta Completa */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
        <FileText className="w-3.5 h-3.5 text-slate-500" />
        <span>Risposta Scritta Completa (Versione Autorevole)</span>
      </div>

      {/* ========================================================================= */}
      {/* VISTA MODALITÀ DEPOSITO (ACCOGLIENZA & ORDINE MENTALE SENZA COMPITI FORZATI) */}
      {/* ========================================================================= */}
      {effectiveMode === "deposito" && (
        <div className="space-y-6">
          <section className="bg-amber-50/50 border border-amber-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-start justify-between gap-3 border-b border-amber-200/60 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-amber-700" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-amber-950 font-mono">
                    Deposito Confermato — Presa d'Atto & Ordine Mentale
                  </h2>
                </div>
                <p className="text-xs text-amber-900/80">
                  Questo pensiero è stato archiviato con chiarezza. Jarvis non ha generato compiti né scadenze per proteggere la tua energia.
                </p>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200 shrink-0">
                Zero Compiti Forzati
              </span>
            </div>

            {/* Sintesi Ordinata del Pensiero */}
            <div className="bg-white border border-amber-200/70 rounded-xl p-4 space-y-1.5 shadow-xs">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                Sintesi del Pensiero Depositato
              </span>
              <p className="text-sm text-slate-900 leading-relaxed font-medium">
                {record.deposito?.sintesi || record.sintesi || record.rawInput}
              </p>
            </div>

            {/* Chiavi di Pensiero / Nodi */}
            {record.deposito?.chiaviDiPensiero && record.deposito.chiaviDiPensiero.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                  Nodi / Chiavi di Pensiero
                </span>
                <div className="flex flex-wrap gap-2">
                  {record.deposito.chiaviDiPensiero.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-amber-100/70 border border-amber-200 text-amber-900 text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Annotazione Silenziosa neutrale di Jarvis */}
            {record.deposito?.annotazioneSilenziosa && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 italic">
                {record.deposito.annotazioneSilenziosa}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA MODALITÀ CONSIGLIO (I QUATTRO CONSIGLIERI E SINTESI) */}
      {/* ========================================================================= */}
      {effectiveMode === "consiglio" && record.consiglio ? (
        <div className="space-y-6">
          {/* TEMA DEL CONSIGLIO */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Tema Sottoposto al Consiglio
              </h2>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-normal">
              {record.consiglio.tema}
            </p>
          </section>

          {/* I QUATTRO CONSIGLIERI PERMANENTI (Griglia 2x2) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Discussione Strutturata dei Quattro Consiglieri
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Quattro prospettive permanenti
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. PRAGMATICO */}
              <div className="bg-sky-50/50 border border-sky-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-2 border-b border-sky-100 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-sky-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900">
                        1. Pragmatico
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Obiettivo: Risultato nel modo più semplice ed efficace.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-sky-700 bg-sky-100 px-2 py-0.5 rounded font-bold shrink-0">
                    Fattibilità & Rapidità
                  </span>
                </div>

                <ul className="space-y-2">
                  {record.consiglio.consiglieri?.pragmatico?.map((punto, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-800">
                      <span className="text-sky-600 font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{punto}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 2. ECONOMO */}
              <div className="bg-emerald-50/50 border border-emerald-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-2 border-b border-emerald-100 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                        2. Economo
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Obiettivo: Proteggere risorse economiche, tempo ed energia.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold shrink-0">
                    Costi & Efficienza
                  </span>
                </div>

                <ul className="space-y-2">
                  {record.consiglio.consiglieri?.economo?.map((punto, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-800">
                      <span className="text-emerald-600 font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{punto}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. SCETTICO */}
              <div className="bg-rose-50/50 border border-rose-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-2 border-b border-rose-100 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                        3. Scettico
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Obiettivo: Individuare punti deboli, ipotesi non dimostrate e rischi.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded font-bold shrink-0">
                    Punti Ciechi & Rischi
                  </span>
                </div>

                <ul className="space-y-2">
                  {record.consiglio.consiglieri?.scettico?.map((punto, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-800">
                      <span className="text-rose-600 font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{punto}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4. SERENA DEL FUTURO */}
              <div className="bg-indigo-50/50 border border-indigo-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-2 border-b border-indigo-100 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                        4. Serena del Futuro
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Obiettivo: Valutare l'impatto della scelta tra 6-12 mesi.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-bold shrink-0">
                    Orizzonte 6-12 mesi
                  </span>
                </div>

                <ul className="space-y-2">
                  {record.consiglio.consiglieri?.serenaDelFuturo?.map((punto, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-800">
                      <span className="text-indigo-600 font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{punto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* SINTESI DEL CONSIGLIO */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Sintesi del Consiglio
              </h2>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-normal">
              {record.consiglio.sintesiConsiglio}
            </p>
          </section>

          {/* PUNTI DI ACCORDO & PUNTI DI DISACCORDO (2 Colonne) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PUNTI DI ACCORDO */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  Punti di Accordo
                </h3>
              </div>
              {record.consiglio.puntiAccordo?.length > 0 ? (
                <ul className="space-y-2">
                  {record.consiglio.puntiAccordo.map((punto, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-800">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span className="leading-relaxed">{punto}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">Nessun punto di convergenza totale registrato.</p>
              )}
            </div>

            {/* PUNTI DI DISACCORDO */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  Punti di Disaccordo
                </h3>
              </div>
              {record.consiglio.puntiDisaccordo?.length > 0 ? (
                <ul className="space-y-2">
                  {record.consiglio.puntiDisaccordo.map((punto, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-800">
                      <span className="text-amber-600 font-bold">•</span>
                      <span className="leading-relaxed">{punto}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">Nessuna divergenza inconciliabile rilevata.</p>
              )}
            </div>
          </div>

          {/* VERDETTO PROVVISORIO (Espresso da Jarvis) */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-2 text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Verdetto Provvisorio (Jarvis)
              </h2>
            </div>
            <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {record.consiglio.verdettoProvvisorio}
            </p>
            <div className="text-[11px] text-slate-400 pt-1">
              Espresso da Jarvis come sintesi logica del confronto tra i consiglieri. Non si sostituisce alla tua decisione finale.
            </div>
          </section>

          {/* PROSSIMO PASSO */}
          <section
            className={`rounded-2xl border p-5 transition-colors shadow-xs ${
              record.consiglio.prossimoPasso?.completato
                ? "bg-slate-50 border-emerald-300"
                : "bg-white border-slate-200/90"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    record.consiglio.prossimoPasso?.completato ? "bg-emerald-500" : "bg-sky-500"
                  }`}
                />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Prossimo Passo
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Azione per procedere
              </span>
            </div>

            <div className="space-y-3">
              <p
                className={`text-sm sm:text-base font-bold ${
                  record.consiglio.prossimoPasso?.completato
                    ? "line-through text-slate-400"
                    : "text-slate-900"
                }`}
              >
                {record.consiglio.prossimoPasso?.azione}
              </p>

              <div>
                <button
                  type="button"
                  onClick={handleToggleConsiglioPasso}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs ${
                    record.consiglio.prossimoPasso?.completato
                      ? "bg-emerald-100 border border-emerald-300 text-emerald-800"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {record.consiglio.prossimoPasso?.completato ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Passo eseguito</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-3.5 h-3.5 text-slate-300" />
                      <span>Segna come eseguito</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : effectiveMode === "decisione" && record.decisione ? (
        <div className="space-y-6">
          {/* 1. SITUAZIONE */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Situazione
              </h2>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-normal">
              {record.decisione.situazione}
            </p>
          </section>

          {/* 2. VERIFICA PRELIMINARE: SOLUZIONE A COSTO ZERO O MINIMO */}
          <section className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 sm:p-6 space-y-2.5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  Soluzione Alternativa a Costo Zero o Minimo
                </h2>
              </div>
              <span className="text-[11px] text-emerald-700 font-mono font-bold">
                Verifica preliminare prima della spesa
              </span>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-medium">
              {record.decisione.soluzioneAlternativaEconomica || "Nessuna alternativa a costo zero praticabile rilevata."}
            </p>
          </section>

          {/* 3. VERDETTO PROVVISORIO */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-2 text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Verdetto Provvisorio
              </h2>
            </div>
            <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {record.decisione.verdettoProvvisorio}
            </p>
            <div className="text-[11px] text-slate-400 pt-1">
              Conclusione pragmatica basata sui dati disponibili e sull'alternativa economica. Non si sostituisce alla tua decisione finale.
            </div>
          </section>

          {/* 3. PROSSIMO PASSO */}
          <section
            className={`rounded-2xl border p-5 transition-colors shadow-xs ${
              record.decisione.prossimoPasso?.completato
                ? "bg-slate-50 border-emerald-300"
                : "bg-white border-slate-200/90"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    record.decisione.prossimoPasso?.completato ? "bg-emerald-500" : "bg-sky-500"
                  }`}
                />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Prossimo Passo
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Azione per sciogliere il nodo
              </span>
            </div>

            <div className="space-y-3">
              <p
                className={`text-sm sm:text-base font-bold ${
                  record.decisione.prossimoPasso?.completato
                    ? "line-through text-slate-400"
                    : "text-slate-900"
                }`}
              >
                {record.decisione.prossimoPasso?.azione}
              </p>

              <div>
                <button
                  type="button"
                  onClick={handleToggleProssimoPasso}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs ${
                    record.decisione.prossimoPasso?.completato
                      ? "bg-emerald-100 border border-emerald-300 text-emerald-800"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {record.decisione.prossimoPasso?.completato ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Passo eseguito</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-3.5 h-3.5 text-slate-300" />
                      <span>Segna come eseguito</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* 4. VANTAGGI & SVANTAGGI (Griglia a 2 colonne) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* VANTAGGI */}
            <section className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  Vantaggi (Max 5)
                </h2>
              </div>

              {record.decisione.vantaggi && record.decisione.vantaggi.length > 0 ? (
                <ul className="space-y-2">
                  {record.decisione.vantaggi.map((v, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-800">
                      <span className="text-emerald-600 font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{v}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">Nessun vantaggio tangibile rilevato.</p>
              )}
            </section>

            {/* SVANTAGGI */}
            <section className="bg-rose-50/40 border border-rose-200/80 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                  Svantaggi (Max 5)
                </h2>
              </div>

              {record.decisione.svantaggi && record.decisione.svantaggi.length > 0 ? (
                <ul className="space-y-2">
                  {record.decisione.svantaggi.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-800">
                      <span className="text-rose-600 font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">Nessuno svantaggio significativo rilevato.</p>
              )}
            </section>
          </div>

          {/* 5. COSTI REALI (4 Quadranti) */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Costi Reali
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                  <span>Denaro</span>
                </div>
                <p className="text-xs text-slate-900 leading-relaxed font-mono font-medium">
                  {record.decisione.costiReali?.denaro || "Non specificato"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tempo</span>
                </div>
                <p className="text-xs text-slate-900 leading-relaxed font-mono font-medium">
                  {record.decisione.costiReali?.tempo || "Non specificato"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Energia Mentale</span>
                </div>
                <p className="text-xs text-slate-900 leading-relaxed font-mono font-medium">
                  {record.decisione.costiReali?.energiaMentale || "Non specificata"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Boxes className="w-3.5 h-3.5 text-slate-500" />
                  <span>Complessità Logistica</span>
                </div>
                <p className="text-xs text-slate-900 leading-relaxed font-mono font-medium">
                  {record.decisione.costiReali?.complessitaLogistica || "Non specificata"}
                </p>
              </div>
            </div>
          </section>

          {/* 6. RISCHIO DI PENTIMENTO */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Rischio di Pentimento
                </h2>
              </div>
              <span
                className={`text-xs font-mono uppercase font-bold px-2 py-0.5 rounded ${
                  record.decisione.rischioPentimento?.livello === "basso"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : record.decisione.rischioPentimento?.livello === "alto"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                Livello: {record.decisione.rischioPentimento?.livello}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {record.decisione.rischioPentimento?.motivazione}
            </p>
          </section>

          {/* 7. DATI MANCANTI E INDISPENSABILI (se presenti) */}
          {record.decisione.datiMancanti && (
            <section className="bg-sky-50 border border-sky-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <QuestionIcon className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900">
                    Dati Mancanti da Raccogliere
                  </h3>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">
                    {record.decisione.datiMancanti}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VISTA MODALITÀ ORGANIZZAZIONE (5 Sezioni Classiche) */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* 1. HERO FOCUS: PROSSIMO BABY STEP */}
          {record.babyStep && (
            <section
              className={`rounded-2xl border-2 p-5 sm:p-6 transition-all shadow-xs ${
                record.babyStep.completato
                  ? "bg-slate-50 border-emerald-300"
                  : "bg-white border-teal-500/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      record.babyStep.completato ? "bg-emerald-500" : "bg-teal-500"
                    }`}
                  />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Prossimo Baby Step (5-10 Min)
                  </h2>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono text-slate-500 tabular-nums">
                  {record.babyStep.tempistica && (
                    <>
                      <span className="text-slate-700 font-semibold">
                        {record.babyStep.tempistica}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span>Tempo: <strong className="text-teal-700 font-bold">{record.babyStep.durataStimata || "5-10 min"}</strong></span>
                </div>
              </div>

              <div className="space-y-3">
                <p
                  className={`text-base sm:text-lg font-bold leading-snug ${
                    record.babyStep.completato
                      ? "line-through text-slate-400"
                      : "text-slate-900"
                  }`}
                >
                  {record.babyStep.azione}
                </p>

                <div className="text-xs sm:text-sm text-slate-600 leading-relaxed border-l-2 border-teal-400 pl-3">
                  <span className="text-slate-800 font-semibold">Perché partire da qui:</span>{" "}
                  {record.babyStep.motivo}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleToggleBabyStep}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs ${
                      record.babyStep.completato
                        ? "bg-emerald-100 border border-emerald-300 text-emerald-800 hover:bg-emerald-200"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    {record.babyStep.completato ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Completato con successo</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 text-slate-300" />
                        <span>Segna come completato</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 2. SINTESI */}
          {record.sintesi && (
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Sintesi della Situazione
                </h2>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed font-normal">
                {record.sintesi}
              </p>
            </section>
          )}

          {/* 3. AZIONI DA FARE (Massimo 3 Priorità) */}
          {record.azioni && (
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Azioni da Fare (Priorità Selezionate)
                  </h2>
                </div>
                <div className="text-xs font-mono text-slate-500 tabular-nums font-semibold">
                  {completedActionsCount} di {record.azioni.length} completate
                </div>
              </div>

              {record.azioni.length > 0 ? (
                <div className="space-y-3">
                  {record.azioni.map((azione, index) => (
                    <div
                      key={azione.id || index}
                      onClick={() => handleToggleAction(azione.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                        azione.completata
                          ? "bg-slate-50 border-slate-200/60 opacity-60"
                          : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/80"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {azione.completata ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-mono text-slate-400 tabular-nums font-bold">
                            {index + 1}.
                          </span>
                          <span
                            className={`text-sm leading-snug font-semibold ${
                              azione.completata
                                ? "line-through text-slate-400"
                                : "text-slate-900"
                            }`}
                          >
                            {azione.testo}
                          </span>
                        </div>

                        {/* Metadati non-pill */}
                        <div className="flex items-center gap-2 text-xs text-amber-700/90 font-mono font-medium">
                          <span>Energia: {azione.energiaRichiesta}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{azione.tipo}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nessuna azione prioritaria necessaria: il quadro attuale non richiede interventi attivi.
                </p>
              )}
            </section>
          )}

          {/* Griglia a 2 colonne per SCADENZE e CRITICITÀ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 4. SCADENZE */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Scadenze
                </h2>
              </div>

              {record.scadenze && record.scadenze.length > 0 ? (
                <div className="space-y-2.5">
                  {record.scadenze.map((scadenza, idx) => (
                    <div
                      key={scadenza.id || idx}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-bold text-rose-600 font-mono">
                          {scadenza.termine}
                        </span>
                        {scadenza.vincolante && (
                          <span className="text-[10px] bg-slate-900 text-white font-mono px-2 py-0.5 rounded font-bold uppercase">
                            Vincolante
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">{scadenza.oggetto}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-400 italic">
                  {record.scadenzaNote || "Nessuna scadenza vincolante rilevata."}
                </div>
              )}
            </section>

            {/* 5. CRITICITÀ */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Criticità & Risoluzioni
                </h2>
              </div>

              {record.criticita && record.criticita.length > 0 ? (
                <div className="space-y-2.5">
                  {record.criticita.map((crit, idx) => (
                    <div
                      key={crit.id || idx}
                      onClick={() => handleToggleCriticita(crit.id)}
                      className={`p-3.5 rounded-xl border transition-colors cursor-pointer space-y-1.5 ${
                        crit.risolta
                          ? "bg-slate-50 border-slate-200 opacity-60"
                          : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-bold text-slate-900">
                          Ostacolo: {crit.ostacolo}
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          crit.risolta ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {crit.risolta ? "Risolto" : "Attivo"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 flex items-start gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-slate-900 font-semibold">Soluzione:</strong>{" "}
                          {crit.soluzionePragmatica}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-400 italic">
                  Nessuna criticità o blocco logistico rilevato.
                </div>
              )}
            </section>
          </div>

          {/* 6. CHIARIMENTO INDISPENSABILE (se presente) */}
          {record.domandaIndispensabile && (
            <section className="bg-sky-50 border border-sky-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900">
                    Chiarimento Indispensabile
                  </h3>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">
                    {record.domandaIndispensabile}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* SEZIONE INFORMAZIONI DA RICERCA WEB & FONTI UFFICIALI */}
      {((record.decisione?.fontiWeb && record.decisione.fontiWeb.length > 0) ||
        (record.fontiWeb && record.fontiWeb.length > 0)) && (
        <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Informazioni da Ricerca Web & Fonti Ufficiali
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Fatti verificati distinti da opinioni
            </span>
          </div>

          <div className="space-y-2.5">
            {((record.decisione?.fontiWeb && record.decisione.fontiWeb.length > 0)
              ? record.decisione.fontiWeb
              : record.fontiWeb || []
            ).map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        item.tipo === "fatto_verificato"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {item.tipo === "fatto_verificato" ? "Fatto Verificato" : "Opinione / Parere"}
                    </span>
                    {item.ufficiale && (
                      <span className="text-[10px] font-mono text-sky-700 bg-sky-100 px-2 py-0.5 rounded font-bold">
                        Fonte Ufficiale
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-500">{item.fonte}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {item.dettaglio}
                </p>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 pt-1">
            Dati ricavati dal web a supporto oggettivo. Non sostituiscono il ragionamento analitico di Jarvis.
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SEZIONE REPLICA E INTEGRAZIONE PROGETTO STEP BY STEP                     */}
      {/* ========================================================================= */}
      <section className="bg-white border-2 border-sky-500/50 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <MessageSquarePlus className="w-5 h-5 text-sky-600" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wider">
                Replica & Integra Progetto (Step by Step)
              </h3>
              <p className="text-xs text-sky-800 font-mono">
                Amplia il dossier senza ripartire da zero
              </p>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono self-start sm:self-auto">
            Mantiene il contesto attivo
          </span>
        </div>

        {/* Storico Repliche Precedenti (se presenti) */}
        {record.repliche && record.repliche.length > 0 && (
          <div className="space-y-2.5 pt-1 pb-2">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CornerDownRight className="w-3.5 h-3.5 text-sky-600" />
              <span>Avanzamento del Progetto ({record.repliche.length} {record.repliche.length === 1 ? "replica" : "repliche"})</span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {record.repliche.map((rep, idx) => (
                <div key={rep.id || idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="text-sky-700 font-bold">Step {idx + 1}</span>
                    <span>{rep.timestamp}</span>
                  </div>
                  <div className="text-slate-900 font-semibold">
                    <span className="text-slate-500 font-mono text-[10px] uppercase mr-1">Serena:</span>
                    "{rep.richiesta}"
                  </div>
                  {rep.nuovoBabyStep && (
                    <div className="text-teal-800 text-[11px] flex items-center gap-1.5 pt-1.5 border-t border-slate-200/80 font-mono font-bold">
                      <ArrowRight className="w-3 h-3 shrink-0 text-teal-600" />
                      <span>Baby Step sbloccato: {rep.nuovoBabyStep}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modulo di Invio Replica */}
        <form onSubmit={handleSubmitReplica} className="space-y-3 pt-1">
          {/* Quick chips per replica veloce */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickChip("Ho completato il baby step: qual è il prossimo passo pratico?")}
              className="text-[11px] px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg transition-colors cursor-pointer font-medium"
            >
              + Baby step completato, prossimo?
            </button>
            <button
              type="button"
              onClick={() => handleQuickChip("Si è aggiunto un imprevisto da integrare:")}
              className="text-[11px] px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-colors cursor-pointer font-medium"
            >
              + Nuovo imprevisto
            </button>
            <button
              type="button"
              onClick={() => handleQuickChip("Ci sono nuovi costi o vincoli di tempo:")}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer font-medium"
            >
              + Nuovi costi/orari
            </button>
          </div>

          <div className="relative">
            <textarea
              value={replicaInput}
              onChange={(e) => setReplicaInput(e.target.value)}
              disabled={isReplicating || localIsReplicating}
              placeholder="Scrivi qui la tua replica o integrazione (es: ho sentito il tecnico, ho comprato i biglietti, c'è un cambio di programma...)"
              rows={3}
              className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl p-3.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 leading-relaxed outline-none transition resize-y shadow-xs"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              Aggiorna Baby Step e priorità conservando il dossier.
            </span>
            <button
              type="submit"
              disabled={!replicaInput.trim() || isReplicating || localIsReplicating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {isReplicating || localIsReplicating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Elaborazione replica in corso...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Invia Replica & Integra Piano</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
