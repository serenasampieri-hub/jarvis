import React, { useState, useEffect } from "react";
import {
  Brain,
  CheckCircle2,
  HelpCircle,
  Folder,
  FolderPlus,
  Trash2,
  Edit3,
  Plus,
  ShieldAlert,
  Clock,
  X,
  Save,
  Tag,
  AlertTriangle,
} from "lucide-react";
import {
  JarvisMemoryItem,
  JarvisDossier,
  MemoryType,
  MemoryCategory,
} from "../types";
import {
  loadMemories,
  saveMemory,
  updateMemory,
  deleteMemory,
  confirmHypothesis,
  rejectHypothesis,
  loadDossiers,
  saveDossier,
  deleteDossier,
  validateAndSanitizeMemory,
} from "../utils/memoryManager";

interface MemoryDossierManagerProps {
  onMemoryChanged?: () => void;
  onClose?: () => void;
}

export const MemoryDossierManager: React.FC<MemoryDossierManagerProps> = ({
  onMemoryChanged,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"fatti" | "ipotesi" | "dossier">("fatti");
  const [memories, setMemories] = useState<JarvisMemoryItem[]>([]);
  const [dossiers, setDossiers] = useState<JarvisDossier[]>([]);

  // Form Nuovo Fatto
  const [isAddingFact, setIsAddingFact] = useState(false);
  const [newFactText, setNewFactText] = useState("");
  const [newFactCategory, setNewFactCategory] = useState<MemoryCategory>("personale");
  const [newFactDossierId, setNewFactDossierId] = useState<string>("");
  const [factError, setFactError] = useState<string | null>(null);

  // Form Nuovo Dossier
  const [isAddingDossier, setIsAddingDossier] = useState(false);
  const [newDossierTitle, setNewDossierTitle] = useState("");
  const [newDossierDesc, setNewDossierDesc] = useState("");
  const [dossierError, setDossierError] = useState<string | null>(null);

  // Editing in-place
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const refreshData = () => {
    const loadedMem = loadMemories(false);
    const loadedDos = loadDossiers(false);
    setMemories(loadedMem);
    setDossiers(loadedDos);
    if (onMemoryChanged) onMemoryChanged();
  };

  useEffect(() => {
    refreshData();
  }, []);

  const fattiList = memories.filter((m) => m.tipo === "fatto" || m.tipo === "preferenza");
  const ipotesiList = memories.filter((m) => m.tipo === "ipotesi" && m.status === "da_validare");

  // Salvataggio nuovo fatto
  const handleSaveNewFact = () => {
    setFactError(null);
    const validation = validateAndSanitizeMemory(newFactText);
    if (!validation.isValid) {
      setFactError(validation.error || "Testo non valido.");
      return;
    }

    const selectedDos = dossiers.find((d) => d.id === newFactDossierId);
    const result = saveMemory({
      tipo: "fatto",
      categoria: newFactCategory,
      progettoId: newFactDossierId || undefined,
      progettoNome: selectedDos?.titolo || undefined,
      testo: validation.sanitizedText,
      status: "confermato",
    });

    if (result.success) {
      setNewFactText("");
      setNewFactDossierId("");
      setIsAddingFact(false);
      refreshData();
    } else {
      setFactError(result.error || "Impossibile salvare il fatto.");
    }
  };

  // Salvataggio nuovo dossier
  const handleSaveNewDossier = () => {
    setDossierError(null);
    if (!newDossierTitle.trim()) {
      setDossierError("Il titolo del dossier è obbligatorio.");
      return;
    }

    const result = saveDossier({
      titolo: newDossierTitle.trim(),
      descrizione: newDossierDesc.trim() || undefined,
      stato: "attivo",
    });

    if (result.success) {
      setNewDossierTitle("");
      setNewDossierDesc("");
      setIsAddingDossier(false);
      refreshData();
    } else {
      setDossierError(result.error || "Impossibile creare il dossier.");
    }
  };

  // Modifica testo in linea
  const handleStartEdit = (mem: JarvisMemoryItem) => {
    setEditingMemoryId(mem.id);
    setEditingText(mem.testo);
    setEditError(null);
  };

  const handleSaveEdit = (id: string) => {
    setEditError(null);
    const result = updateMemory(id, { testo: editingText });
    if (result.success) {
      setEditingMemoryId(null);
      setEditingText("");
      refreshData();
    } else {
      setEditError(result.error || "Errore durante la modifica.");
    }
  };

  const handleCancelEdit = () => {
    setEditingMemoryId(null);
    setEditingText("");
    setEditError(null);
  };

  // Cancellazione memoria
  const handleDeleteMemory = (id: string) => {
    deleteMemory(id, true);
    refreshData();
  };

  // Validazione ipotesi
  const handleConfirmHypothesis = (id: string) => {
    confirmHypothesis(id);
    refreshData();
  };

  const handleRejectHypothesis = (id: string) => {
    rejectHypothesis(id);
    refreshData();
  };

  // Cancellazione dossier
  const handleDeleteDossier = (id: string) => {
    deleteDossier(id, true);
    refreshData();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
      {/* Testata della Sezione Memoria */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
              <Brain className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Memoria Storica & Secondo Cervello
            </h2>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Controllo Sovrano 100%
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Tutto ciò che Jarvis ricorda è visibile, modificabile e cancellabile con un tocco. Nessuna inferenza psicologia o etichetta non dimostrata.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="self-end sm:self-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Chiudi pannello memoria"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Pillole di Navigazione Tab Interna */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab("fatti")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "fatti"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fatti & Preferenze</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {fattiList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ipotesi")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "ipotesi"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Ipotesi da Validare</span>
            {ipotesiList.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                {ipotesiList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dossier")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "dossier"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-sky-600" />
            <span>Dossier Progettuali</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {dossiers.length}
            </span>
          </button>
        </div>

        {/* Azione di Aggiunta */}
        {activeTab === "fatti" && !isAddingFact && (
          <button
            type="button"
            onClick={() => setIsAddingFact(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Aggiungi Fatto Certo</span>
          </button>
        )}

        {activeTab === "dossier" && !isAddingDossier && (
          <button
            type="button"
            onClick={() => setIsAddingDossier(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs min-h-[36px]"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Nuovo Dossier</span>
          </button>
        )}
      </div>

      {/* FORM: AGGIUNGI FATTO CERTO */}
      {isAddingFact && (
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Registra un Fatto Certo o una Preferenza Personale</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsAddingFact(false);
                setFactError(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={newFactText}
            onChange={(e) => setNewFactText(e.target.value)}
            placeholder="Es. 'Il giovedì mattina ho il corso di nuoto alle 08:30' oppure 'Preferisco non fissare call dopo le 18:00'"
            className="w-full p-3 rounded-lg border border-emerald-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="text-slate-600 font-medium">Dossier:</label>
              <select
                value={newFactDossierId}
                onChange={(e) => setNewFactDossierId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800"
              >
                <option value="">Nessun dossier specifico (Generale)</option>
                {dossiers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.titolo}
                  </option>
                ))}
              </select>

              <label className="text-slate-600 font-medium ml-2">Categoria:</label>
              <select
                value={newFactCategory}
                onChange={(e) => setNewFactCategory(e.target.value as MemoryCategory)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800"
              >
                <option value="personale">Personale</option>
                <option value="abitudine">Abitudine / Ritmo</option>
                <option value="vincolo">Vincolo Orario</option>
                <option value="decisione">Decisione Presa</option>
                <option value="progetto">Progetto</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingFact(false);
                  setFactError(null);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium text-xs cursor-pointer min-h-[36px]"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSaveNewFact}
                disabled={!newFactText.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50 min-h-[36px]"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salva nel Cervello</span>
              </button>
            </div>
          </div>

          {factError && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{factError}</span>
            </div>
          )}
        </div>
      )}

      {/* FORM: AGGIUNGI NUOVO DOSSIER */}
      {isAddingDossier && (
        <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-sky-600" />
              <span>Crea Nuovo Dossier Progettuale Personale</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsAddingDossier(false);
                setDossierError(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={newDossierTitle}
            onChange={(e) => setNewDossierTitle(e.target.value)}
            placeholder="Titolo dossier (es. 'Riorganizzazione Studio', 'Scrittura Saggio Personale')"
            className="w-full p-2.5 rounded-lg border border-sky-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          <input
            type="text"
            value={newDossierDesc}
            onChange={(e) => setNewDossierDesc(e.target.value)}
            placeholder="Descrizione sintetica degli obiettivi e del perimetro personale"
            className="w-full p-2.5 rounded-lg border border-sky-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAddingDossier(false);
                setDossierError(null);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium text-xs cursor-pointer min-h-[36px]"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSaveNewDossier}
              disabled={!newDossierTitle.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50 min-h-[36px]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Crea Dossier</span>
            </button>
          </div>

          {dossierError && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{dossierError}</span>
            </div>
          )}
        </div>
      )}

      {/* SEZIONE 1: TAB FATTI E PREFERENZE */}
      {activeTab === "fatti" && (
        <div className="space-y-3">
          {fattiList.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-xl space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-slate-700">Nessun fatto ancora registrato</div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Registra i tuoi primi punti fermi o preferenze personali per consentire a Jarvis di mantenere coerenza senza compiacimento.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {fattiList.map((f) => {
                const isEditing = editingMemoryId === f.id;
                return (
                  <div
                    key={f.id}
                    className="p-3 sm:p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>FATTO</span>
                        </span>

                        {f.progettoNome && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200">
                            <Tag className="w-3 h-3 text-sky-600" />
                            <span>{f.progettoNome}</span>
                          </span>
                        )}

                        {f.categoria && (
                          <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {f.categoria}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(f.updatedAt || f.createdAt).toLocaleDateString("it-IT")}
                        </span>
                      </div>

                      {/* Azioni Modifica / Elimina */}
                      <div className="flex items-center gap-1">
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(f)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Modifica questo fatto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(f.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Dimentica ed elimina definitivamente questa memoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Testo o Editor in Linea */}
                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-sky-400 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[60px]"
                        />
                        {editError && (
                          <div className="text-[11px] text-rose-700 font-medium">
                            {editError}
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Annulla
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(f.id)}
                            className="flex items-center gap-1 px-3 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs"
                          >
                            <Save className="w-3 h-3" />
                            <span>Salva Modifica</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                        {f.testo}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SEZIONE 2: TAB IPOTESI DA VALIDARE */}
      {activeTab === "ipotesi" && (
        <div className="space-y-3">
          {ipotesiList.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-xl space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-slate-700">Nessuna ipotesi in sospeso</div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Tutte le deduzioni formulate da Jarvis sono state confermate come fatti oggettivi oppure scartate. Nessuna inferenza non convalidata è attiva.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Controllo Sovrano:</strong> Queste deduzioni sono state proposte da Jarvis ma <em>non sono ancora considerate fatti</em>. Solo se confermi con "Conferma come Fatto" entreranno nella memoria permanente.
                </div>
              </div>

              {ipotesiList.map((h) => (
                <div
                  key={h.id}
                  className="p-4 rounded-xl border border-amber-200/90 bg-amber-50/30 space-y-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                      <span>[IPOTESI DA VALIDARE]</span>
                    </span>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(h.createdAt).toLocaleDateString("it-IT")}
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-900 leading-relaxed font-medium bg-white p-3 rounded-lg border border-amber-200/70">
                    "{h.testo}"
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleRejectHypothesis(h.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Rifiuta / Dimentica</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConfirmHypothesis(h.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs min-h-[36px]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Conferma come Fatto Certo</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEZIONE 3: TAB DOSSIER TEMATICI */}
      {activeTab === "dossier" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dossiers.map((d) => {
              const memCount = memories.filter((m) => m.progettoId === d.id).length;
              return (
                <div
                  key={d.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-sky-100 text-sky-700">
                        <Folder className="w-4 h-4" />
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        {d.titolo}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 font-semibold">
                        {memCount} memorie
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDossier(d.id)}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Elimina dossier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {d.descrizione && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {d.descrizione}
                    </p>
                  )}

                  <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-200/60 mt-2">
                    <span>Stato: <strong className="text-emerald-700 uppercase">{d.stato}</strong></span>
                    <span>Aggiornato: {new Date(d.updatedAt || d.createdAt).toLocaleDateString("it-IT")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
