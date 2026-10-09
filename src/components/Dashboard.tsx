import React, { useState, useMemo } from "react";
import {
  AnalysisRecord,
  Azione,
  BabyStep,
  Scadenza,
  JarvisDailyBriefing,
} from "../types";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Trash2,
  Edit2,
  Sparkles,
  Layers,
  Check,
  X,
  Target,
  FileCheck2,
  Archive,
  BarChart3,
  Flame,
  ChevronRight,
  Filter,
  CheckCheck,
  CheckSquare,
  Square,
  CalendarClock,
  Scale,
  Brain,
  Plus,
  Volume2,
} from "lucide-react";
import { DailyBriefingCard } from "./DailyBriefingCard";
import { generateDailyBriefing } from "../utils/briefingVoice";
import { loadMemories } from "../utils/memoryManager";

export interface UnifiedTask {
  id: string;
  recordId: string;
  subId?: string;
  type: "azione" | "babyStep" | "decisionePasso" | "consiglioPasso";
  title: string;
  origin: "Organizzazione" | "Decisione" | "Consiglio";
  createdAt: string;
  scadenza?: string;
  completed: boolean;
  isBabyStep: boolean;
  durataStimata?: string;
  energiaRichiesta?: "bassa" | "media" | "alta";
  vincolante?: boolean;
}

export interface UnifiedScadenza {
  id: string;
  recordId: string;
  termine: string;
  oggetto: string;
  vincolante: boolean;
  createdAt: string;
  isImminente: boolean;
  collegataAdAttivita?: boolean;
}

interface DashboardProps {
  history: AnalysisRecord[];
  onUpdateRecord: (record: AnalysisRecord) => void;
  onSelectRecord: (record: AnalysisRecord) => void;
  onNavigateToAnalysis: () => void;
  onNavigateToScaricoRapido?: () => void;
}

function checkIsImminente(termine: string, vincolante: boolean): boolean {
  if (vincolante) return true;
  const lower = termine.toLowerCase();
  return (
    lower.includes("oggi") ||
    lower.includes("domani") ||
    lower.includes("24") ||
    lower.includes("48") ||
    lower.includes("subito") ||
    lower.includes("urgente") ||
    lower.includes("immediato") ||
    lower.includes("stasera") ||
    lower.includes("entro le")
  );
}

