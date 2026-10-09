import React, { useState, useEffect } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  RotateCcw,
  CheckCircle2,
  X,
  Sparkles,
  Target,
  Zap,
  Clock,
  Film,
  FileText,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { JarvisDailyBriefing } from "../types";
import {
  isSpeechSynthesisAvailable,
  speakBriefing,
  pauseSpeech,
  resumeSpeech,
  stopSpeech,
} from "../utils/briefingVoice";

interface DailyBriefingCardProps {
  briefing: JarvisDailyBriefing;
  onClose: () => void;
  onRefresh: () => void;
  onCompleteBabyStep?: (babyStep: JarvisDailyBriefing["babyStep"]) => void;
}

export const DailyBriefingCard: React.FC<DailyBriefingCardProps> = ({
  briefing,
  onClose,
  onRefresh,
  onCompleteBabyStep,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [babyStepDone, setBabyStepDone] = useState(briefing.babyStep?.completato || false);

  const speechSupported = isSpeechSynthesisAvailable();

  useEffect(() => {
    // Interrompi audio se la card si smonta o se cambia briefing
    return () => {
      stopSpeech();
    };
  }, [briefing.id]);

  const handlePlayAudio = () => {
    if (!speechSupported) return;

    if (isPaused) {
      resumeSpeech();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    setIsPlaying(true);
    setIsPaused(false);

    speakBriefing(briefing.testoParlatoCompleto, {
      onStart: () => {
        setIsPlaying(true);
        setIsPaused(false);
      },
      onEnd: () => {
        setIsPlaying(false);
        setIsPaused(false);
      },
      onError: (err) => {
        console.warn("Speech synthesis notice:", err);
        setIsPlaying(false);
        setIsPaused(false);
      },
      onPause: () => {
        setIsPaused(true);
        setIsPlaying(false);
      },
      onResume: () => {
        setIsPlaying(true);
        setIsPaused(false);
      },
    });
  };

  const handlePauseAudio = () => {
    pauseSpeech();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStopAudio = () => {
    stopSpeech();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleToggleBabyStep = () => {
    if (!briefing.babyStep) return;
    const nextState = !babyStepDone;
    setBabyStepDone(nextState);
    if (onCompleteBabyStep) {
      onCompleteBabyStep({
        ...briefing.babyStep,
        completato: nextState,
      });
    }
  };

  return (
    <div className="bg-white border-2 border-slate-900/90 rounded-2xl p-5 sm:p-6 shadow-md space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Testata Briefing PULL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 text-amber-400 shrink-0 shadow-xs">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                Punto Essenziale di Oggi
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wider">
                Su Richiesta (PULL)
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Zero prediche, 1 sola priorità reale e 1 baby step da 5-10 minuti
            </p>
          </div>
        </div>

        {/* Controlli Audio & Chiusura */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {speechSupported && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              {!isPlaying ? (
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs shadow-xs transition-all cursor-pointer min-h-[36px]"
                  title="Ascolta il briefing sintetizzato dalla voce di Jarvis"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-sky-600" />
                  <span>{isPaused ? "Riprendi" : "Ascolta"}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ~{briefing.durataStimataSecondi}s
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePauseAudio}
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
                    title="Metti in pausa la voce"
                  >
                    <Pause className="w-4 h-4 text-amber-600" />
                  </button>
                  <button
                    type="button"
                    onClick={handleStopAudio}
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
                    title="Interrompi audio"
                  >
                    <Square className="w-4 h-4 text-rose-600 fill-current" />
                  </button>
                  <span className="inline-flex items-center gap-1 px-2 text-[11px] font-semibold text-sky-700 animate-pulse">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>In riproduzione</span>
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Rigenera il punto essenziale da zero"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-700 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Chiudi pannello briefing"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Griglia dei 3 Pilastri Operativi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Pilastro 1: Priorità Reale */}
        <div className="bg-sky-50/70 border border-sky-200/90 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-sky-600" />
              1 Priorità Reale
            </span>
            {briefing.prioritaReale && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white text-sky-800 border border-sky-200 font-bold">
                {briefing.prioritaReale.origine}
              </span>
            )}
          </div>
          {briefing.prioritaReale ? (
            <div className="text-sm font-bold text-slate-900 leading-snug">
              {briefing.prioritaReale.titolo}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Nessuna priorità aperta. Tutte le attività registrate sono concluse.
            </p>
          )}
        </div>

        {/* Pilastro 2: Baby Step Concreto */}
        <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              Baby Step (5-10 min)
            </span>
            {briefing.babyStep?.durataStimata && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white text-emerald-800 border border-emerald-200 font-bold">
                {briefing.babyStep.durataStimata}
              </span>
            )}
          </div>
          {briefing.babyStep ? (
            <div className="space-y-2">
              <div
                className={`text-sm font-bold leading-snug transition-all ${
                  babyStepDone ? "line-through text-slate-400" : "text-slate-900"
                }`}
              >
                {briefing.babyStep.azione}
              </div>
              <button
                type="button"
                onClick={handleToggleBabyStep}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px] ${
                  babyStepDone
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{babyStepDone ? "Completato! ✓" : "Segna come Fatto"}</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Nessun baby step in sospeso.
            </p>
          )}
        </div>

        {/* Pilastro 3: Vincoli Oggettivi */}
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Vincoli Oggettivi (24-48h)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white text-amber-800 border border-amber-200 font-bold">
              {briefing.vincoliOggettivi.length} attivi
            </span>
          </div>
          {briefing.vincoliOggettivi.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-slate-800">
              {briefing.vincoliOggettivi.map((v) => (
                <li key={v.id} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span>
                    <strong>{v.oggetto || "Scadenza"}:</strong> {v.termine}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-600 italic">
              Nessun vincolo inderogabile nelle prossime 24-48 ore.
            </p>
          )}
        </div>
      </div>

      {/* Box Regia Pragmatica René Ferretti */}
      <div className="bg-slate-900 text-white rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎬</span>
          <div>
            <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider font-bold">
              Regia Pragmatica Serena · Zero Ansia
            </div>
            <div className="text-sm font-semibold text-slate-100 italic mt-0.5">
              "{briefing.messaggioPragmatico}"
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowFullText(!showFullText)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{showFullText ? "Nascondi testo" : "Leggi trascrizione"}</span>
          {showFullText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Trascrizione parlata completa a scomparsa */}
      {showFullText && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed font-sans space-y-2 animate-in fade-in">
          <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-sky-600" />
            Trascrizione vocale inviata alla sintesi audio:
          </div>
          <p className="italic bg-white p-3 rounded-lg border border-slate-200/80">
            "{briefing.testoParlatoCompleto}"
          </p>
          {briefing.contestoMemoria && briefing.contestoMemoria.length > 0 && (
            <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Memoria applicata: {briefing.contestoMemoria.join("; ")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
