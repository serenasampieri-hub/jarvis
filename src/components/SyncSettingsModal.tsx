import React, { useState, useEffect } from "react";
import {
  X,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  Laptop,
  Key,
  ExternalLink,
  Lock,
  ArrowRight,
  Info,
} from "lucide-react";
import { JarvisSettings, SyncStatus } from "../types";
import {
  getGoogleAccessToken,
  setGoogleAccessToken,
} from "../utils/syncEngine";
import { getOrCreateDeviceId } from "../utils/crypto";
import { isGoogleGsiAvailable, requestGoogleAccessToken } from "../utils/googleAuth";

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: JarvisSettings;
  onUpdateSettings: (settings: JarvisSettings) => void;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
  onReloadData?: () => void;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onTriggerSync,
  isSyncing,
  onReloadData,
}) => {
  const [hasToken, setHasToken] = useState(Boolean(getGoogleAccessToken()));
  const [tokenInput, setTokenInput] = useState("");
  const [clientIdInput, setClientIdInput] = useState(settings.googleClientId || "");
  const [syncFeedback, setSyncFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [isGsiConnecting, setIsGsiConnecting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasToken(Boolean(getGoogleAccessToken()));
      setClientIdInput(settings.googleClientId || "");
      setSyncFeedback(null);
    }
  }, [isOpen, settings.googleClientId]);

  if (!isOpen) return null;

  const handleSaveClientId = () => {
    const trimmed = clientIdInput.trim();
    const updated = {
      ...settings,
      googleClientId: trimmed || undefined,
    };
    onUpdateSettings(updated);
    setSyncFeedback({
      type: "success",
      message: trimmed
        ? "Google Client ID salvato con successo."
        : "Google Client ID rimosso.",
    });
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleSaveManualToken = () => {
    const trimmed = tokenInput.trim();
    if (trimmed) {
      setGoogleAccessToken(trimmed);
      setHasToken(true);
      setTokenInput("");
      setSyncFeedback({
        type: "success",
        message: "Token di accesso memorizzato in memoria volatile della sessione.",
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

  const handleConnectWithGoogle = () => {
    const clientId = clientIdInput.trim() || settings.googleClientId;
    if (!clientId) {
      setSyncFeedback({
        type: "error",
        message: "Inserisci prima il tuo Google Client ID (termina con .apps.googleusercontent.com).",
      });
      return;
    }

    setIsGsiConnecting(true);
    setSyncFeedback(null);

    requestGoogleAccessToken(
      clientId,
      async (accessToken) => {
        setIsGsiConnecting(false);
        setGoogleAccessToken(accessToken);
        setHasToken(true);
        setSyncFeedback({
          type: "success",
          message: "Autenticazione con Google completata! Avvio sincronizzazione...",
        });

        // Avvia subito la prima sincronizzazione
        try {
          await onTriggerSync();
          if (onReloadData) onReloadData();
          setSyncFeedback({
            type: "success",
            message: "Sincronizzazione con Google Drive completata con successo!",
          });
        } catch (err: any) {
          setSyncFeedback({
            type: "error",
            message: `Errore sincronizzazione: ${err?.message || "Errore sconosciuto"}`,
          });
        }
      },
      (err) => {
        setIsGsiConnecting(false);
        setSyncFeedback({
          type: "error",
          message: `Accesso Google annullato o non riuscito: ${err?.message || String(err)}`,
        });
      }
    );
  };

  const handleManualSyncNow = async () => {
    setSyncFeedback(null);
    try {
      await onTriggerSync();
      setHasToken(Boolean(getGoogleAccessToken()));
      if (onReloadData) onReloadData();
      setSyncFeedback({
        type: "success",
        message: "Sincronizzazione completata! I dati sono allineati.",
      });
      setTimeout(() => setSyncFeedback(null), 5000);
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

  const handleToggleAutoSave = () => {
    onUpdateSettings({
      ...settings,
      salvataggioAutomatico: !settings.salvataggioAutomatico,
    });
  };

  const deviceId = getOrCreateDeviceId();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Intestazione Modale */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Cloud className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wider">
                Impostazioni & Sincronizzazione
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Google Drive Privato (appDataFolder) · PC & iPhone
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Scrollabile */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* 1. Stato Attuale di Sincronizzazione */}
          <div className="p-4 rounded-xl border bg-slate-50/60 border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Stato Connessione
              </span>
              <span
                className={`text-[11px] font-mono px-2.5 py-1 rounded-full uppercase font-bold flex items-center gap-1.5 ${
                  settings.syncStatus === "synced"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : settings.syncStatus === "syncing"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : settings.syncStatus === "error"
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : "bg-slate-200/80 text-slate-700 border border-slate-300"
                }`}
              >
                {settings.syncStatus === "synced" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Sincronizzato</span>
                  </>
                ) : settings.syncStatus === "syncing" ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-700" />
                    <span>In corso...</span>
                  </>
                ) : settings.syncStatus === "error" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    <span>Errore Sync</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>100% Locale</span>
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-600 pt-1">
              <div>
                <span className="text-slate-400">Ultimo sync:</span>{" "}
                <span className="font-bold text-slate-800">
                  {settings.lastSyncedAt
                    ? new Date(settings.lastSyncedAt).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Mai effettuato"}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Dispositivo ID:</span>{" "}
                <span className="font-bold text-slate-800" title={deviceId}>
                  {deviceId.slice(0, 12)}...
                </span>
              </div>
            </div>

            {/* Pulsante Azione Sincronizza Ora */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleManualSyncNow}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sincronizzazione in corso...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Sincronizza Ora</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback Messaggi */}
          {syncFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 shadow-xs ${
                syncFeedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : syncFeedback.type === "error"
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : "bg-sky-50 border-sky-200 text-sky-900"
              }`}
            >
              {syncFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : syncFeedback.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              )}
              <div className="font-medium">{syncFeedback.message}</div>
            </div>
          )}

          {/* 2. Switch di Configurazione Automatica */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800">
                  Sincronizzazione automatica all'avvio
                </div>
                <div className="text-[11px] text-slate-500">
                  Allinea silenziosamente l'app con Google Drive all'apertura.
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoSync}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.autoSyncOnStartup ? "bg-sky-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    settings.autoSyncOnStartup ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800">
                  Salvataggio automatico locale
                </div>
                <div className="text-[11px] text-slate-500">
                  Conserva ogni analisi e modifica nella memoria del browser.
                </div>
              </div>
              <button
                type="button"
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
          </div>

          {/* 3. Configurazione Account Google OAuth */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Collegamento Account Google
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                OAuth 2.0 (drive.appdata)
              </span>
            </div>

            {/* Metodo A: Google Client ID con login GIS */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Google OAuth Client ID:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="es. 123456789-xyz.apps.googleusercontent.com"
                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none transition"
                />
                <button
                  type="button"
                  onClick={handleSaveClientId}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold text-xs transition cursor-pointer shrink-0"
                >
                  Salva ID
                </button>
              </div>

              {/* Bottone Accedi con Google */}
              <button
                type="button"
                onClick={handleConnectWithGoogle}
                disabled={isGsiConnecting || !clientIdInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                {isGsiConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connessione a Google in corso...</span>
                  </>
                ) : (
                  <>
                    <span>🔐 Accedi con Google & Connetti Drive</span>
                  </>
                )}
              </button>
            </div>

            {/* Metodo B: Inserimento Token Manuale (Memoria Volatile) */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Oppure Access Token temporaneo:
                </span>
                <span className="text-[10px] font-mono font-bold">
                  {hasToken ? (
                    <span className="text-emerald-700">● Token attivo</span>
                  ) : (
                    <span className="text-slate-400">○ Non presente</span>
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={
                    hasToken
                      ? "Token presente (incolla per sostituire o lascia vuoto per rimuovere)"
                      : "Incolla Bearer Access Token..."
                  }
                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none transition"
                />
                <button
                  type="button"
                  onClick={handleSaveManualToken}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition cursor-pointer shrink-0"
                >
                  {tokenInput.trim() ? "Applica" : hasToken ? "Rimuovi" : "Salva"}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-mono leading-tight">
                Il token viene conservato esclusivamente nella <strong>memoria volatile</strong> della sessione e scompare alla chiusura del browser per sovranità assoluta.
              </p>
            </div>
          </div>

          {/* 4. Guida Collaudo PC & iPhone */}
          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 space-y-2 text-xs text-sky-950">
            <div className="font-bold flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-sky-700" />
              <span>Come sincronizzare PC e iPhone:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed text-sky-900">
              <li>
                <strong>Su PC:</strong> inserisci il Client ID o il token e premi <em>Sincronizza Ora</em> per esportare i tuoi dati sul tuo Google Drive privato.
              </li>
              <li>
                <strong>Su iPhone:</strong> apri Jarvis dalla Home (PWA), tocca il pulsante <em>Sync</em> in alto, inserisci lo stesso collegamento e tocca <em>Sincronizza Ora</em>.
              </li>
              <li>
                I due dispositivi si fondono a 3 vie conservando i compiti spuntati e le memorie di entrambi senza sovrascritture distruttive.
              </li>
            </ol>
          </div>

          {/* 5. Garanzia Sovranità e Privacy */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-950">
            <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Massima Riservatezza Personale:</strong> Jarvis usa la cartella privata <code>appDataFolder</code> di Google Drive. Questa cartella è visibile unicamente da questa applicazione, non compare tra i tuoi file normali di Drive e nessun server intermedio o terza parte vi ha accesso.
            </div>
          </div>
        </div>

        {/* Footer Modale */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