function tokenize(str: string): string[] {
  const stopWords = new Set([
    "il", "lo", "la", "i", "gli", "le", "un", "uno", "una",
    "di", "a", "da", "in", "con", "su", "per", "tra", "fra",
    "del", "dello", "della", "dei", "degli", "delle",
    "e", "ed", "o", "ma", "se", "che", "non", "devo", "fare", "andare"
  ]);
  return str
    .toLowerCase()
    .replace(/[^\w\sàèéìòù]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

function calculateSimilarity(a: string, b: string): number {
  const normA = a.toLowerCase().trim();
  const normB = b.toLowerCase().trim();
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let common = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) common++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : common / union;
}

export const Dashboard: React.FC<DashboardProps> = ({
  history,
  onUpdateRecord,
  onSelectRecord,
  onNavigateToAnalysis,
  onNavigateToScaricoRapido,
}) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [dismissedPairs, setDismissedPairs] = useState<Set<string>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState<"tutti" | "organizzazione" | "decisione" | "consiglio">("tutti");
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [dailyBriefing, setDailyBriefing] = useState<JarvisDailyBriefing | null>(null);
  const [showBriefing, setShowBriefing] = useState<boolean>(false);

  const handleRequestBriefing = () => {
    const freshBriefing = generateDailyBriefing({ history, memories: loadMemories() });
    setDailyBriefing(freshBriefing);
    setShowBriefing(true);
  };

  const handleCompleteBriefingBabyStep = (bStep: JarvisDailyBriefing["babyStep"]) => {
    if (!bStep) return;
    const targetRecord = history.find((r) => r.id === bStep.recordId);
    if (!targetRecord) return;
    const updated = { ...targetRecord };
    if (updated.babyStep) {
      updated.babyStep = { ...updated.babyStep, completato: Boolean(bStep.completato) };
    } else if (updated.decisione?.prossimoPasso) {
      updated.decisione = {
        ...updated.decisione,
        prossimoPasso: { ...updated.decisione.prossimoPasso, completato: Boolean(bStep.completato) },
      };
    } else if (updated.consiglio?.prossimoPasso) {
      updated.consiglio = {
        ...updated.consiglio,
        prossimoPasso: { ...updated.consiglio.prossimoPasso, completato: Boolean(bStep.completato) },
      };
    }
    onUpdateRecord(updated);
  };

  // 1. Estrazione unificata di tutti i task e baby step dai record
  const { allTasks, openTasks, completedTasks, activeBabySteps, scadenzeList } = useMemo(() => {
    const tasks: UnifiedTask[] = [];
    const scads: UnifiedScadenza[] = [];

    const sortedHistory = [...history].sort((a, b) => {
      const timeA = a.timestampMs || 0;
      const timeB = b.timestampMs || 0;
      return timeB - timeA;
    });

    const newestRecordId = sortedHistory[0]?.id;

    sortedHistory.forEach((rec) => {
      const effMode = rec.modalitaEffettiva || rec.modalita;

      // Modalità Organizzazione
      if (effMode === "organizzazione" || rec.azioni || rec.babyStep) {
        if (rec.babyStep && rec.babyStep.azione) {
          tasks.push({
            id: `${rec.id}__babystep`,
            recordId: rec.id,
            type: "babyStep",
            title: rec.babyStep.azione,
            origin: "Organizzazione",
            createdAt: rec.timestamp,
            completed: Boolean(rec.babyStep.completato),
            isBabyStep: true,
            durataStimata: rec.babyStep.durataStimata,
            scadenza:
              rec.babyStep.tempistica === "Da fare prima della scadenza"
                ? rec.scadenze?.[0]?.termine || "Prima della scadenza"
                : undefined,
          });
        }

        if (rec.azioni && Array.isArray(rec.azioni)) {
          rec.azioni.forEach((a) => {
            if (a.testo) {
              tasks.push({
                id: `${rec.id}__act__${a.id}`,
                recordId: rec.id,
                subId: a.id,
                type: "azione",
                title: a.testo,
                origin: "Organizzazione",
                createdAt: rec.timestamp,
                completed: Boolean(a.completata),
                isBabyStep: false,
                energiaRichiesta: a.energiaRichiesta,
                scadenza: rec.scadenze?.[0]?.termine,
              });
            }
          });
        }

        if (rec.scadenze && Array.isArray(rec.scadenze)) {
          rec.scadenze.forEach((s) => {
            if (s.oggetto || s.termine) {
              scads.push({
                id: `${rec.id}__scad__${s.id}`,
                recordId: rec.id,
                termine: s.termine,
                oggetto: s.oggetto,
                vincolante: Boolean(s.vincolante),
                createdAt: rec.timestamp,
                isImminente: checkIsImminente(s.termine, Boolean(s.vincolante)),
              });
            }
          });
        }
      }

      // Modalità Decisione
      if (effMode === "decisione" || rec.decisione) {
        if (rec.decisione?.prossimoPasso?.azione) {
          tasks.push({
            id: `${rec.id}__dec_step`,
            recordId: rec.id,
            type: "decisionePasso",
            title: rec.decisione.prossimoPasso.azione,
            origin: "Decisione",
            createdAt: rec.timestamp,
            completed: Boolean(rec.decisione.prossimoPasso.completato),
            isBabyStep: true,
            durataStimata: "Passo decisivo",
          });
        }
      }

      // Modalità Consiglio
      if (effMode === "consiglio" || rec.consiglio) {
        if (rec.consiglio?.prossimoPasso?.azione) {
          tasks.push({
            id: `${rec.id}__cons_step`,
            recordId: rec.id,
            type: "consiglioPasso",
            title: rec.consiglio.prossimoPasso.azione,
            origin: "Consiglio",
            createdAt: rec.timestamp,
            completed: Boolean(rec.consiglio.prossimoPasso.completato),
            isBabyStep: true,
            durataStimata: "Passo attuativo",
          });
        }
      }
    });

    const open = tasks.filter((t) => !t.completed);
    const comp = tasks.filter((t) => t.completed);

    const babyActive = open
      .filter((t) => t.isBabyStep)
      .sort((a, b) => {
        if (a.recordId === newestRecordId && b.recordId !== newestRecordId) return -1;
        if (b.recordId === newestRecordId && a.recordId !== newestRecordId) return 1;
        if (a.scadenza && !b.scadenza) return -1;
        if (!a.scadenza && b.scadenza) return 1;
        return 0;
      });

    const openSorted = [...open].sort((a, b) => {
      if (a.recordId === newestRecordId && b.recordId !== newestRecordId) return -1;
      if (b.recordId === newestRecordId && a.recordId !== newestRecordId) return 1;
      return 0;
    });

    return {
      allTasks: tasks,
      openTasks: openSorted,
      completedTasks: comp,
      activeBabySteps: babyActive,
      scadenzeList: scads,
    };
  }, [history]);

  const { scadenzeImminenti, scadenzeFuture } = useMemo(() => {
    const imminenti: UnifiedScadenza[] = [];
    const future: UnifiedScadenza[] = [];
    scadenzeList.forEach((s) => {
      if (s.isImminente) {
        imminenti.push(s);
      } else {
        future.push(s);
      }
    });
    return { scadenzeImminenti: imminenti, scadenzeFuture: future };
  }, [scadenzeList]);

  const duplicateSuggestions = useMemo(() => {
    const pairs: { taskA: UnifiedTask; taskB: UnifiedTask; score: number }[] = [];
    for (let i = 0; i < openTasks.length; i++) {
      for (let j = i + 1; j < openTasks.length; j++) {
        const taskA = openTasks[i];
        const taskB = openTasks[j];
        const pairKey = [taskA.id, taskB.id].sort().join("__dup__");
        if (dismissedPairs.has(pairKey)) continue;

        const score = calculateSimilarity(taskA.title, taskB.title);
        if (score >= 0.55) {
          pairs.push({ taskA, taskB, score });
        }
      }
    }
    return pairs;
  }, [openTasks, dismissedPairs]);

  const oggiPriorita = useMemo(() => openTasks.slice(0, 3), [openTasks]);
  const oggiBabyStep = useMemo(() => activeBabySteps[0] || null, [activeBabySteps]);
  const oggiProssimaScadenza = useMemo(
    () => scadenzeImminenti[0] || scadenzeFuture[0] || null,
    [scadenzeImminenti, scadenzeFuture]
  );

  const filteredOpenTasks = useMemo(() => {
    if (selectedFilter === "tutti") return openTasks;
    return openTasks.filter((t) => t.origin.toLowerCase() === selectedFilter);
  }, [openTasks, selectedFilter]);

  const filteredBabySteps = useMemo(() => {
    if (selectedFilter === "tutti") return activeBabySteps;
    return activeBabySteps.filter((t) => t.origin.toLowerCase() === selectedFilter);
  }, [activeBabySteps, selectedFilter]);

  const filteredCompletedTasks = useMemo(() => {
    if (selectedFilter === "tutti") return completedTasks;
    return completedTasks.filter((t) => t.origin.toLowerCase() === selectedFilter);
  }, [completedTasks, selectedFilter]);

  const filterCounts = useMemo(() => {
    let org = 0;
    let dec = 0;
    let cons = 0;
    openTasks.forEach((t) => {
      const orig = t.origin.toLowerCase();
      if (orig === "organizzazione") org++;
      else if (orig === "decisione") dec++;
      else if (orig === "consiglio") cons++;
    });
    return {
      tutti: openTasks.length,
      organizzazione: org,
      decisione: dec,
      consiglio: cons,
    };
  }, [openTasks]);

  const handleToggleTask = (task: UnifiedTask) => {
    const rec = history.find((r) => r.id === task.recordId);
    if (!rec) return;

    const newCompleted = !task.completed;
    const updated = { ...rec };

    if (task.type === "babyStep" && updated.babyStep) {
      updated.babyStep = { ...updated.babyStep, completato: newCompleted };
    } else if (task.type === "azione" && updated.azioni) {
      updated.azioni = updated.azioni.map((a) =>
        a.id === task.subId ? { ...a, completata: newCompleted } : a
      );
    } else if (task.type === "decisionePasso" && updated.decisione?.prossimoPasso) {
      updated.decisione = {
        ...updated.decisione,
        prossimoPasso: {
          ...updated.decisione.prossimoPasso,
          completato: newCompleted,
        },
      };
    } else if (task.type === "consiglioPasso" && updated.consiglio?.prossimoPasso) {
      updated.consiglio = {
        ...updated.consiglio,
        prossimoPasso: {
          ...updated.consiglio.prossimoPasso,
          completato: newCompleted,
        },
      };
    }

    onUpdateRecord(updated);
  };

  const handleStartEdit = (task: UnifiedTask) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const handleSaveEdit = (task: UnifiedTask) => {
    if (!editingTitle.trim()) {
      setEditingTaskId(null);
      return;
    }
    const rec = history.find((r) => r.id === task.recordId);
    if (!rec) return;

    const updated = { ...rec };
    if (task.type === "babyStep" && updated.babyStep) {
      updated.babyStep = { ...updated.babyStep, azione: editingTitle.trim() };
    } else if (task.type === "azione" && updated.azioni) {
      updated.azioni = updated.azioni.map((a) =>
        a.id === task.subId ? { ...a, testo: editingTitle.trim() } : a
      );
    } else if (task.type === "decisionePasso" && updated.decisione?.prossimoPasso) {
      updated.decisione = {
        ...updated.decisione,
        prossimoPasso: {
          ...updated.decisione.prossimoPasso,
          azione: editingTitle.trim(),
        },
      };
    } else if (task.type === "consiglioPasso" && updated.consiglio?.prossimoPasso) {
      updated.consiglio = {
        ...updated.consiglio,
        prossimoPasso: {
          ...updated.consiglio.prossimoPasso,
          azione: editingTitle.trim(),
        },
      };
    }

    onUpdateRecord(updated);
    setEditingTaskId(null);
  };

  const handleDeleteTask = (task: UnifiedTask) => {
    const rec = history.find((r) => r.id === task.recordId);
    if (!rec) return;

    const updated = { ...rec };
    if (task.type === "azione" && updated.azioni) {
      updated.azioni = updated.azioni.filter((a) => a.id !== task.subId);
    } else if (task.type === "babyStep" && updated.babyStep) {
      updated.babyStep = undefined;
    } else if (task.type === "decisionePasso" && updated.decisione?.prossimoPasso) {
      updated.decisione = {
        ...updated.decisione,
        prossimoPasso: { azione: "", completato: true },
      };
    } else if (task.type === "consiglioPasso" && updated.consiglio?.prossimoPasso) {
      updated.consiglio = {
        ...updated.consiglio,
        prossimoPasso: { azione: "", completato: true },
      };
    }

    onUpdateRecord(updated);
  };

  const handleMergeDuplicate = (taskToKeep: UnifiedTask, taskToClose: UnifiedTask) => {
    handleToggleTask(taskToClose);
    const pairKey = [taskToKeep.id, taskToClose.id].sort().join("__dup__");
    setDismissedPairs((prev) => new Set([...prev, pairKey]));
  };

  const handleDismissDuplicate = (taskA: UnifiedTask, taskB: UnifiedTask) => {
    const pairKey = [taskA.id, taskB.id].sort().join("__dup__");
    setDismissedPairs((prev) => new Set([...prev, pairKey]));
  };

  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const visibleIds = [...filteredBabySteps.map((t) => t.id), ...filteredOpenTasks.map((t) => t.id)];
    const allSelected = visibleIds.every((id) => selectedTaskIds.has(id));
    if (allSelected) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(visibleIds));
    }
  };

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
  };

  const handleBatchComplete = () => {
    if (selectedTaskIds.size === 0) return;
    const tasksToComplete = allTasks.filter((t) => selectedTaskIds.has(t.id));
    const recordMap = new Map<string, UnifiedTask[]>();
    tasksToComplete.forEach((t) => {
      const list = recordMap.get(t.recordId) || [];
      list.push(t);
      recordMap.set(t.recordId, list);
    });

    recordMap.forEach((tasksList, recId) => {
      const rec = history.find((r) => r.id === recId);
      if (!rec) return;
      const updated = { ...rec };
      tasksList.forEach((task) => {
        if (task.type === "babyStep" && updated.babyStep) {
          updated.babyStep = { ...updated.babyStep, completato: true };
        } else if (task.type === "azione" && updated.azioni) {
          updated.azioni = updated.azioni.map((a) =>
            a.id === task.subId ? { ...a, completata: true } : a
          );
        } else if (task.type === "decisionePasso" && updated.decisione?.prossimoPasso) {
          updated.decisione = {
            ...updated.decisione,
            prossimoPasso: { ...updated.decisione.prossimoPasso, completato: true },
          };
        } else if (task.type === "consiglioPasso" && updated.consiglio?.prossimoPasso) {
          updated.consiglio = {
            ...updated.consiglio,
            prossimoPasso: { ...updated.consiglio.prossimoPasso, completato: true },
          };
        }
      });
      onUpdateRecord(updated);
    });

    setSelectedTaskIds(new Set());
  };

  const handleBatchDelete = () => {
    if (selectedTaskIds.size === 0) return;
    const tasksToDelete = allTasks.filter((t) => selectedTaskIds.has(t.id));
    const recordMap = new Map<string, UnifiedTask[]>();
    tasksToDelete.forEach((t) => {
      const list = recordMap.get(t.recordId) || [];
      list.push(t);
      recordMap.set(t.recordId, list);
    });

    recordMap.forEach((tasksList, recId) => {
      const rec = history.find((r) => r.id === recId);
      if (!rec) return;
      const updated = { ...rec };
      const subIdsToRemove = new Set(tasksList.filter((t) => t.subId).map((t) => t.subId));
      if (updated.azioni && subIdsToRemove.size > 0) {
        updated.azioni = updated.azioni.filter((a) => !subIdsToRemove.has(a.id));
      }
      tasksList.forEach((t) => {
        if (t.type === "babyStep") updated.babyStep = undefined;
        if (t.type === "decisionePasso" && updated.decisione?.prossimoPasso) {
          updated.decisione = {
            ...updated.decisione,
            prossimoPasso: { azione: "", completato: true },
          };
        }
        if (t.type === "consiglioPasso" && updated.consiglio?.prossimoPasso) {
          updated.consiglio = {
            ...updated.consiglio,
            prossimoPasso: { azione: "", completato: true },
          };
        }
      });
      onUpdateRecord(updated);
    });

    setSelectedTaskIds(new Set());
  };

  const handleArchivePreviousTasks = () => {
    if (history.length <= 1) return;
    const sorted = [...history].sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
    const previousRecords = sorted.slice(1);
    previousRecords.forEach((oldRec) => {
      const updated = { ...oldRec };
      let modified = false;
      if (updated.babyStep && !updated.babyStep.completato) {
        updated.babyStep = { ...updated.babyStep, completato: true };
        modified = true;
      }
      if (updated.azioni && Array.isArray(updated.azioni)) {
        updated.azioni = updated.azioni.map((a) => ({ ...a, completata: true }));
        modified = true;
      }
      if (updated.decisione?.prossimoPasso && !updated.decisione.prossimoPasso.completato) {
        updated.decisione = {
          ...updated.decisione,
          prossimoPasso: { ...updated.decisione.prossimoPasso, completato: true },
        };
        modified = true;
      }
      if (updated.consiglio?.prossimoPasso && !updated.consiglio.prossimoPasso.completato) {
        updated.consiglio = {
          ...updated.consiglio,
          prossimoPasso: { ...updated.consiglio.prossimoPasso, completato: true },
        };
        modified = true;
      }
      if (modified) {
        onUpdateRecord(updated);
      }
    });
  };

  const getOriginBadge = (origin: string) => {
    switch (origin.toLowerCase()) {
      case "decisione":
        return {
          bg: "bg-sky-50 text-sky-700 border-sky-200",
          icon: Scale,
        };
      case "consiglio":
        return {
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: Brain,
        };
      default:
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: Layers,
        };
    }
  };

  return (
    <div className="Dashboard space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      
      {/* ========================================================================= */}
      {/* 1. QUATTRO STATISTICHE PERSONALI IN ALTO (Esattamente come Pagina 1 PDF)  */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Attività Aperte */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
              Attività Aperte
            </span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
            {openTasks.length}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Da completare</div>
        </div>

        {/* Card 2: Complete */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
              Complete
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <FileCheck2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
            {completedTasks.length}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Storico archiviato</div>
        </div>

        {/* Card 3: Baby Step Attivi */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
              Baby Step Attivi
            </span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
              <Target className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
            {activeBabySteps.length}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Focalizzati</div>
        </div>

        {/* Card 4: Scadenze Imminenti */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
              Scadenze Imminenti
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <CalendarClock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
            {scadenzeImminenti.length}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Entro 48h o vincolanti</div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SEZIONE: OGGI — REGIA QUOTIDIANA (Fedele a Pagina 1 PDF)               */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
        
        {/* Header Sezione OGGI */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shrink-0">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wider">
                OGGI — REGIA QUOTIDIANA
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Priorità immediate e focus attivo per Serena Sampieri
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Pulsante PULL Sovrano: Dammi il punto di oggi */}
            <button
              type="button"
              onClick={handleRequestBriefing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-extrabold transition-all cursor-pointer shadow-xs min-h-[38px] active:scale-95 border border-amber-500/80"
              title="Briefing su richiesta: 1 sola priorità reale, 1 baby step e zero prediche (PULL)"
            >
              <Volume2 className="w-4 h-4 text-slate-950" />
              <span>🎙️ Dammi il punto di oggi</span>
            </button>

            {history.length > 1 && (
              <button
                onClick={handleArchivePreviousTasks}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                title="Archivia tutti i compiti delle sessioni precedenti per focalizzarti solo sull'ultima immissione"
              >
                <Archive className="w-3.5 h-3.5 text-slate-500" />
                <span>Archivia compiti vecchi</span>
              </button>
            )}

            {onNavigateToScaricoRapido && (
              <button
                type="button"
                onClick={onNavigateToScaricoRapido}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[38px]"
                title="Passa a Deposito con un solo tocco per scaricare la mente e dettare"
              >
                <span>⚡ Scarico Rapido</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateToAnalysis}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5 text-slate-300" />
              <span>Nuovo input</span>
            </button>
          </div>
        </div>

        {/* Card Briefing Quotidiano PULL (attivata solo su richiesta) */}
        {showBriefing && dailyBriefing && (
          <DailyBriefingCard
            briefing={dailyBriefing}
            onClose={() => setShowBriefing(false)}
            onRefresh={handleRequestBriefing}
            onCompleteBabyStep={handleCompleteBriefingBabyStep}
          />
        )}

        {/* Priorità Attive (Max 3) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider">
            <span>Priorità Attive (Max 3)</span>
            <span className="font-mono text-amber-600 font-bold">{oggiPriorita.length}/3</span>
          </div>

          {oggiPriorita.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 italic bg-slate-50 rounded-xl px-4 text-center">
              Nessuna priorità aperta. Tutte le attività registrate sono concluse.
            </p>
          ) : (
            <div className="space-y-2">
              {oggiPriorita.map((item) => {
                const badge = getOriginBadge(item.origin);
                const BadgeIcon = badge.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      const rec = history.find((r) => r.id === item.recordId);
                      if (rec) onSelectRecord(rec);
                    }}
                    className="flex items-center justify-between gap-3 p-3.5 bg-slate-50/70 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border shrink-0 ${badge.bg}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{item.origin}</span>
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate group-hover:text-slate-950">
                        {item.title}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lower Row: Baby Step Più Importante & Prossima Scadenza (come da PDF) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          
          {/* Box Baby Step */}
          <div className="bg-slate-50/60 border border-slate-200/90 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span className="p-1 rounded-md bg-teal-50 text-teal-600 border border-teal-100">
                <Target className="w-3.5 h-3.5" />
              </span>
              <span>Baby Step Più Importante Subito</span>
            </div>

            {oggiBabyStep ? (
              <div className="space-y-3">
                <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                  {oggiBabyStep.title}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleToggleTask(oggiBabyStep)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Passo decisivo Fatto</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2 italic">
                Nessun baby step pendente.
              </p>
            )}
          </div>

          {/* Box Prossima Scadenza */}
          <div className="bg-slate-50/60 border border-slate-200/90 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span className="p-1 rounded-md bg-amber-50 text-amber-600 border border-amber-100">
                <Calendar className="w-3.5 h-3.5" />
              </span>
              <span>Prossima Scadenza Vincolante</span>
            </div>

            {oggiProssimaScadenza ? (
              <div className="space-y-1">
                <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {oggiProssimaScadenza.oggetto || "Partenza"}
                </div>
                <div className="text-sm font-bold text-rose-500 font-mono">
                  {oggiProssimaScadenza.termine}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2 italic">
                Nessuna scadenza imminente.
              </p>
            )}
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 3. FILTRO MODALITÀ (Fedele a Pagina 2 PDF)                                */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pl-1">
          <Filter className="w-3.5 h-3.5 text-sky-600" />
          <span>Filtro Modalità</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedFilter("tutti")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === "tutti"
                ? "bg-sky-500 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80"
            }`}
          >
            <span>Tutti</span>
            <span className="text-[10px] font-mono opacity-80">{filterCounts.tutti}</span>
          </button>

          <button
            onClick={() => setSelectedFilter("organizzazione")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === "organizzazione"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80"
            }`}
          >
            <span>Organizzazione</span>
            <span className="text-[10px] font-mono opacity-80">{filterCounts.organizzazione}</span>
          </button>

          <button
            onClick={() => setSelectedFilter("decisione")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === "decisione"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80"
            }`}
          >
            <span>Decisione</span>
            <span className="text-[10px] font-mono opacity-80">{filterCounts.decisione}</span>
          </button>

          <button
            onClick={() => setSelectedFilter("consiglio")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === "consiglio"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80"
            }`}
          >
            <span>Consiglio</span>
            <span className="text-[10px] font-mono opacity-80">{filterCounts.consiglio}</span>
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. BABY STEP ATTIVI (Fedele a Pagina 2 PDF)                               */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <span>Baby Step Attivi ({filteredBabySteps.length})</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Prima con scadenza, poi più recenti
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(filteredBabySteps.length > 0 || filteredOpenTasks.length > 0) && (
              <button
                onClick={handleSelectAllVisible}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Seleziona tutti</span>
                <span className="w-4 h-4 rounded border border-slate-300 inline-block align-middle" />
              </button>
            )}
          </div>
        </div>

        {filteredBabySteps.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            Nessun baby step pendente al momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredBabySteps.map((step) => {
              const isSelected = selectedTaskIds.has(step.id);
              const badge = getOriginBadge(step.origin);

              return (
                <div
                  key={step.id}
                  className={`border rounded-xl p-4 space-y-2.5 transition-all ${
                    isSelected
                      ? "bg-sky-50/70 border-sky-300 shadow-xs"
                      : "bg-slate-50/60 hover:bg-slate-100/70 border-slate-200/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectTask(step.id);
                        }}
                        className="mt-0.5 text-slate-400 hover:text-sky-600 cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-sky-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                        )}
                      </button>

                      <button
                        onClick={() => handleToggleTask(step)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 cursor-pointer shrink-0"
                        title="Segna completato"
                      >
                        <Circle className="w-4 h-4" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                          {step.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-amber-700/90 font-mono mt-1 font-semibold">
                          <span>{step.origin}</span>
                          <span>·</span>
                          <span>{step.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(step)}
                        className="p-1 hover:text-sky-600 text-slate-400 transition-colors cursor-pointer"
                        title="Modifica"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(step)}
                        className="p-1 hover:text-red-600 text-slate-400 transition-colors cursor-pointer"
                        title="Elimina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 font-mono text-slate-500">
                    <span className="text-teal-700 font-bold">{step.durataStimata || "5-10 min"}</span>
                    {step.scadenza && (
                      <span className="text-amber-700 font-bold">Scadenza: {step.scadenza}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 5. ATTIVITÀ APERTE (Fedele a Pagina 2 PDF)                                */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <span>Attività Aperte ({filteredOpenTasks.length})</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Tutte le attività non completate
            </p>
          </div>
        </div>

        {filteredOpenTasks.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            Nessuna attività aperta al momento.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredOpenTasks.map((task) => {
              const isEditing = editingTaskId === task.id;
              const isSelected = selectedTaskIds.has(task.id);
              const badge = getOriginBadge(task.origin);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={task.id}
                  className={`border rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    isSelected
                      ? "bg-sky-50/70 border-sky-300 shadow-xs"
                      : "bg-slate-50/60 hover:bg-slate-100/70 border-slate-200/80"
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelectTask(task.id);
                      }}
                      className="mt-0.5 text-slate-400 hover:text-sky-600 cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-sky-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                      )}
                    </button>

                    <button
                      onClick={() => handleToggleTask(task)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 cursor-pointer shrink-0"
                      title="Segna come completata"
                    >
                      <Circle className="w-4 h-4" />
                    </button>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="bg-white border border-sky-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none w-full shadow-xs"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(task)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                            title="Salva"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingTaskId(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="Annulla"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                            {task.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-amber-700 font-mono font-medium">
                            <span className="uppercase">{task.origin}</span>
                            <span>·</span>
                            <span>{task.createdAt}</span>
                            {task.scadenza && (
                              <>
                                <span>·</span>
                                <span className="font-bold text-rose-600">SCADENZA: {task.scadenza.toUpperCase()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleStartEdit(task)}
                        className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title="Modifica attività"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Elimina attività"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 6. SCADENZE (Fedele a Pagina 3 PDF)                                       */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-50 text-amber-600 border border-amber-100">
              <Calendar className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Scadenze ({scadenzeList.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Ordine cronologico
          </span>
        </div>

        {scadenzeList.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            Nessuna scadenza registrata finora.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scadenze Imminenti */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>Imminenti o Vincolanti ({scadenzeImminenti.length})</span>
              </div>
              {scadenzeImminenti.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {s.oggetto}
                    </span>
                    {s.vincolante && (
                      <span className="text-[10px] bg-slate-900 text-white font-mono px-2 py-0.5 rounded font-bold uppercase">
                        Vincolante
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-rose-600 font-bold font-mono">
                    {s.termine}
                  </div>
                </div>
              ))}
            </div>

            {/* Scadenze Future */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Scadenze Future ({scadenzeFuture.length})</span>
              </div>
              {scadenzeFuture.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3.5 bg-slate-50/60 rounded-xl border border-slate-200/60">
                  Nessuna scadenza a medio-lungo termine.
                </p>
              ) : (
                scadenzeFuture.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1"
                  >
                    <div className="text-xs sm:text-sm font-semibold text-slate-900">
                      {s.oggetto}
                    </div>
                    <div className="text-xs text-slate-600 font-mono">
                      {s.termine}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 7. ARCHIVIO ATTIVITÀ CONCLUSE (Fedele a Pagina 3 PDF)                     */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Archivio Attività Concluse ({filteredCompletedTasks.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Storico permanente
          </span>
        </div>

        {filteredCompletedTasks.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            Nessuna attività completata archiviata.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredCompletedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-slate-50/60 border border-slate-200/60 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleTask(task)}
                    className="text-emerald-600 hover:text-slate-400 transition-colors cursor-pointer shrink-0"
                    title="Riapri attività"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="line-through text-slate-400 block font-normal truncate">
                      {task.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {task.origin} · {task.createdAt}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteTask(task)}
                  className="p-1 hover:text-red-600 text-slate-400 transition-colors cursor-pointer"
                  title="Elimina definitivamente dallo storico"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Floating Action Bar per Selezione Multipla */}
      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg bg-white/95 border-2 border-sky-400 shadow-2xl backdrop-blur-md rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-6 fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-mono text-xs font-bold shrink-0">
              {selectedTaskIds.size}
            </span>
            <span className="text-xs font-bold text-slate-900 truncate">
              {selectedTaskIds.size === 1 ? "selezionata" : "selezionate"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleBatchComplete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Completa</span>
            </button>

            <button
              onClick={handleBatchDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Elimina</span>
            </button>

            <button
              onClick={handleClearSelection}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
