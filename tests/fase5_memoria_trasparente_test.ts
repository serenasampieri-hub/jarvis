/**
 * Suite di Collaudo Rigorosa Fase 5:
 * Memoria Storica Trasparente & Controllo Totale (Secondo Cervello)
 * Destinataria esclusiva: Serena Sampieri
 */

// In-Memory Mock di LocalStorage per ambiente Node.js
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

(globalThis as any).localStorage = new MockLocalStorage();

if (!globalThis.crypto) {
  const nodeCrypto = await import("crypto");
  (globalThis as any).crypto = nodeCrypto.webcrypto;
}

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
  getMemoriesForDossier,
  validateAndSanitizeMemory,
  buildMemoryContextForAI,
  createBackupEnvelope,
  validateBackupDryRun,
  executeSafeRestore,
} from "../src/utils/storage";
import { reconcileVaultData } from "../src/utils/syncEngine";
import { JarvisMemoryItem, JarvisDossier, AnalysisRecord } from "../src/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("SUITE COLLAUDO FASE 5: MEMORIA STORICA TRASPARENTE & CONTROLLO TOTALE");
  console.log("================================================================================\n");

  localStorage.clear();

  // ----------------------------------------------------------------------------
  // MEM-01: Creazione memoria di tipo FATTO e IPOTESI
  // ----------------------------------------------------------------------------
  console.log("▶ MEM-01: Creazione memoria di tipo FATTO e IPOTESI con metadati distribuiti");
  const factRes = saveMemory({
    tipo: "fatto",
    categoria: "abitudine",
    testo: "Ogni martedì pomeriggio è dedicato all'approfondimento di scrittura senza notifiche.",
    status: "confermato",
  });
  assert(factRes.success === true, "MEM-01: Creazione fatto deve riuscire");
  assert(factRes.memory !== undefined, "MEM-01: Record fatto deve essere restituito");
  assert(factRes.memory!.tipo === "fatto", "MEM-01: Tipo deve essere 'fatto'");
  assert(factRes.memory!.status === "confermato", "MEM-01: Status deve essere 'confermato'");
  assert(factRes.memory!.revision === 1, "MEM-01: Revision iniziale deve essere 1");
  assert(!!factRes.memory!.deviceId, "MEM-01: deviceId deve essere valorizzato");
  assert(!!factRes.memory!.createdAt, "MEM-01: createdAt ISO deve essere presente");

  const hypoRes = saveMemory({
    tipo: "ipotesi",
    categoria: "progetto",
    testo: "Jarvis ipotizza che anticipare la pianificazione logistica al lunedì riduca l'affanno di metà settimana.",
    status: "da_validare",
  });
  assert(hypoRes.success === true, "MEM-01: Creazione ipotesi deve riuscire");
  assert(hypoRes.memory!.tipo === "ipotesi", "MEM-01: Tipo deve essere 'ipotesi'");
  assert(hypoRes.memory!.status === "da_validare", "MEM-01: Status iniziale deve essere 'da_validare'");
  console.log("  ✅ MEM-01 PASS: Fatti e Ipotesi tipizzati correttamente con metadati stabili.");

  // ----------------------------------------------------------------------------
  // MEM-02: Divieto categorico di inferenze psicologiche ed etichette arbitrarie
  // ----------------------------------------------------------------------------
  console.log("\n▶ MEM-02: Divieto etico assoluto di etichette psicologiche sull'identità di Serena");
  const badTest1 = validateAndSanitizeMemory("Serena è una procrastinatrice cronica che non porta a termine i piani.");
  assert(badTest1.isValid === false, "MEM-02: Procrastinatrice cronica deve essere respinta");
  assert(badTest1.error?.includes("divieto tassativo di formulare etichette psicologiche") === true, "MEM-02: Errore etico esplicito");

  const badTest2 = validateAndSanitizeMemory("Serena ha una cronica incapacità di gestire il tempo ed è pigra.");
  assert(badTest2.isValid === false, "MEM-02: Giudizio denigratorio deve essere respinto");

  const badTest3 = validateAndSanitizeMemory("Serena soffre di disturbo della personalità e ansiosa per natura.");
  assert(badTest3.isValid === false, "MEM-02: Diagnosi arbitraria deve essere respinta");

  const goodTest = validateAndSanitizeMemory("Serena preferisce completare sessioni da 45 minuti e poi riposare.");
  assert(goodTest.isValid === true, "MEM-02: Preferenza oggettiva lecita deve essere ammessa");
  console.log("  ✅ MEM-02 PASS: Divieto assoluto di etichette e diagnosi psicologiche rispettato al 100%.");

  // ----------------------------------------------------------------------------
  // MEM-03: Barriera perimetrale ASL / MUM su memorie e dossier
  // ----------------------------------------------------------------------------
  console.log("\n▶ MEM-03: Barriera perimetrale ASL Roma 1 & Progetto MUM su memorie e dossier");
  const aslMemRes = saveMemory({
    tipo: "fatto",
    categoria: "decisione",
    testo: "Aggiornare la delibera ASL Roma 1 per la gara protesica e inviare al protocollo.",
  });
  assert(aslMemRes.success === false, "MEM-03: Memoria con dati ASL deve essere respinta");
  assert(aslMemRes.error?.includes("Violazione perimetro") === true, "MEM-03: Errore deve citare violazione perimetro");

  const mumMemRes = saveMemory({
    tipo: "fatto",
    categoria: "progetto",
    testo: "Montare l'audio del podcast del progetto MUM per la pubblicazione.",
  });
  assert(mumMemRes.success === false, "MEM-03: Memoria MUM deve essere respinta");

  const aslDossierRes = saveDossier({
    titolo: "Atti Direzione ASL",
    descrizione: "Pratiche interne ufficio",
  });
  assert(aslDossierRes.success === false, "MEM-03: Dossier ASL deve essere respinto");

  const personalHealthRes = saveMemory({
    tipo: "fatto",
    categoria: "personale",
    testo: "Visita oculistica personale di controllo prenotata per il 15 novembre.",
  });
  assert(personalHealthRes.success === true, "MEM-03: Salute personale legittima deve essere ammessa");
  console.log("  ✅ MEM-03 PASS: Barriera perimetrale ASL/MUM impenetrabile anche nella memoria permanente.");

  // ----------------------------------------------------------------------------
  // MEM-04: Transizione Ipotesi -> Fatto (Controllo Sovrano di Validazione)
  // ----------------------------------------------------------------------------
  console.log("\n▶ MEM-04: Transizione controllata Ipotesi -> Fatto (Controllo Sovrano)");
  const hypoToConfirm = saveMemory({
    tipo: "ipotesi",
    testo: "Passeggiata di 15 minuti all'aria aperta prima di iniziare la scrittura favorisce la concentrazione.",
    status: "da_validare",
  });
  assert(hypoToConfirm.success === true && !!hypoToConfirm.memory, "Setup ipotesi");
  const hypoId = hypoToConfirm.memory!.id;

  const confirmRes = confirmHypothesis(hypoId);
  assert(confirmRes.success === true, "MEM-04: Conferma ipotesi deve riuscire");
  assert(confirmRes.memory!.tipo === "fatto", "MEM-04: Tipo deve essere promosso a 'fatto'");
  assert(confirmRes.memory!.status === "confermato", "MEM-04: Status deve diventare 'confermato'");
  assert(confirmRes.memory!.revision === 2, "MEM-04: Revision deve essere incrementata a 2");

  // Rifiuto di un'ipotesi
  const hypoToReject = saveMemory({
    tipo: "ipotesi",
    testo: "Sveglia alle 05:00 del mattino per lavorare prima di colazione.",
    status: "da_validare",
  });
  assert(hypoToReject.success === true && !!hypoToReject.memory, "Setup ipotesi da rifiutare");
  const rejectRes = rejectHypothesis(hypoToReject.memory!.id);
  assert(rejectRes === true, "MEM-04: Rifiuto ipotesi deve riuscire");
  const activeMems = loadMemories(false);
  assert(!activeMems.some((m) => m.id === hypoToReject.memory!.id), "MEM-04: Ipotesi rifiutata non deve comparire tra quelle attive");
  console.log("  ✅ MEM-04 PASS: Validazione sovrana Ipotesi -> Fatto e rifiuto certificati.");

  // ----------------------------------------------------------------------------
  // MEM-05: Modifica ed eliminazione sovrana con tombstone
  // ----------------------------------------------------------------------------
  console.log("\n▶ MEM-05: Modifica in linea ed eliminazione non distruttiva (tombstone)");
  const memToEdit = saveMemory({
    tipo: "fatto",
    testo: "Orario ideale di sonno: dalle 23:30 alle 07:30.",
    categoria: "abitudine",
  });
  const memId = memToEdit.memory!.id;

  const updateRes = updateMemory(memId, {
    testo: "Orario ideale di sonno: dalle 23:00 alle 07:00 (aggiornato per l'autunno).",
  });
  assert(updateRes.success === true, "MEM-05: Modifica in linea deve riuscire");
  assert(updateRes.memory!.revision === 2, "MEM-05: Revision deve essere 2");
  assert(updateRes.memory!.testo.includes("23:00 alle 07:00"), "MEM-05: Testo aggiornato");

  // Soft delete con tombstone
  const deleteOutcome = deleteMemory(memId, true);
  assert(deleteOutcome === true, "MEM-05: Cancellazione deve riuscire");
  const afterDeleteActive = loadMemories(false);
  assert(!afterDeleteActive.some((m) => m.id === memId), "MEM-05: Record non visibile nelle memorie attive");
  const afterDeleteAll = loadMemories(true);
  const deletedItem = afterDeleteAll.find((m) => m.id === memId);
  assert(deletedItem !== undefined && !!deletedItem.deletedAt, "MEM-05: Tombstone deletedAt presente per sync");
  assert(deletedItem!.revision === 3, "MEM-05: Revision incrementata a 3 su cancellazione");
  console.log("  ✅ MEM-05 PASS: Modifica ed eliminazione con tombstone verificati al 100%.");

  // ----------------------------------------------------------------------------
  // MEM-06: Dossier tematici evolutivi e raggruppamento
  // ----------------------------------------------------------------------------
  console.log("\n▶ MEM-06: Dossier tematici evolutivi e collegamenti di progetto");
  const initialDossiers = loadDossiers(false);
  assert(initialDossiers.length >= 4, "MEM-06: Dossier iniziali di default presenti (Benessere, Casa, Finanze, Scrittura)");

  const newDosRes = saveDossier({
    titolo: "Riorganizzazione Studio Personale",
    descrizione: "Postazione ergonomica, archivio libri e illuminazione",
    stato: "attivo",
  });
  assert(newDosRes.success === true && !!newDosRes.dossier, "MEM-06: Creazione nuovo dossier deve riuscire");
  const studioDossierId = newDosRes.dossier!.id;

  saveMemory({
    tipo: "fatto",
    categoria: "progetto",
    progettoId: studioDossierId,
    progettoNome: "Riorganizzazione Studio Personale",
    testo: "Acquistata sedia ergonomica con supporto lombare regolabile.",
  });

  saveMemory({
    tipo: "fatto",
    categoria: "progetto",
    progettoId: studioDossierId,
    progettoNome: "Riorganizzazione Studio Personale",
    testo: "Spazio scaffali liberato: ordinati 3 contenitori per appunti.",
  });

  const studioMemories = getMemoriesForDossier(studioDossierId);
  assert(studioMemories.length === 2, "MEM-06: getMemoriesForDossier deve restituire esattamente i 2 fatti collegati");
  console.log("  ✅ MEM-06 PASS: Dossier evolutivi e aggregazione memorie verificati.");

  // ----------------------------------------------------------------------------
  // MEM-07: Costruzione contesto trasparente per l'AI (buildMemoryContextForAI)
  // ----------------------------------------------------------------------------
  console.log("\n▶ MEM-07: Costruzione contesto trasparente per l'AI (Solo fatti certi)");
  // Aggiungi un'ipotesi NON ancora confermata
  saveMemory({
    tipo: "ipotesi",
    testo: "IPOTESI DI TEST CHE NON DEVE MAI FINIRE NEL CONTESTO AI.",
    status: "da_validare",
  });

  const aiContext = buildMemoryContextForAI();
  assert(aiContext.factsCount > 0, "MEM-07: factsCount deve essere > 0");
  assert(aiContext.promptSnippet.includes("FATTI & PREFERENZE ACCERTATE:"), "MEM-07: Header fatti presente");
  assert(aiContext.promptSnippet.includes("DIVIETO CATEGORICO"), "MEM-07: Direttive etiche presenti nel contesto");
  assert(!aiContext.promptSnippet.includes("IPOTESI DI TEST CHE NON DEVE MAI FINIRE"), "MEM-07: Le ipotesi non validate NON devono mai entrare nel contesto!");
  console.log("  ✅ MEM-07 PASS: Solo fatti certi e regole etiche iniettati nel contesto AI.");

  // ----------------------------------------------------------------------------
  // MEM-08: Integrazione Envelope di Backup e Hash Canonico SHA-256
  // ----------------------------------------------------------------------------
  console.log("\n▶ MEM-08: Integrazione Envelope di Backup e Hash Canonico SHA-256");
  const backup = await createBackupEnvelope();
  assert(backup.envelope.schemaVersion === 1, "MEM-08: schemaVersion 1");
  assert(backup.envelope.payload.memories !== undefined, "MEM-08: memories presenti nel payload dell'envelope");
  assert(backup.envelope.payload.dossiers !== undefined, "MEM-08: dossiers presenti nel payload");
  assert(backup.envelope.stats.memoriesCount !== undefined && backup.envelope.stats.memoriesCount > 0, "MEM-08: stats.memoriesCount valorizzato");
  assert(!!backup.envelope.sha256Checksum, "MEM-08: Checksum SHA-256 presente");

  // Dry run su backup valido
  const dryRunOk = await validateBackupDryRun(backup.jsonString);
  assert(dryRunOk.isValid === true, "MEM-08: Dry run su backup con memorie deve essere valido");

  // Alterazione malevola del testo di una memoria nel backup
  const parsedBackup = JSON.parse(backup.jsonString);
  parsedBackup.payload.memories[0].testo += " (alterazione non firmata)";
  const dryRunCorrupted = await validateBackupDryRun(JSON.stringify(parsedBackup));
  assert(dryRunCorrupted.isValid === false, "MEM-08: Alterazione memoria deve invalidare l'hash SHA-256 canonico");

  // Restore effettivo transazionale
  const restoreRes = await executeSafeRestore(backup.jsonString);
  assert(restoreRes.success === true, "MEM-08: executeSafeRestore deve avere successo");
  const restoredMemories = loadMemories(false);
  assert(restoredMemories.length > 0, "MEM-08: Memorie ripristinate nello storage");
  console.log("  ✅ MEM-08 PASS: Envelope crittografico con memorie e dossier pienamente convalidato.");

  // ----------------------------------------------------------------------------
  // MEM-09: Riconciliazione Sync deterministica a 3 vie per Memorie e Dossier
  // ----------------------------------------------------------------------------
  console.log("\n▶ MEM-09: Riconciliazione Sync a 3 vie (Merge additivo, revisioni, tombstone)");
  const localMem1: JarvisMemoryItem = {
    id: "mem_sync_local_01",
    tipo: "fatto",
    testo: "Solo su locale",
    status: "confermato",
    createdAt: "2026-10-09T10:00:00Z",
    updatedAt: "2026-10-09T10:00:00Z",
    revision: 1,
    deviceId: "dev_local",
  };

  const remoteMem1: JarvisMemoryItem = {
    id: "mem_sync_remote_01",
    tipo: "fatto",
    testo: "Solo su remoto (iPhone)",
    status: "confermato",
    createdAt: "2026-10-09T10:30:00Z",
    updatedAt: "2026-10-09T10:30:00Z",
    revision: 1,
    deviceId: "dev_phone",
  };

  // Conflitto: stesso ID, versione remota ha revision 2
  const conflictLocal: JarvisMemoryItem = {
    id: "mem_sync_conflict_01",
    tipo: "fatto",
    testo: "Versione locale vecchia",
    status: "confermato",
    createdAt: "2026-10-09T09:00:00Z",
    updatedAt: "2026-10-09T09:00:00Z",
    revision: 1,
    deviceId: "dev_local",
  };

  const conflictRemote: JarvisMemoryItem = {
    id: "mem_sync_conflict_01",
    tipo: "fatto",
    testo: "Versione remota aggiornata su iPhone",
    status: "confermato",
    createdAt: "2026-10-09T09:00:00Z",
    updatedAt: "2026-10-09T11:00:00Z",
    revision: 2,
    deviceId: "dev_phone",
  };

  // Tombstone sync: cancellato su locale, attivo su remoto
  const tombstoneLocal: JarvisMemoryItem = {
    id: "mem_sync_tombstone_01",
    tipo: "fatto",
    testo: "Cancellato su computer",
    status: "confermato",
    createdAt: "2026-10-09T08:00:00Z",
    updatedAt: "2026-10-09T11:30:00Z",
    revision: 2,
    deviceId: "dev_local",
    deletedAt: "2026-10-09T11:30:00Z",
  };

  const tombstoneRemote: JarvisMemoryItem = {
    id: "mem_sync_tombstone_01",
    tipo: "fatto",
    testo: "Cancellato su computer",
    status: "confermato",
    createdAt: "2026-10-09T08:00:00Z",
    updatedAt: "2026-10-09T08:00:00Z",
    revision: 1,
    deviceId: "dev_phone",
  };

  const syncResult = reconcileVaultData(
    {
      history: [],
      settings: { salvataggioAutomatico: true },
      memories: [localMem1, conflictLocal, tombstoneLocal],
    },
    {
      history: [],
      settings: { salvataggioAutomatico: true },
      memories: [remoteMem1, conflictRemote, tombstoneRemote],
    }
  );

  assert(syncResult.mergedMemories !== undefined, "MEM-09: mergedMemories deve essere valorizzato");
  assert(syncResult.mergedMemories!.length === 4, "MEM-09: 4 memorie unificate");

  // Verifica winner su conflitto
  const resolvedConflict = syncResult.mergedMemories!.find((m) => m.id === "mem_sync_conflict_01");
  assert(resolvedConflict !== undefined, "MEM-09: Record conflitto presente");
  assert(resolvedConflict!.revision === 2, "MEM-09: Revision vincente deve essere 2");
  assert(resolvedConflict!.testo === "Versione remota aggiornata su iPhone", "MEM-09: Testo deve essere quello di revision 2");

  // Verifica tombstone anti-resurrezione
  const resolvedTombstone = syncResult.mergedMemories!.find((m) => m.id === "mem_sync_tombstone_01");
  assert(resolvedTombstone !== undefined && !!resolvedTombstone.deletedAt, "MEM-09: Tombstone preservato, nessuna resurrezione");
  console.log("  ✅ MEM-09 PASS: Riconciliazione a 3 vie delle memorie deterministica e coerente.");

  // ----------------------------------------------------------------------------
  // MEM-10: Retrocompatibilità archivi legacy (senza memorie né dossier)
  // ----------------------------------------------------------------------------
  console.log("\n▶ MEM-10: Retrocompatibilità totale con backup legacy (senza memorie)");
  const legacyRecord: AnalysisRecord = {
    id: "rec_legacy_01",
    timestamp: "2026-10-08T10:00:00.000Z",
    rawInput: "Analisi legacy creata prima della Fase 5.",
    modalita: "deposito",
    fuoriPerimetro: false,
  };
  const legacyPayload = {
    history: [legacyRecord],
    settings: { salvataggioAutomatico: true },
  };
  const canonicalLegacy = (await import("../src/utils/crypto")).canonicalJsonStringify(legacyPayload);
  const legacyHash = await (await import("../src/utils/crypto")).computeSha256(canonicalLegacy);

  const legacyEnvelope = {
    schemaVersion: 1,
    appVersion: "1.0.0",
    exportedAt: "2026-10-08T10:00:00.000Z",
    deviceId: "dev_legacy",
    stats: {
      totalRecords: 1,
      openTasks: 0,
      completedTasks: 0,
      babyStepsCount: 0,
      scadenzeCount: 0,
      surveyAnsweredQuestions: 0,
    },
    sha256Checksum: legacyHash,
    payload: legacyPayload,
  };

  const legacyJson = JSON.stringify(legacyEnvelope);
  const dryRunLegacy = await validateBackupDryRun(legacyJson);
  assert(dryRunLegacy.isValid === true, "MEM-10: Dry run su archivio legacy deve passare al 100%");

  const restoreLegacyRes = await executeSafeRestore(legacyJson);
  assert(restoreLegacyRes.success === true, "MEM-10: Ripristino archivio legacy deve riuscire senza eccezioni");
  console.log("  ✅ MEM-10 PASS: Retrocompatibilità garantita al 100% per i backup storici.");

  console.log("\n================================================================================");
  console.log("ESITO FINALE FASE 5: TUTTI I 10 CRITERI DI MEMORIA TRASPARENTE SUPERATI AL 100%");
  console.log("================================================================================\n");
}

runTestSuite().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
