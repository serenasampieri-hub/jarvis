import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Trash2,
  Search,
  ExternalLink,
  ShieldCheck,
  Check,
  Clock,
  AlertTriangle,
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ShieldAlert,
  HardDrive,
  FileCheck,
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
} from "lucide-react";
import { AnalysisRecord, JarvisSettings, DryRunValidationResult } from "../types";
import {
  createBackupEnvelope,
  validateBackupDryRun,
  executeSafeRestore,
  getLatestSafetySnapshot,
  restoreSafetySnapshot,
  APP_VERSION,
} from "../utils/storage";
import { getStorageFootprintReport, StorageQuotaReport } from "../utils/storageQuota";
import { setGoogleAccessToken, getGoogleAccessToken } from "../utils/syncEngine";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: AnalysisRecord[];
  onSelectRecord: (record: AnalysisRecord) => void;
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  settings: JarvisSettings;
  onUpdateSettings: (settings: JarvisSettings) => void;
  onReloadData?: () => void;
  isSyncing?: boolean;
  onTriggerSync?: () => Promise<void>;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectRecord,
  onDeleteRecord,
  onClearAll,
  settings,
  onUpdateSettings,
  onReloadData,
  isSyncing = false,
  onTriggerSync,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunValidationResult | null>(null);
  const [dryRunFilename, setDryRunFilename] = useState<string>("");
  const [restoreFeedback, setRestoreFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
    statsText?: string;
  } | null>(null);
  const [hasSafetySnapshot, setHasSafetySnapshot] = useState<boolean>(
    () => Boolean(getLatestSafetySnapshot())
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [quotaReport, setQuotaReport] = useState<StorageQuotaReport | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [showTokenSettings, setShowTokenSettings] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [hasToken, setHasToken] = useState(() => Boolean(getGoogleAccessToken()));

  useEffect(() => {
    if (isOpen) {
      getStorageFootprintReport().then(setQuotaReport).catch(() => {});
    }
  }, [isOpen, history]);

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.rawInput.toLowerCase().includes(term) ||
      (item.trascrizionePulita && item.trascrizionePulita.toLowerCase().includes(term)) ||
      (item.rispostaVocale && (
        item.rispostaVocale.situazione.toLowerCase().includes(term) ||
        item.rispostaVocale.testoParlatoCompleto.toLowerCase().includes(term) ||
        item.rispostaVocale.prossimoPasso.toLowerCase().includes(term)
      )) ||
      (item.sintesi && item.sintesi.toLowerCase().includes(term)) ||
      (item.babyStep && item.babyStep.azione.toLowerCase().includes(term)) ||
      (item.decisione && (
        item.decisione.situazione.toLowerCase().includes(term) ||
        item.decisione.verdettoProvvisorio.toLowerCase().includes(term) ||
        item.decisione.prossimoPasso?.azione.toLowerCase().includes(term)
      )) ||
      (item.consiglio && (
        item.consiglio.tema.toLowerCase().includes(term) ||
        item.consiglio.sintesiConsiglio.toLowerCase().includes(term) ||
        item.consiglio.verdettoProvvisorio.toLowerCase().includes(term) ||
        item.consiglio.prossimoPasso?.azione.toLowerCase().includes(term)
      ))
    );
  });

  const handleToggleAutoSave = () => {
    onUpdateSettings({
      ...settings,
      salvataggioAutomatico: !settings.salvataggioAutomatico,
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    setRestoreFeedback(null);
    try {
      const { filename, jsonString, envelope } = await createBackupEnvelope();
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setRestoreFeedback({
        type: "success",
        message: `Backup ${filename} esportato con successo.`,
        statsText: `Contenuto: ${envelope.stats.totalRecords} analisi, ${envelope.stats.openTasks} compiti aperti. Hash SHA-256: ${envelope.sha256Checksum.slice(0, 16)}...`,
      });
    } catch (err: any) {
      setRestoreFeedback({
        type: "error",
        message: `Errore durante l'esportazione: ${err?.message || "Impossibile generare il backup"}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreFeedback(null);
    setDryRunResult(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setDryRunFilename(file.name);

    if (!file.name.toLowerCase().endsWith(".json")) {
      setRestoreFeedback({
        type: "error",
        message: "Estensione file non valida. È richiesto un file con estensione .json.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const text = await file.text();
      // Esecuzione DRY RUN: convalida senza toccare localStorage
      const result = await validateBackupDryRun(text);
      setDryRunResult(result);
      if (!result.isValid) {
        setRestoreFeedback({
          type: "error",
          message: "Il file selezionato non è conforme o contiene errori.",
        });
      }
    } catch (err: any) {
      setRestoreFeedback({
        type: "error",
        message: `Errore durante la lettura del file: ${err?.message || "File illeggibile"}`,
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmRestore = async () => {
    if (!dryRunResult || !dryRunResult.envelope) return;

    const outcome = await executeSafeRestore(dryRunResult.envelope);
    if (outcome.success) {
      setHasSafetySnapshot(true);
      setRestoreFeedback({
        type: "success",
        message: "Ripristino transazionale completato con successo.",
        statsText: `Ripristinati: ${outcome.stats?.totalRecords || 0} analisi, ${outcome.stats?.openTasks || 0} compiti aperti. Snapshot di sicurezza creato: ${outcome.safetySnapshotTimestamp?.slice(11, 19)}.`,
      });
      setDryRunResult(null);
      if (onReloadData) onReloadData();
    } else {
      setRestoreFeedback({
        type: "error",
        message: outcome.error || "Errore durante il ripristino. Eseguito rollback automatico.",
      });
    }
  };

  const handleRollback = () => {
    const outcome = restoreSafetySnapshot();
    if (outcome.success) {
      setRestoreFeedback({
        type: "info",
        message: "Rollback completato: ripristinato lo stato precedente allo snapshot di sicurezza.",
      });
      setDryRunResult(null);
      if (onReloadData) onReloadData();
    } else {
      setRestoreFeedback({
        type: "error",
        message: outcome.error || "Impossibile eseguire il rollback.",
      });
    }
  };

  const handleClearAllWithConfirm = () => {
    if (confirmClear) {
      onClearAll();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  };

  const handleSaveToken = () => {
    const trimmed = tokenInput.trim();
    if (trimmed) {
      setGoogleAccessToken(trimmed);
      setHasToken(true);
      setTokenInput("");
      setSyncFeedback({
        type: "success",
        message: "Token Google OAuth registrato in memoria volatile.",
      });
      setTimeout(() => setSyncFeedback(null), 4000);
    } else {
      setGoogleAccessToken(null);
      setHasToken(false);
      setSyncFeedback({
        type: "info",
        message: "Token rimosso dalla memoria di sessione.",
      });
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleSyncClick = async () => {
    if (!onTriggerSync) return;
    setSyncFeedback(null);
    try {
      await onTriggerSync();
      setHasToken(Boolean(getGoogleAccessToken()));
      if (onReloadData) onReloadData();
    } catch (err: any) {
      setSyncFeedback({
        type: "error",
        message: err?.message || "Errore durante la sincronizzazione.",
      });
    }
  };

  const handleToggleAutoSync = () => {
    onUpdateSettings({
      ...settings,
      autoSyncOnStartup: !settings.autoSyncOnStartup,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-lg bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header Drawer */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold tracking-wide text-slate-900 uppercase">
              Registro Storico & Riservatezza
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Dati memorizzati esclusivamente in questo browser
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Chiudi pannello"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sezione Impostazioni Riservatezza & Sovranità Dati */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-800">
                Salvataggio automatico locale
              </div>
              <div className="text-[11px] text-slate-500">
                Memorizza le analisi nel browser per consultarle in seguito.
              </div>
            </div>
            <button
              onClick={handleToggleAutoSave}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.salvataggioAutomatico ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  settings.salvataggioAutomatico ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {settings.syncStatus === "synced"
                ? "Sincronizzazione attiva: solo Google Drive personale (appDataFolder, zero database terzi)."
                : "Archiviazione sovrana: 100% locale, nessun server esterno o database condiviso collegato."}
            </span>
          </div>

          {/* Sezione Sovranità Dati: Backup & Ripristino con Dry Run (Step 1) */}
          <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-sky-600" />
                <span>Sovranità Dati & Quote</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-normal">v{APP_VERSION}</span>
            </div>

            {/* Monitoraggio Trasparente Impronta & Quota Storage (Fase 2) */}
            {quotaReport && (
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-semibold flex items-center gap-1">
                    <Database className="w-3 h-3 text-sky-600" />
                    Memoria Locale (Browser)
                  </span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
                      quotaReport.status === "critico"
                        ? "bg-rose-100 text-rose-800"
                        : quotaReport.status === "attenzione"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {quotaReport.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[10px]">
                  <span>{quotaReport.totalFormatted} su ~{quotaReport.estimatedLimitFormatted} ({quotaReport.percentUsed}%)</span>
                  <span>{history.length} dossier</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      quotaReport.status === "critico"
                        ? "bg-rose-500"
                        : quotaReport.status === "attenzione"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.max(1, Math.min(100, quotaReport.percentUsed))}%` }}
                  />
                </div>
                {quotaReport.status !== "nominale" && (
                  <div className="text-[10px] text-amber-700 leading-tight pt-0.5">
                    {quotaReport.statusMessage}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Esporta backup completo .json con metadata e checksum SHA-256"
              >
                <Download className="w-3.5 h-3.5 text-sky-600" />
                <span>{isExporting ? "Esportazione..." : "Esporta Backup"}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Carica backup .json per validazione Dry Run"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Carica Backup</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="hidden"
              />
            </div>

            {/* Notifica / Feedback sul ripristino o export */}
            {restoreFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1 shadow-xs ${
                  restoreFeedback.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : restoreFeedback.type === "error"
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : "bg-sky-50 border-sky-200 text-sky-900"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {restoreFeedback.type === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : restoreFeedback.type === "error" ? (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <FileCheck className="w-3.5 h-3.5 text-sky-600" />
                  )}
                  <span>{restoreFeedback.message}</span>
                </div>
                {restoreFeedback.statsText && (
                  <p className="text-[11px] font-mono leading-relaxed opacity-90 pl-5">
                    {restoreFeedback.statsText}
                  </p>
                )}
              </div>
            )}

            {/* ANTEPRIMA DRY RUN (NESSUNA SCRITTURA IN LOCALE) */}
            {dryRunResult && (
              <div className="bg-white border-2 border-indigo-200 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                    <FileJson className="w-4 h-4 text-indigo-600" />
                    <span>Anteprima Dry Run ({dryRunFilename})</span>
                  </div>
                  <button
                    onClick={() => setDryRunResult(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                    title="Annulla anteprima"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 font-mono space-y-1">
                  <div>Data export: <span className="font-bold text-slate-800">{dryRunResult.exportedAt ? new Date(dryRunResult.exportedAt).toLocaleString("it-IT") : "N/D"}</span></div>
                  <div>Versione schema: <span className="font-bold text-slate-800">{dryRunResult.schemaVersion ?? "N/D"}</span> (App: v{APP_VERSION})</div>
                  <div>Dispositivo origine: <span className="text-slate-700">{dryRunResult.sourceDevice?.slice(0, 18) || "N/D"}...</span></div>
                </div>

                {dryRunResult.stats && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-[11px] font-mono">
                    <div>Analisi: <span className="font-bold text-slate-900">{dryRunResult.stats.totalRecords}</span></div>
                    <div>Compiti aperti: <span className="font-bold text-sky-700">{dryRunResult.stats.openTasks}</span></div>
                    <div>Baby step: <span className="font-bold text-teal-700">{dryRunResult.stats.babyStepsCount}</span></div>
                    <div>Scadenze: <span className="font-bold text-amber-700">{dryRunResult.stats.scadenzeCount}</span></div>
                  </div>
                )}

                {/* Controllo Perimetro ASL/MUM */}
                {dryRunResult.detectedPerimetroViolations && dryRunResult.detectedPerimetroViolations.length > 0 ? (
                  <div className="bg-rose-50 border border-rose-200 text-rose-900 p-2.5 rounded-lg text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      <span>Violazione perimetro rilevata nel file</span>
                    </div>
                    <ul className="text-[11px] space-y-0.5 pl-4 list-disc text-rose-800">
                      {dryRunResult.detectedPerimetroViolations.slice(0, 3).map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-lg font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Controllo perimetro superato: zero riferimenti ASL/MUM.</span>
                  </div>
                )}

                {/* Errori di validazione */}
                {dryRunResult.errors.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-900 p-2.5 rounded-lg text-xs space-y-1">
                    <div className="font-bold">Errori bloccanti nel file:</div>
                    <ul className="text-[11px] space-y-0.5 pl-4 list-disc text-rose-800">
                      {dryRunResult.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Avvisi non bloccanti */}
                {dryRunResult.warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2 rounded-lg text-[11px] space-y-0.5">
                    {dryRunResult.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Azione di Ripristino (abilitata solo se isValid) */}
                {dryRunResult.isValid && (
                  <div className="pt-1 space-y-2">
                    <div className="text-[10px] text-slate-500 font-mono">
                      * Prima della sostituzione verrà creato automaticamente uno snapshot di sicurezza per consentire l'eventuale rollback.
                    </div>
                    <button
                      type="button"
                      onClick={handleConfirmRestore}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Esegui Ripristino Transazionale</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Pulsante Rollback Snapshot di Sicurezza */}
            {hasSafetySnapshot && !dryRunResult && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 border border-slate-200 text-[11px]">
                <div className="flex items-center gap-1 text-slate-600">
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Snapshot di sicurezza disponibile</span>
                </div>
                <button
                  type="button"
                  onClick={handleRollback}
                  className="text-slate-800 hover:text-rose-700 font-bold underline cursor-pointer"
                  title="Annulla l'ultimo ripristino tornando allo stato precedente"
                >
                  Rollback
                </button>
              </div>
            )}
          </div>

          {/* Sezione Sincronizzazione Sovrana Multi-Dispositivo (Fase 3) */}
          <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-sky-600" />
                <span>Sincronizzazione Sovrana Multi-Dispositivo</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                  settings.syncStatus === "synced"
                    ? "bg-emerald-100 text-emerald-800"
                    : settings.syncStatus === "syncing"
                    ? "bg-amber-100 text-amber-800"
                    : settings.syncStatus === "error"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {settings.syncStatus || "unconfigured"}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-medium">Destinazione:</span>
                <span className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Google Drive (appDataFolder)
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-medium">Ultimo allineamento:</span>
                <span className="font-mono text-slate-700">
                  {settings.lastSyncedAt
                    ? new Date(settings.lastSyncedAt).toLocaleString("it-IT", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "Mai effettuato"}
                </span>
              </div>

              {/* Opzione Auto-Sync all'avvio */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                <span className="text-slate-700 font-medium">Sincronizza all'avvio dell'app</span>
                <button
                  type="button"
                  onClick={handleToggleAutoSync}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.autoSyncOnStartup ? "bg-sky-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      settings.autoSyncOnStartup ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Pulsante Sincronizza Ora */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sincronizzazione in corso...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sincronizza Ora</span>
                    </>
                  )}
                </button>
              </div>

              {/* Feedback Sincronizzazione */}
              {syncFeedback && (
                <div
                  className={`p-2 rounded-lg text-[11px] font-medium ${
                    syncFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : syncFeedback.type === "info"
                      ? "bg-sky-50 text-sky-800 border border-sky-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {syncFeedback.message}
                </div>
              )}

              {/* Gestione Token Volatile (Espandibile) */}
              <div className="pt-1 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setShowTokenSettings(!showTokenSettings)}
                  className="text-[11px] text-sky-700 hover:text-sky-800 font-semibold underline cursor-pointer flex items-center justify-between w-full"
                >
                  <span>{showTokenSettings ? "Nascondi impostazioni token" : "Configura Token Google (OAuth2)"}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {hasToken ? "● Collegato" : "○ Non presente"}
                  </span>
                </button>

                {showTokenSettings && (
                  <div className="mt-2 space-y-2 p-2.5 rounded-lg bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-mono leading-relaxed">
                      Inserisci un token OAuth2 (scope <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700">drive.appdata</code>).
                      Il token viene conservato esclusivamente nella <strong>memoria volatile</strong> della sessione e non viene mai salvato in chiaro su disco per la massima sovranità.
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="password"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder={hasToken ? "Token presente (incolla per sovrascrivere)" : "Incolla Bearer Access Token..."}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono outline-none focus:bg-white focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveToken}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                      >
                        Salva
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Barra di ricerca */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca per testo, parola chiave o baby step..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-sky-500 font-normal shadow-xs transition"
            />
          </div>
        </div>

        {/* Lista Analisi */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="group relative p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span>{item.timestamp}</span>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase text-[10px] text-slate-700 font-sans font-bold">
                      {item.modalita === "auto"
                        ? `Voce (${item.modalitaEffettiva ? item.modalitaEffettiva.slice(0, 3).toUpperCase() : "Auto"})`
                        : item.modalita === "consiglio"
                        ? "Consiglio"
                        : item.modalita === "decisione"
                        ? "Decisione"
                        : "Organizzazione"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onDeleteRecord(item.id)}
                      className="p-1 hover:text-rose-600 text-slate-400 transition-colors cursor-pointer"
                      title="Elimina questa voce"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => {
                    onSelectRecord(item);
                    onClose();
                  }}
                  className="cursor-pointer space-y-1"
                >
                  {item.fuoriPerimetro ? (
                    <div className="text-xs text-amber-700 font-bold">
                      {item.messaggioPerimetro}
                    </div>
                  ) : item.rispostaVocale && item.modalita === "auto" ? (
                    <>
                      <div className="text-xs font-bold text-sky-800 line-clamp-1">
                        Voce: {item.rispostaVocale.prossimoPasso || item.rispostaVocale.situazione}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-normal">
                        {item.trascrizionePulita || item.rispostaVocale.situazione || item.rawInput}
                      </p>
                    </>
                  ) : item.modalita === "consiglio" && item.consiglio ? (
                    <>
                      <div className="text-xs font-bold text-indigo-800 line-clamp-1">
                        Consiglio: {item.consiglio.verdettoProvvisorio || "Confronto collegiale"}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-normal">
                        {item.consiglio.sintesiConsiglio || item.consiglio.tema || item.rawInput}
                      </p>
                    </>
                  ) : item.modalita === "decisione" && item.decisione ? (
                    <>
                      <div className="text-xs font-bold text-amber-800 line-clamp-1">
                        Verdetto: {item.decisione.verdettoProvvisorio || "In valutazione"}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-normal">
                        {item.decisione.situazione || item.rawInput}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-slate-900 line-clamp-1">
                        Baby step: {item.babyStep?.azione || "Non disponibile"}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-normal">
                        {item.sintesi || item.rawInput}
                      </p>
                    </>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
                  <span className="truncate max-w-[240px] text-slate-500 italic">
                    "{item.rawInput.slice(0, 40)}..."
                  </span>
                  <button
                    onClick={() => {
                      onSelectRecord(item);
                      onClose();
                    }}
                    className="text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <span>Carica nella regia</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
              <Clock className="w-6 h-6 mb-2 text-slate-300" />
              <span>
                {searchTerm
                  ? "Nessuna voce trovata per la ricerca indicata."
                  : "Nessuna registrazione salvata in cronologia."}
              </span>
            </div>
          )}
        </div>

        {/* Footer Drawer con Svuota Cronologia */}
        {history.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono tabular-nums font-semibold">
              Totale: {history.length} registrazioni
            </span>

            <button
              onClick={handleClearAllWithConfirm}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold ${
                confirmClear
                  ? "bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
                  : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmClear ? "Conferma eliminazione" : "Svuota cronologia"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
