import React from "react";
import { History, PlusCircle, ShieldCheck, LayoutDashboard, Sparkles, ClipboardCheck, BookOpen, Cloud, CloudOff, RefreshCw, Brain } from "lucide-react";
import { SyncStatus } from "../types";

interface HeaderProps {
  activeTab: "dashboard" | "analisi" | "memoria";
  onTabChange: (tab: "dashboard" | "analisi" | "memoria") => void;
  historyCount: number;
  onOpenHistory: () => void;
  onNewAnalysis: () => void;
  salvataggioAutomatico: boolean;
  onOpenSurvey?: () => void;
  completedChecksCount?: number;
  onOpenBrochure?: () => void;
  syncStatus?: SyncStatus;
  lastSyncedAt?: string;
  onTriggerSync?: () => void;
  pendingHypothesesCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  historyCount,
  onOpenHistory,
  onNewAnalysis,
  salvataggioAutomatico,
  onOpenSurvey,
  completedChecksCount = 0,
  onOpenBrochure,
  syncStatus = "unconfigured",
  lastSyncedAt,
  onTriggerSync,
  pendingHypothesesCount = 0,
}) => {
  return (
    <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-6 py-2.5 sm:py-3 shadow-xs">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-xs shadow-sky-500/50" aria-hidden="true" />
          <div className="flex items-baseline gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 uppercase">
              Jarvis
            </h1>
            <span className="text-xs text-slate-500 font-normal hidden sm:inline">
              Cabina di Regia Personale
            </span>
          </div>
          <span className="text-slate-300 hidden md:inline" aria-hidden="true">·</span>
          <span className="text-xs text-slate-600 font-medium hidden md:inline">
            Serena Sampieri
          </span>
        </div>

        {/* Tab di Navigazione Principale: DASHBOARD vs ANALISI vs MEMORIA */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80">
          <button
            onClick={() => onTabChange("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-sky-600" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onTabChange("analisi")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "analisi"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Analisi / Voce</span>
          </button>

          <button
            onClick={() => onTabChange("memoria")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer relative ${
              activeTab === "memoria"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span>Memoria</span>
            {pendingHypothesesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title={`${pendingHypothesesCount} ipotesi in attesa di validazione`} />
            )}
          </button>
        </div>

        {/* Metadati e Azioni Laterali */}
        <div className="flex items-center gap-2 text-xs">
          {onOpenSurvey && (
            <button
              onClick={onOpenSurvey}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-sky-200/90 hover:border-sky-300 bg-sky-50/70 hover:bg-sky-100/70 text-sky-800 transition-all cursor-pointer font-semibold shadow-xs"
              title="Protocollo personale di collaudo (7 giorni): Jarvis, secondo cervello virtuale di Serena"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Collaudo (7gg)</span>
              <span className="sm:hidden">Collaudo</span>
              <span className="font-mono text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded border border-sky-200">
                {completedChecksCount}/7
              </span>
            </button>
          )}

          {onOpenBrochure && (
            <button
              onClick={onOpenBrochure}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200/90 hover:border-indigo-300 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-800 transition-all cursor-pointer font-semibold shadow-xs"
              title="Apri la Brochure Ufficiale di Jarvis"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Brochure</span>
            </button>
          )}

          <button
            onClick={onNewAnalysis}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors cursor-pointer shadow-xs"
            title="Avvia una nuova sessione di scomposizione"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Nuova</span>
          </button>

          {/* Indicatore Silenzioso di Sincronizzazione Google Drive (Fase 3) */}
          <button
            type="button"
            onClick={onTriggerSync || onOpenHistory}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-xs ${
              syncStatus === "synced"
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80"
                : syncStatus === "syncing"
                ? "bg-amber-50/80 border-amber-200 text-amber-800"
                : syncStatus === "error"
                ? "bg-rose-50/80 border-rose-200 text-rose-800 hover:bg-rose-100/80"
                : "bg-slate-50 border-slate-200/80 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
            title={
              syncStatus === "synced"
                ? `Sincronizzato con Google Drive appDataFolder (Ultimo allineamento: ${lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "N/D"}). Clicca per sincronizzare ora.`
                : syncStatus === "syncing"
                ? "Sincronizzazione in corso..."
                : syncStatus === "error"
                ? "Errore sincronizzazione. Clicca per riprovare."
                : "Sync Google Drive non attivo (Archiviazione 100% locale). Clicca per configurare."
            }
          >
            {syncStatus === "syncing" ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            ) : syncStatus === "synced" ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            ) : syncStatus === "error" ? (
              <CloudOff className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden md:inline font-medium text-[11px]">
              {syncStatus === "synced"
                ? `Sync: ${lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "OK"}`
                : syncStatus === "syncing"
                ? "Sync..."
                : syncStatus === "error"
                ? "Sync Errore"
                : "Locale"}
            </span>
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-xs"
            title="Apri registro storico e impostazioni"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium hidden sm:inline">Cronologia</span>
            <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/80">
              {historyCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
