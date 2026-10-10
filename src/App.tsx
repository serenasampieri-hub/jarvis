/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { InputPanel } from "./components/InputPanel";
import { OutputCockpit } from "./components/OutputCockpit";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { AnalysisRecord, JarvisSettings, ModalitaJarvis, ReplicaStep } from "./types";
import {
  loadHistory,
  saveAnalysisRecord,
  updateAnalysisRecord,
  deleteAnalysisRecord,
  clearAllHistory,
  loadSettings,
  saveSettings,
} from "./utils/storage";
import { Dashboard } from "./components/Dashboard";
import { BetaSurveyModal } from "./components/BetaSurveyModal";
import { BrochureModal } from "./components/BrochureModal";
import { MemoryDossierManager } from "./components/MemoryDossierManager";
import { loadBetaSurvey, BetaSurveyData, loadMemories, buildMemoryContextForAI } from "./utils/storage";
import { classifyPerimeter } from "./utils/perimeter";
import { performBidirectionalSync, getGoogleAccessToken } from "./utils/syncEngine";
import { AlertCircle, Shield, ArrowDown, RotateCcw } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "analisi" | "memoria">("dashboard");
  const [pendingHypotheses, setPendingHypotheses] = useState<number>(0);
  const [modalita, setModalita] = useState<ModalitaJarvis>("organizzazione");
  const [inputText, setInputText] = useState("");
  const [currentRecord, setCurrentRecord] = useState<AnalysisRecord | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [settings, setSettings] = useState<JarvisSettings>({ salvataggioAutomatico: true });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReplicating, setIsReplicating] = useState(false);
  const [errorState, setErrorState] = useState<{
    message: string;
    isRetryable: boolean;
  } | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [isBrochureOpen, setIsBrochureOpen] = useState(false);
  const [surveyData, setSurveyData] = useState<BetaSurveyData>(loadBetaSurvey);
  const [showPwaPrompt, setShowPwaPrompt] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    const wasDismissed = localStorage.getItem("jarvis_pwa_ios_prompt_dismissed_v1") === "true";
    return isIOS && !isStandalone && !wasDismissed;
  });

  const refreshMemoriesCount = () => {
    try {
      const mems = loadMemories(true);
      setPendingHypotheses(mems.filter((m) => m.tipo === "ipotesi" && m.status === "da_validare").length);
    } catch {}
  };

  // Inizializzazione dati locali all'avvio
  useEffect(() => {
    const loadedSettings = loadSettings();
    const loadedHistory = loadHistory();
    setSettings(loadedSettings);
    setHistory(loadedHistory);
    refreshMemoriesCount();

    if (loadedHistory.length > 0) {
      setCurrentRecord(loadedHistory[0]);
      if (loadedHistory[0].modalita) {
        setModalita(loadedHistory[0].modalita);
      }
    }

    // Auto-sync all'avvio se abilitato nelle impostazioni e token presente
    if (loadedSettings.autoSyncOnStartup && getGoogleAccessToken()) {
      setIsSyncing(true);
      performBidirectionalSync().then((result) => {
        if (result.success) {
          const freshHistory = loadHistory();
          setHistory(freshHistory);
          setSettings(loadSettings());
          setSurveyData(loadBetaSurvey());
          refreshMemoriesCount();
          if (freshHistory.length > 0 && !currentRecord) {
            setCurrentRecord(freshHistory[0]);
          }
        }
      }).catch(console.error).finally(() => {
        setIsSyncing(false);
      });
    }
  }, []);

  const handleTriggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setErrorState(null);
    try {
      const result = await performBidirectionalSync();
      if (result.success) {
        const freshHistory = loadHistory();
        const freshSettings = loadSettings();
        const freshSurvey = loadBetaSurvey();
        setHistory(freshHistory);
        setSettings(freshSettings);
        setSurveyData(freshSurvey);
        if (freshHistory.length > 0 && !currentRecord) {
          setCurrentRecord(freshHistory[0]);
        }
      } else {
        const currentSettings = loadSettings();
        setSettings({
          ...currentSettings,
          syncStatus: result.status,
        });
        if (result.error && result.status !== "unconfigured") {
          setErrorState({
            message: `Avviso Sincronizzazione: ${result.error}`,
            isRetryable: true,
          });
        }
      }
    } catch (err: any) {
      console.error("Errore durante la sincronizzazione:", err);
      setErrorState({
        message: `Errore Sincronizzazione: ${err?.message || "Errore sconosciuto"}`,
        isRetryable: true,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateSettings = (newSettings: JarvisSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleNewAnalysis = () => {
    setInputText("");
    setCurrentRecord(null);
    setErrorState(null);
    setActiveTab("analisi");
  };

  const handleNavigateToScaricoRapido = () => {
    setInputText("");
    setCurrentRecord(null);
    setErrorState(null);
    setModalita("deposito");
    setActiveTab("analisi");
  };

  const handleDismissPwaPrompt = () => {
    setShowPwaPrompt(false);
    try {
      localStorage.setItem("jarvis_pwa_ios_prompt_dismissed_v1", "true");
    } catch {}
  };

  const handleSubmit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // LIVELLO 1: Controllo perimetrale preventivo client-side prima dell'invio API
    const clientPerimCheck = classifyPerimeter(trimmed);
    if (!clientPerimCheck.isAllowed) {
      setErrorState({
        message: `${clientPerimCheck.motivo} (Termini intercettati: ${clientPerimCheck.matchedTerms.join(", ")})`,
        isRetryable: false,
      });
      return;
    }

    setIsLoading(true);
    setErrorState(null);

    // =========================================================================
    // MODALITÀ DEPOSITO: ESECUZIONE SOVRANA, RESILIENTE E ZERO ATTRITO
    // Non fallisce mai: se l'API non è raggiungibile (offline, Netlify SPA, ecc.)
    // salva immediatamente il pensiero nella cassaforte locale senza errori.
    // =========================================================================
    if (modalita === "deposito") {
      let aiData: any = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const response = await fetch("/api/jarvis/analizza", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: trimmed,
            modalita: "deposito",
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            aiData = await response.json();
          }
        }
      } catch {
        // Fallback locale immediato e trasparente: sovranità e resilienza offline
      }

      const now = new Date();
      const timestampFormatted = now.toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const extractedKeys =
        aiData?.chiaviDiPensiero && Array.isArray(aiData.chiaviDiPensiero) && aiData.chiaviDiPensiero.length > 0
          ? aiData.chiaviDiPensiero
          : trimmed
              .replace(/[^\w\sàèéìòù]/gi, " ")
              .split(/\s+/)
              .filter((w) => w.length > 3)
              .slice(0, 4)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

      const depositoRecord: AnalysisRecord = {
        id: crypto.randomUUID(),
        timestamp: timestampFormatted,
        timestampMs: Date.now(),
        rawInput: trimmed,
        trascrizionePulita: aiData?.trascrizionePulita || trimmed,
        modalita: "deposito",
        modalitaEffettiva: "deposito",
        fuoriPerimetro: false,
        rispostaVocale: aiData?.rispostaVocale || {
          situazione: "Pensiero accolto e custodito nel deposito personale.",
          puntiSalienti: [
            "Nessun compito generato.",
            "Pensiero al sicuro nella memoria locale.",
            "La mente può staccare.",
          ],
          prossimoPasso: "Nessuna azione richiesta.",
          testoParlatoCompleto:
            "Ho archiviato il tuo pensiero nel deposito personale. Non ci sono compiti da eseguire né baby step forzati. La mente può staccare.",
          durataStimataSecondi: 12,
        },
        deposito: {
          sintesi: aiData?.deposito?.sintesi || aiData?.sintesi || trimmed,
          chiaviDiPensiero: extractedKeys.length > 0 ? extractedKeys : ["Pensiero custodito"],
          annotazioneSilenziosa:
            aiData?.deposito?.annotazioneSilenziosa ||
            "Pensiero custodito nella cassaforte personale sovrana.",
        },
        sintesi: aiData?.deposito?.sintesi || aiData?.sintesi || trimmed,
      };

      setCurrentRecord(depositoRecord);
      saveAnalysisRecord(depositoRecord);
      setHistory(loadHistory());
      setInputText("");
      setActiveTab("analisi");
      setIsLoading(false);
      return;
    }

    try {
      const memoryContext = buildMemoryContextForAI();
      const response = await fetch("/api/jarvis/analizza", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmed,
          modalita,
          contestoPrecedente: {
            memorieStoricheSnippet: memoryContext.promptSnippet || undefined,
          },
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const errorData = contentType.includes("application/json")
          ? await response.json().catch(() => ({}))
          : {};
        const raw = String(errorData.error || "");
        const isTemporaryBusy =
          response.status === 503 ||
          response.status === 429 ||
          errorData.isTemporaryBusy ||
          raw.includes("503") ||
          raw.includes("429") ||
          raw.includes("high demand") ||
          raw.includes("UNAVAILABLE") ||
          raw.includes("RESOURCE_EXHAUSTED") ||
          raw.includes("temporaneamente occupato");

        if (isTemporaryBusy) {
          setErrorState({
            message:
              "Il motore di Jarvis è temporaneamente occupato. Il testo inserito non è stato perso. Riprova tra poco.",
            isRetryable: true,
          });
          return;
        }

        setErrorState({
          message: "Si è verificato un errore durante l'elaborazione. Riprova tra poco.",
          isRetryable: true,
        });
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setErrorState({
          message: "Il servizio di elaborazione intelligente non ha restituito una risposta valida. Riprova tra poco.",
          isRetryable: true,
        });
        return;
      }

      const data = await response.json();

      const now = new Date();
      const timestampFormatted = now.toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const modalitaEffettiva: "deposito" | "organizzazione" | "decisione" | "consiglio" =
        data.modalitaRilevata || (modalita === "auto" ? "organizzazione" : modalita);

      // Risposta Vocale breve di circa 30s
      const rispostaVocale = data.rispostaVocale
        ? {
            situazione: data.rispostaVocale.situazione || "",
            puntiSalienti: Array.isArray(data.rispostaVocale.puntiSalienti)
              ? data.rispostaVocale.puntiSalienti.slice(0, 3)
              : [],
            prossimoPasso: data.rispostaVocale.prossimoPasso || "",
            testoParlatoCompleto: data.rispostaVocale.testoParlatoCompleto || "",
            durataStimataSecondi: Number(data.rispostaVocale.durataStimataSecondi) || 30,
          }
        : undefined;

      const decObj = data.decisione || (modalitaEffettiva === "decisione" && data.situazione ? data : undefined);
      const consObj = data.consiglio || (modalitaEffettiva === "consiglio" && data.consiglieri ? data : undefined);

      const newRecord: AnalysisRecord = {
        id: crypto.randomUUID(),
        timestamp: timestampFormatted,
        timestampMs: Date.now(),
        rawInput: trimmed,
        trascrizionePulita: data.trascrizionePulita || trimmed,
        modalita,
        modalitaEffettiva,
        domandaDisambiguazioneModalita: data.domandaDisambiguazioneModalita || undefined,
        fuoriPerimetro: Boolean(data.fuoriPerimetro),
        messaggioPerimetro: data.messaggioPerimetro,
        rispostaVocale,
        // Sezione Deposito (attiva se la modalità rilevata o selezionata è deposito: ordine mentale senza compiti forzati)
        deposito:
          modalitaEffettiva === "deposito"
            ? {
                sintesi: data.sintesi || trimmed,
                chiaviDiPensiero: Array.isArray(data.chiaviDiPensiero) ? data.chiaviDiPensiero : [],
                annotazioneSilenziosa: data.annotazioneSilenziosa || undefined,
              }
            : undefined,
        // Sezione Organizzazione (attiva se la modalità rilevata o selezionata è organizzazione)
        sintesi: modalitaEffettiva === "deposito" ? (data.sintesi || trimmed) : modalitaEffettiva === "organizzazione" ? (data.sintesi || "") : undefined,
        babyStep: modalitaEffettiva === "organizzazione" && data.babyStep
          ? {
              azione: data.babyStep?.azione || "",
              durataStimata: data.babyStep?.durataStimata || "5-10 minuti",
              motivo: data.babyStep?.motivo || "",
              tempistica:
                data.babyStep?.tempistica === "Da fare prima della scadenza"
                  ? "Da fare prima della scadenza"
                  : "Da fare ora",
              completato: false,
            }
          : undefined,
        azioni: modalitaEffettiva === "organizzazione" && Array.isArray(data.azioni)
          ? data.azioni.slice(0, 3).map((a: any, idx: number) => ({
              id: `act-${idx}-${Date.now()}`,
              testo: a.testo || "",
              energiaRichiesta: a.energiaRichiesta || "media",
              tipo:
                a.tipo === "fatto" || a.tipo === "deduzione" || a.tipo === "suggerimento"
                  ? a.tipo
                  : "suggerimento",
              completata: false,
            }))
          : undefined,
        scadenze: modalitaEffettiva === "organizzazione" && Array.isArray(data.scadenze)
          ? data.scadenze.map((s: any, idx: number) => ({
              id: `scad-${idx}-${Date.now()}`,
              termine: s.termine || "",
              oggetto: s.oggetto || "",
              vincolante: Boolean(s.vincolante),
            }))
          : undefined,
        scadenzaNote: modalitaEffettiva === "organizzazione" ? data.scadenzaNote : undefined,
        criticita: modalitaEffettiva === "organizzazione" && Array.isArray(data.criticita)
          ? data.criticita.map((c: any, idx: number) => ({
              id: `crit-${idx}-${Date.now()}`,
              ostacolo: c.ostacolo || "",
              soluzionePragmatica: c.soluzionePragmatica || "",
              risolta: false,
            }))
          : undefined,
        domandaIndispensabile: modalitaEffettiva === "organizzazione" ? (data.domandaIndispensabile || undefined) : undefined,
        // Sezione Decisione (attiva se la modalità rilevata o selezionata è decisione)
        decisione: decObj
          ? {
              situazione: decObj.situazione || "",
              vantaggi: Array.isArray(decObj.vantaggi) ? decObj.vantaggi : [],
              svantaggi: Array.isArray(decObj.svantaggi) ? decObj.svantaggi : [],
              costiReali: {
                denaro: decObj.costiReali?.denaro || "Non specificato",
                tempo: decObj.costiReali?.tempo || "Non specificato",
                energiaMentale: decObj.costiReali?.energiaMentale || "Non specificata",
                complessitaLogistica: decObj.costiReali?.complessitaLogistica || "Non specificata",
              },
              soluzioneAlternativaEconomica: decObj.soluzioneAlternativaEconomica || "",
              rischioPentimento: {
                livello: decObj.rischioPentimento?.livello || "medio",
                motivazione: decObj.rischioPentimento?.motivazione || "",
              },
              verdettoProvvisorio: decObj.verdettoProvvisorio || "",
              prossimoPasso: {
                azione: decObj.prossimoPasso?.azione || "",
                completato: false,
              },
              datiMancanti: decObj.datiMancanti || undefined,
              fontiWeb: Array.isArray(data.fontiWeb) ? data.fontiWeb : [],
            }
          : undefined,
        // Sezione Consiglio (attiva se la modalità rilevata o selezionata è consiglio)
        consiglio: consObj && consObj.consiglieri
          ? {
              tema: consObj.tema || "",
              consiglieri: {
                pragmatico: Array.isArray(consObj.consiglieri.pragmatico)
                  ? consObj.consiglieri.pragmatico.slice(0, 5)
                  : [],
                economo: Array.isArray(consObj.consiglieri.economo)
                  ? consObj.consiglieri.economo.slice(0, 5)
                  : [],
                scettico: Array.isArray(consObj.consiglieri.scettico)
                  ? consObj.consiglieri.scettico.slice(0, 5)
                  : [],
                serenaDelFuturo: Array.isArray(consObj.consiglieri.serenaDelFuturo)
                  ? consObj.consiglieri.serenaDelFuturo.slice(0, 5)
                  : [],
              },
              sintesiConsiglio: consObj.sintesiConsiglio || "",
              puntiAccordo: Array.isArray(consObj.puntiAccordo) ? consObj.puntiAccordo : [],
              puntiDisaccordo: Array.isArray(consObj.puntiDisaccordo) ? consObj.puntiDisaccordo : [],
              verdettoProvvisorio: consObj.verdettoProvvisorio || "",
              prossimoPasso: {
                azione: consObj.prossimoPasso?.azione || "",
                completato: false,
              },
              fontiWeb: Array.isArray(data.fontiWeb) ? data.fontiWeb : [],
            }
          : undefined,
        fontiWeb: Array.isArray(data.fontiWeb) ? data.fontiWeb : [],
      };

      setCurrentRecord(newRecord);

      // Salva sempre il nuovo record e aggiorna reattivamente lo stato locale
      saveAnalysisRecord(newRecord);
      setHistory(loadHistory());
      setInputText("");

      // Se la modalità effettiva è deposito, mantieni la visualizzazione sulla cabina di regia per mostrare la conferma del deposito
      if (modalitaEffettiva === "deposito") {
        setActiveTab("analisi");
      } else {
        setActiveTab("dashboard");
      }
    } catch (err: unknown) {
      const raw = String(err instanceof Error ? err.message : err);
      const isTemporaryBusy =
        raw.includes("503") ||
        raw.includes("429") ||
        raw.includes("high demand") ||
        raw.includes("UNAVAILABLE") ||
        raw.includes("RESOURCE_EXHAUSTED") ||
        raw.includes("temporaneamente occupato");

      if (isTemporaryBusy) {
        setErrorState({
          message:
            "Il motore di Jarvis è temporaneamente occupato. Il testo inserito non è stato perso. Riprova tra poco.",
          isRetryable: true,
        });
      } else {
        setErrorState({
          message: "Si è verificato un errore di connessione. Riprova tra poco.",
          isRetryable: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Replica e integrazione step-by-step su un progetto esistente
  const handleReplica = async (replicaText: string) => {
    const trimmedReplica = replicaText.trim();
    if (!currentRecord || !trimmedReplica || isLoading || isReplicating) return;

    // LIVELLO 1: Controllo perimetrale preventivo client-side prima dell'invio replica
    const clientPerimCheck = classifyPerimeter(trimmedReplica);
    if (!clientPerimCheck.isAllowed) {
      setErrorState({
        message: `${clientPerimCheck.motivo} (Termini intercettati: ${clientPerimCheck.matchedTerms.join(", ")})`,
        isRetryable: false,
      });
      return;
    }

    setIsReplicating(true);
    setErrorState(null);

    try {
      const memoryContext = buildMemoryContextForAI();
      const contestoPrecedente = {
        inputIniziale: currentRecord.trascrizionePulita || currentRecord.rawInput,
        sintesiPrecedente:
          currentRecord.sintesi ||
          currentRecord.decisione?.situazione ||
          currentRecord.consiglio?.sintesiConsiglio,
        babyStepPrecedente:
          currentRecord.babyStep?.azione ||
          currentRecord.decisione?.prossimoPasso?.azione ||
          currentRecord.consiglio?.prossimoPasso?.azione,
        azioniPrecedenti: currentRecord.azioni?.map((a) => a.testo),
        decisionePrecedente: currentRecord.decisione
          ? `${currentRecord.decisione.verdettoProvvisorio} - Prossimo: ${currentRecord.decisione.prossimoPasso?.azione}`
          : undefined,
        consiglioPrecedente: currentRecord.consiglio
          ? `${currentRecord.consiglio.verdettoProvvisorio} - Prossimo: ${currentRecord.consiglio.prossimoPasso?.azione}`
          : undefined,
        memorieStoricheSnippet: memoryContext.promptSnippet || undefined,
      };

      const res = await fetch("/api/jarvis/analizza", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: replicaText,
          modalita: currentRecord.modalitaEffettiva || currentRecord.modalita,
          contestoPrecedente,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Errore durante l'elaborazione della replica.");
      }

      const data = await res.json();

      const newReplicaStep: ReplicaStep = {
        id: "rep_" + Date.now(),
        timestamp: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        richiesta: replicaText,
        rispostaSintetica: data.rispostaVocale?.situazione || data.sintesi,
        nuovoBabyStep:
          data.babyStep?.azione ||
          data.decisione?.prossimoPasso?.azione ||
          data.consiglio?.prossimoPasso?.azione,
      };

      const existingRepliche = currentRecord.repliche || [];
      const updatedRecord: AnalysisRecord = {
        ...currentRecord,
        timestamp: new Date().toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestampMs: Date.now(),
        trascrizionePulita: data.trascrizionePulita || currentRecord.trascrizionePulita,
        rispostaVocale: data.rispostaVocale,
        sintesi: data.sintesi || currentRecord.sintesi,
        babyStep: data.babyStep
          ? { ...data.babyStep, completato: false }
          : currentRecord.babyStep,
        azioni: data.azioni
          ? data.azioni.map((a: any, idx: number) => ({
              id: "act_rep_" + Date.now() + "_" + idx,
              ...a,
              completata: false,
            }))
          : currentRecord.azioni,
        scadenze: data.scadenze
          ? data.scadenze.map((s: any, idx: number) => ({
              id: "scad_rep_" + Date.now() + "_" + idx,
              ...s,
            }))
          : currentRecord.scadenze,
        criticita: data.criticita
          ? data.criticita.map((c: any, idx: number) => ({
              id: "crit_rep_" + Date.now() + "_" + idx,
              ...c,
              risolta: false,
            }))
          : currentRecord.criticita,
        decisione: data.decisione
          ? {
              ...data.decisione,
              prossimoPasso: { ...data.decisione.prossimoPasso, completato: false },
            }
          : currentRecord.decisione,
        consiglio: data.consiglio
          ? {
              ...data.consiglio,
              prossimoPasso: { ...data.consiglio.prossimoPasso, completato: false },
            }
          : currentRecord.consiglio,
        fontiWeb:
          Array.isArray(data.fontiWeb) && data.fontiWeb.length > 0
            ? data.fontiWeb
            : currentRecord.fontiWeb,
        repliche: [...existingRepliche, newReplicaStep],
      };

      setCurrentRecord(updatedRecord);
      updateAnalysisRecord(updatedRecord);
      setHistory(loadHistory());
    } catch (err: any) {
      setErrorState({
        message: err.message || "Impossibile elaborare la replica sul progetto.",
        isRetryable: true,
      });
    } finally {
      setIsReplicating(false);
    }
  };

  const handleUpdateRecord = (updated: AnalysisRecord) => {
    setCurrentRecord(updated);
    if (settings.salvataggioAutomatico) {
      updateAnalysisRecord(updated);
      setHistory(loadHistory());
    }
  };

  const handleDeleteRecord = (id: string) => {
    deleteAnalysisRecord(id);
    const updatedHistory = loadHistory();
    setHistory(updatedHistory);

    if (currentRecord?.id === id) {
      setCurrentRecord(updatedHistory.length > 0 ? updatedHistory[0] : null);
    }
  };

  const handleClearAllHistory = () => {
    clearAllHistory();
    setHistory([]);
    setCurrentRecord(null);
  };

  const handleSelectRecord = (record: AnalysisRecord) => {
    setCurrentRecord(record);
    setInputText(record.rawInput);
    if (record.modalita) {
      setModalita(record.modalita);
    }
    setErrorState(null);
  };

  const completedChecksCount = [
    surveyData.problemaReale?.giudizio,
    surveyData.prioritaEdEnergia?.giudizio,
    surveyData.babyStepEffettivo?.giudizio,
    surveyData.voceScaricoVsAzione?.giudizio,
    surveyData.replicaEContinuita?.giudizio,
    surveyData.consiglioDeiQuattro?.giudizio,
    surveyData.secondoCervelloVsAssistente?.giudizio,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* Header Autorevole con Navigazione Tab */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onNewAnalysis={handleNewAnalysis}
        salvataggioAutomatico={settings.salvataggioAutomatico}
        onOpenSurvey={() => setIsSurveyOpen(true)}
        completedChecksCount={completedChecksCount}
        onOpenBrochure={() => setIsBrochureOpen(true)}
        syncStatus={settings.syncStatus || "unconfigured"}
        lastSyncedAt={settings.lastSyncedAt}
        onTriggerSync={handleTriggerSync}
        pendingHypothesesCount={pendingHypotheses}
      />

      {/* Contenuto Principale: Layout Cabina di Regia */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Banner informativo sobrio sul perimetro personale (Fedele a Pagina 1 PDF) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200/90 text-xs text-slate-700 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
              <Shield className="w-4 h-4 text-teal-600 shrink-0" />
            </span>
            <div>
              <div className="font-semibold text-slate-900">
                Jarvis opera esclusivamente nella sfera personale di Serena Sampieri.
              </div>
              <div className="text-slate-500 text-[11px] font-mono mt-0.5">
                Esclusioni attive: ASL Roma 1 & Progetto MUM
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
            Perimetro Protetto
          </span>
        </div>

        {/* Banner discreto PWA per installazione su schermata Home iOS */}
        {showPwaPrompt && (
          <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950 shadow-xs animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">📲</span>
              <div>
                <div className="font-bold">Usa Jarvis a schermo intero su iPhone</div>
                <div className="text-sky-800 text-[11px] mt-0.5 leading-snug">
                  Tocca l'icona <strong>Condividi</strong> in basso in Safari (⬆️) e poi <strong>"Aggiungi alla schermata Home"</strong> per aprirla come app a tutto schermo senza barre del browser.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissPwaPrompt}
              className="px-2.5 py-1.5 rounded-lg bg-sky-200/70 hover:bg-sky-200 text-sky-900 font-semibold text-[11px] shrink-0 cursor-pointer min-h-[36px]"
            >
              Ho capito
            </button>
          </div>
        )}

        {/* Notifica di errore con messaggio in italiano e pulsante Riprova */}
        {errorState && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">
                {errorState.message}
              </div>
            </div>
            {errorState.isRetryable && (
              <button
                type="button"
                onClick={() => handleSubmit(inputText)}
                disabled={isLoading || !inputText.trim()}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 font-semibold text-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                title="Riprova l'elaborazione con il testo già inserito"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Riprova</span>
              </button>
            )}
          </div>
        )}

        {/* VISTA 1: DASHBOARD CENTRO DI CONTROLLO (Default all'apertura) */}
        {activeTab === "dashboard" ? (
          <Dashboard
            history={history}
            onUpdateRecord={handleUpdateRecord}
            onSelectRecord={(rec) => {
              handleSelectRecord(rec);
              setActiveTab("analisi");
            }}
            onNavigateToAnalysis={() => setActiveTab("analisi")}
            onNavigateToScaricoRapido={handleNavigateToScaricoRapido}
          />
        ) : activeTab === "memoria" ? (
          /* VISTA 3: MEMORIA STORICA & SECONDO CERVELLO (FASE 5) */
          <MemoryDossierManager
            onMemoryChanged={refreshMemoriesCount}
          />
        ) : (
          /* VISTA 2: ANALISI / VOCE / INSERIMENTO DATI */
          <div className="space-y-6">
            {/* Area Immissione Dati e Dettatura con Selettore Modalità */}
            <InputPanel
              inputText={inputText}
              setInputText={setInputText}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              modalita={modalita}
              onSelectModalita={setModalita}
            />

            {/* Quadro Risultati Decomposti */}
            {currentRecord ? (
              <div className="pt-2">
                <OutputCockpit
                  record={currentRecord}
                  onUpdateRecord={handleUpdateRecord}
                  onDeleteRecord={handleDeleteRecord}
                  onReplica={handleReplica}
                  isReplicating={isReplicating}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center space-y-3 shadow-xs">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                  <ArrowDown className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Cabina di Regia in Attesa
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                  Incolla un testo disordinato o usa la voce per ottenere sintesi, massimo 3 priorità, scadenze accertate, criticità e il prossimo baby step a minima spesa.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Drawer Cronologia & Privacy */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectRecord={handleSelectRecord}
        onDeleteRecord={handleDeleteRecord}
        onClearAll={handleClearAllHistory}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        isSyncing={isSyncing}
        onTriggerSync={handleTriggerSync}
        onReloadData={() => {
          const freshHistory = loadHistory();
          setHistory(freshHistory);
          setSettings(loadSettings());
          setSurveyData(loadBetaSurvey());
          setCurrentRecord(freshHistory.length > 0 ? freshHistory[0] : null);
        }}
      />

      {/* Modale Sondaggio Check Beta Test (7 Giorni) */}
      <BetaSurveyModal
        isOpen={isSurveyOpen}
        onClose={() => {
          setIsSurveyOpen(false);
          setSurveyData(loadBetaSurvey());
        }}
      />

      {/* Modale Brochure Ufficiale & Documento Stampabile */}
      <BrochureModal
        isOpen={isBrochureOpen}
        onClose={() => setIsBrochureOpen(false)}
      />
    </div>
  );
}
