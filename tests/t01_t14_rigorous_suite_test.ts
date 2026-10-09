import {
  createBackupEnvelope,
  validateBackupDryRun,
  executeSafeRestore,
  restoreSafetySnapshot,
  loadHistory,
  saveAnalysisRecord,
  saveSettings,
  loadSettings,
  saveBetaSurvey,
  loadBetaSurvey,
} from "../src/utils/storage";
import {
  classifyPerimeter,
  scanObjectForPerimeterViolations,
} from "../src/utils/perimeter";
import { canonicalJsonStringify, computeSha256 } from "../src/utils/crypto";
import { AnalysisRecord } from "../src/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

// In-Memory Mock di LocalStorage per ambiente Node.js
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
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

async function runTestSuite() {
  console.log("================================================================================");
  console.log("SUITE DI COLLAUDO RIGOROSA: T01 - T14 (STEP 1 DA CHIUDERE & STEP 2 DA RINFORZARE)");
  console.log("================================================================================\n");

  // ============================================================================
  // PARTE 1: TEST INDISPENSABILI PER CHIUDERE DAVVERO LO STEP 1 (T01 - T06)
  // ============================================================================
  console.log("--------------------------------------------------------------------------------");
  console.log("PARTE 1: TEST INDISPENSABILI PER CHIUDERE LO STEP 1");
  console.log("--------------------------------------------------------------------------------");

  // Setup iniziale stato pulito
  localStorage.clear();
  const baseRecord: AnalysisRecord = {
    id: "rec_base_01",
    timestamp: "2026-10-09T12:00:00.000Z",
    rawInput: "Test iniziale valido per setup.",
    titoloProgetto: "Setup Base",
    modalita: "deposito",
    fuoriPerimetro: false,
    deposito: {
      sintesi: "Sintesi base valida",
      chiaviDiPensiero: ["base", "setup"],
    },
  };
  saveAnalysisRecord(baseRecord);
  saveSettings({ salvataggioAutomatico: true });

  const validExport = await createBackupEnvelope();

  // ----------------------------------------------------------------------------
  // T01 - Backup corrotto (hash non valido)
  // ----------------------------------------------------------------------------
  console.log("\n[T01] Backup corrotto: alterazione di una singola lettera nel payload con hash invariato...");
  const parsedCorrupt = JSON.parse(validExport.jsonString);
  // Modifichiamo una singola lettera nel payload
  parsedCorrupt.payload.history[0].rawInput = "Test iniziale calido per setup."; // 'v' -> 'c'
  const corruptedJsonT01 = JSON.stringify(parsedCorrupt);

  const dryRunT01 = await validateBackupDryRun(corruptedJsonT01);
  assert(dryRunT01.isValid === false, "T01: Dry run deve respingere il backup corrotto");
  assert(
    dryRunT01.errors.some((e) => e.includes("Integrità compromessa") || e.includes("non corrisponde")),
    "T01: Deve restituire errore esplicito di discrepanza hash"
  );

  // Tentativo di restore effettivo
  const restoreOutcomeT01 = await executeSafeRestore(corruptedJsonT01);
  assert(restoreOutcomeT01.success === false, "T01: executeSafeRestore deve fallire");
  assert(
    restoreOutcomeT01.error !== undefined && restoreOutcomeT01.error.includes("Ripristino rifiutato"),
    "T01: Messaggio di errore deve essere esplicito"
  );
  // Verifica nessuna scrittura su localStorage
  const currentHistoryT01 = loadHistory();
  assert(currentHistoryT01.length === 1, "T01: Numero record in storage locale deve restare intatto");
  assert(currentHistoryT01[0].rawInput === "Test iniziale valido per setup.", "T01: Dati locali non devono essere alterati");
  console.log("   -> [PASS] T01: Backup alterato respinto, zero scritture, messaggio chiaro.");

  // ----------------------------------------------------------------------------
  // T02 - Backup con hash mancante
  // ----------------------------------------------------------------------------
  console.log("\n[T02] Backup con hash mancante (rimozione sha256Checksum)...");
  const parsedNoHash = JSON.parse(validExport.jsonString);
  delete parsedNoHash.sha256Checksum;
  const noHashJsonT02 = JSON.stringify(parsedNoHash);

  const dryRunT02 = await validateBackupDryRun(noHashJsonT02);
  assert(dryRunT02.isValid === false, "T02: Dry run deve respingere file privo di hash");
  assert(
    dryRunT02.errors.some((e) => e.includes("sha256Checksum") && e.includes("mancante")),
    "T02: Deve segnalare campo obbligatorio sha256Checksum mancante"
  );

  const restoreOutcomeT02 = await executeSafeRestore(noHashJsonT02);
  assert(restoreOutcomeT02.success === false, "T02: executeSafeRestore deve rifiutare restore");
  assert(loadHistory()[0].rawInput === "Test iniziale valido per setup.", "T02: Dati locali intatti");
  console.log("   -> [PASS] T02: Restore rifiutato per hash mancante, zero modifiche locali.");

  // ----------------------------------------------------------------------------
  // T03 - Backup con schemaVersion sconosciuta (schemaVersion 999 e schemaVersion 0)
  // ----------------------------------------------------------------------------
  console.log("\n[T03] Backup con schemaVersion sconosciuta (test su 999 e su 0)...");
  // Test schemaVersion: 999
  const parsedV999 = JSON.parse(validExport.jsonString);
  parsedV999.schemaVersion = 999;
  const v999Json = JSON.stringify(parsedV999);
  const dryRunV999 = await validateBackupDryRun(v999Json);
  assert(dryRunV999.isValid === false, "T03: schemaVersion 999 deve essere rifiutata");
  assert(
    dryRunV999.errors.some((e) => e.includes("Versione schema futura (999)")),
    "T03: Errore esplicito di versione futura non supportata"
  );

  // Test schemaVersion: 0
  const parsedV0 = JSON.parse(validExport.jsonString);
  parsedV0.schemaVersion = 0;
  const v0Json = JSON.stringify(parsedV0);
  const dryRunV0 = await validateBackupDryRun(v0Json);
  assert(dryRunV0.isValid === false, "T03: schemaVersion 0 deve essere rifiutata");
  assert(
    dryRunV0.errors.some((e) => e.includes("Versione schema non valida (0)")),
    "T03: Errore esplicito di versione schema non valida"
  );

  const restoreOutcomeT03 = await executeSafeRestore(v999Json);
  assert(restoreOutcomeT03.success === false, "T03: Restore con schemaVersion futura deve fallire");
  console.log("   -> [PASS] T03: Rifiuto documentato sia per versione 999 sia per versione 0.");

  // ----------------------------------------------------------------------------
  // T04 - Backup JSON malformato
  // ----------------------------------------------------------------------------
  console.log("\n[T04] Backup JSON malformato (parentesi mancante o sintassi troncata)...");
  const malformedJson = '{\n  "schemaVersion": 1,\n  "history": [\n'; // JSON tronco non chiuso

  const dryRunT04 = await validateBackupDryRun(malformedJson);
  assert(dryRunT04.isValid === false, "T04: Dry run deve fallire su JSON tronco");
  assert(
    dryRunT04.errors.some((e) => e.includes("Errore di sintassi JSON")),
    "T04: Errore di parsing deve essere intercettato e documentato"
  );

  const restoreOutcomeT04 = await executeSafeRestore(malformedJson);
  assert(restoreOutcomeT04.success === false, "T04: executeSafeRestore deve fallire senza crash");
  assert(loadHistory().length === 1, "T04: Nessuna scrittura effettuata.");
  console.log("   -> [PASS] T04: Errore di sintassi gestito, nessun crash, zero scritture.");

  // ----------------------------------------------------------------------------
  // T05 - Archivio vuoto (history: [])
  // ----------------------------------------------------------------------------
  console.log("\n[T05] Archivio vuoto (history: [])...");
  localStorage.clear();
  saveSettings({ salvataggioAutomatico: false });
  // Esportiamo un archivio legittimamente privo di record
  const emptyExport = await createBackupEnvelope();
  assert(emptyExport.envelope.payload.history.length === 0, "T05: L'export deve avere 0 record");

  // Popoliamo temporaneamente lo storage con un record fittizio
  saveAnalysisRecord(baseRecord);
  assert(loadHistory().length === 1, "T05: Storage locale pre-restore contiene 1 record");

  // Eseguiamo il restore dell'archivio vuoto
  const dryRunT05 = await validateBackupDryRun(emptyExport.jsonString);
  assert(dryRunT05.isValid === true, "T05: Dry run su archivio vuoto legittimo deve essere valido");
  assert(dryRunT05.errors.length === 0, "T05: Nessun errore atteso");

  const restoreOutcomeT05 = await executeSafeRestore(emptyExport.jsonString);
  assert(restoreOutcomeT05.success === true, "T05: Restore di archivio vuoto deve riuscire");
  assert(loadHistory().length === 0, "T05: Storage locale deve contenere esattamente 0 record coerenti");
  console.log("   -> [PASS] T05: Restore archivio vuoto consentito, nessun errore, stato coerente a 0 record.");

  // ----------------------------------------------------------------------------
  // T06 - Rollback immediato dopo restore (multiplo e alternato)
  // ----------------------------------------------------------------------------
  console.log("\n[T06] Rollback immediato dopo restore: sequenza alternata (restore -> rollback -> restore -> rollback)...");
  // Stato iniziale: 1 record A
  localStorage.clear();
  const recordA: AnalysisRecord = {
    id: "rec_A",
    timestamp: "2026-10-09T08:00:00.000Z",
    rawInput: "Stato A originale",
    modalita: "deposito",
    fuoriPerimetro: false,
    deposito: { sintesi: "Sintesi A", chiaviDiPensiero: ["a"] },
  };
  saveAnalysisRecord(recordA);
  const backupA = await createBackupEnvelope();

  // Stato B
  localStorage.clear();
  const recordB: AnalysisRecord = {
    id: "rec_B",
    timestamp: "2026-10-09T09:00:00.000Z",
    rawInput: "Stato B alternativo",
    modalita: "deposito",
    fuoriPerimetro: false,
    deposito: { sintesi: "Sintesi B", chiaviDiPensiero: ["b"] },
  };
  saveAnalysisRecord(recordB);
  const backupB = await createBackupEnvelope();

  // Partiamo da Stato A in memoria
  localStorage.clear();
  saveAnalysisRecord(recordA);
  assert(loadHistory()[0].id === "rec_A", "T06: Inizio con record A");

  // Ciclo 1: Restore B -> Rollback A
  const res1 = await executeSafeRestore(backupB.jsonString);
  assert(res1.success === true, "T06: Ciclo 1 Restore B riuscito");
  assert(loadHistory()[0].id === "rec_B", "T06: Ora attivo B");

  const roll1 = restoreSafetySnapshot();
  assert(roll1.success === true, "T06: Ciclo 1 Rollback riuscito");
  assert(loadHistory()[0].id === "rec_A", "T06: Tornato correttamente ad A");

  // Ciclo 2: Restore B -> Rollback A
  const res2 = await executeSafeRestore(backupB.jsonString);
  assert(res2.success === true, "T06: Ciclo 2 Restore B riuscito");
  assert(loadHistory()[0].id === "rec_B", "T06: Di nuovo attivo B");

  const roll2 = restoreSafetySnapshot();
  assert(roll2.success === true, "T06: Ciclo 2 Rollback riuscito");
  assert(loadHistory()[0].id === "rec_A", "T06: Di nuovo tornato perfettamente ad A");
  console.log("   -> [PASS] T06: Sequenza multipla restore/rollback eseguita senza alcuna perdita di dati.");

  console.log("\n================================================================================");
  console.log("TUTTI I 6 TEST INDISPENSABILI DELLO STEP 1 (T01 - T06) SONO STATI SUPERATI AL 100%!");
  console.log("================================================================================\n");

  // ============================================================================
  // PARTE 2: TEST CONSIGLIATI PER LO STEP 2 (T07 - T14)
  // ============================================================================
  console.log("--------------------------------------------------------------------------------");
  console.log("PARTE 2: TEST CONSIGLIATI PER LO STEP 2 (STRESS, DEEP SCAN, CONCORRENZA)");
  console.log("--------------------------------------------------------------------------------");

  // ----------------------------------------------------------------------------
  // T07 - Dataset grande (100, 500, 1000 analisi)
  // ----------------------------------------------------------------------------
  console.log("\n[T07] Benchmark Dataset Grande (100, 500 e 1.000 analisi)...");
  const datasetSizes = [100, 500, 1000];

  for (const size of datasetSizes) {
    localStorage.clear();
    for (let i = 0; i < size; i++) {
      const rec: AnalysisRecord = {
        id: `rec_large_${i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        rawInput: `Nota di prova numero ${i} con considerazioni organizzative personali e pianificazione della giornata.`,
        modalita: i % 2 === 0 ? "deposito" : "organizzazione",
        fuoriPerimetro: false,
        deposito: i % 2 === 0 ? { sintesi: `Sintesi ${i}`, chiaviDiPensiero: ["stress", "test"] } : undefined,
        sintesi: i % 2 !== 0 ? `Sintesi org ${i}` : undefined,
        babyStep: i % 2 !== 0 ? { azione: `Passo ${i}`, durataStimata: "5m", motivo: `Motivo ${i}` } : undefined,
      };
      saveAnalysisRecord(rec);
    }

    const tStartExport = Date.now();
    const largeExport = await createBackupEnvelope();
    const tEndExport = Date.now();
    const exportDurationMs = tEndExport - tStartExport;
    const fileSizeBytes = Buffer.byteLength(largeExport.jsonString, "utf8");

    // Simuliamo cancellazione e restore
    localStorage.clear();
    const tStartRestore = Date.now();
    const restoreResult = await executeSafeRestore(largeExport.jsonString);
    const tEndRestore = Date.now();
    const restoreDurationMs = tEndRestore - tStartRestore;

    assert(restoreResult.success === true, `T07: Restore di ${size} record deve avere successo`);
    assert(loadHistory().length === size, `T07: Tutti i ${size} record devono essere ripristinati`);

    console.log(
      `   -> [PASS] ${size} record: Dimensione = ${(fileSizeBytes / 1024).toFixed(1)} KB | Export = ${exportDurationMs} ms | Restore = ${restoreDurationMs} ms`
    );
  }

  // ----------------------------------------------------------------------------
  // T08 - Stress test cronologia: Analisi molto lunghe (20.000, 50.000, 100.000 car.)
  // ----------------------------------------------------------------------------
  console.log("\n[T08] Stress test testi estesi (20.000, 50.000 e 100.000 caratteri)...");
  const charCounts = [20000, 50000, 100000];

  for (const count of charCounts) {
    localStorage.clear();
    const baseChunk = "Serena sta riflettendo su un progetto personale complesso. ";
    const longText = baseChunk.repeat(Math.ceil(count / baseChunk.length) + 2).slice(0, count);
    assert(longText.length === count, `Test setup: longText deve essere esattamente lungo ${count}`);
    const longRecord: AnalysisRecord = {
      id: `rec_long_${count}`,
      timestamp: new Date().toISOString(),
      rawInput: longText,
      modalita: "deposito",
      fuoriPerimetro: false,
      deposito: {
        sintesi: "Sintesi per testo esteso",
        chiaviDiPensiero: ["lunghezza", "stress-test"],
      },
    };
    saveAnalysisRecord(longRecord);

    const longExport = await createBackupEnvelope();
    assert(!!longExport.envelope.sha256Checksum, `T08: Checksum calcolato per ${count} car.`);

    localStorage.clear();
    const longRestore = await executeSafeRestore(longExport.jsonString);
    assert(longRestore.success === true, `T08: Restore di testo con ${count} caratteri riuscito`);
    const recovered = loadHistory();
    assert(recovered[0].rawInput.length === count, `T08: Lunghezza recuperata esatta (${count} caratteri)`);
    console.log(`   -> [PASS] ${count} caratteri: SHA-256 canonico calcolato, esportato e ripristinato con integrità 100%.`);
  }

  // ----------------------------------------------------------------------------
  // T09 - Restore multiplo ciclico (A -> B -> C -> A)
  // ----------------------------------------------------------------------------
  console.log("\n[T09] Restore multiplo ciclico (A -> B -> C -> A)...");
  localStorage.clear();
  saveAnalysisRecord({ id: "rec_1", timestamp: "2026-10-09T01:00:00Z", rawInput: "A", modalita: "deposito", fuoriPerimetro: false });
  const bA = await createBackupEnvelope();

  localStorage.clear();
  saveAnalysisRecord({ id: "rec_2", timestamp: "2026-10-09T02:00:00Z", rawInput: "B", modalita: "deposito", fuoriPerimetro: false });
  const bB = await createBackupEnvelope();

  localStorage.clear();
  saveAnalysisRecord({ id: "rec_3", timestamp: "2026-10-09T03:00:00Z", rawInput: "C", modalita: "deposito", fuoriPerimetro: false });
  const bC = await createBackupEnvelope();

  // Ciclo A -> B -> C -> A
  await executeSafeRestore(bA.jsonString);
  assert(loadHistory()[0].id === "rec_1", "T09: Step A");
  await executeSafeRestore(bB.jsonString);
  assert(loadHistory()[0].id === "rec_2", "T09: Step B");
  await executeSafeRestore(bC.jsonString);
  assert(loadHistory()[0].id === "rec_3", "T09: Step C");
  await executeSafeRestore(bA.jsonString);
  assert(loadHistory()[0].id === "rec_1", "T09: Step finale di nuovo A");
  console.log("   -> [PASS] T09: Ciclo di ripristino A -> B -> C -> A perfettamente coerente.");

  // ----------------------------------------------------------------------------
  // T10 - Deep Scan contro annidamenti estremi (Livello 5+)
  // ----------------------------------------------------------------------------
  console.log("\n[T10] Deep Scan contro annidamenti estremi (albero a profondità 5)...");
  const deeplyNestedObj = {
    a: {
      b: {
        c: {
          d: {
            test: "gara protesica",
          },
        },
      },
    },
  };
  const deepViolationsT10 = scanObjectForPerimeterViolations(deeplyNestedObj);
  assert(deepViolationsT10.length === 1, "T10: Deve rilevare esattamente 1 violazione");
  assert(deepViolationsT10[0].path === "a.b.c.d.test", `T10: Percorso rilevato '${deepViolationsT10[0].path}'`);
  assert(deepViolationsT10[0].matchedTerms.includes("Gara Protesica"), "T10: Termine intercettato Gara Protesica");
  console.log(`   -> [PASS] T10: Violazione intercettata a profondità 5 su '${deepViolationsT10[0].path}'.`);

  // ----------------------------------------------------------------------------
  // T11 - Deep Scan su array complessi multidimensionali
  // ----------------------------------------------------------------------------
  console.log("\n[T11] Deep Scan su array complessi multidimensionali ([[[\"verbale gara\"]]])...");
  const nestedArray = [[["verbale gara"]]];
  const deepViolationsT11 = scanObjectForPerimeterViolations(nestedArray);
  assert(deepViolationsT11.length === 1, "T11: Deve rilevare 1 violazione nell'array tridimensionale");
  assert(deepViolationsT11[0].path === "[0][0][0]", `T11: Percorso matrice rilevato '${deepViolationsT11[0].path}'`);
  assert(deepViolationsT11[0].matchedTerms.includes("Verbale Gara"), "T11: Termine intercettato Verbale Gara");
  console.log(`   -> [PASS] T11: Violazione intercettata in array annidato su '${deepViolationsT11[0].path}'.`);

  // ----------------------------------------------------------------------------
  // T12 - Falsi positivi critici (Tabella esatta richiesta dall'utente)
  // ----------------------------------------------------------------------------
  console.log("\n[T12] Verifica matrice semantica dei falsi positivi critici...");
  const t12Cases = [
    { input: "mia madre è ricoverata", expected: "PERSONALE_AMMESSO" },
    { input: "devo essere paziente", expected: "PERSONALE_AMMESSO" },
    { input: "paziente ricoverato", expected: "DUBBIO_DA_NON_SALVARE" },
    { input: "determina ASL", expected: "ASL_ESCLUSO" },
    { input: "ventiloterapia domiciliare di mia madre", expected: "PERSONALE_AMMESSO" },
    { input: "gara ventiloterapia asl", expected: "ASL_ESCLUSO" },
    { input: "podcast Lezioni di Poesia", expected: "PERSONALE_AMMESSO" },
    { input: "podcast MUM", expected: "MUM_ESCLUSO" },
  ];

  for (const c of t12Cases) {
    const res = classifyPerimeter(c.input);
    assert(
      res.classification === c.expected,
      `T12: Per '${c.input}' atteso ${c.expected}, ottenuto ${res.classification} (motivo: ${res.motivo})`
    );
    console.log(`   -> [PASS] "${c.input}" -> ${res.classification}`);
  }

  // ----------------------------------------------------------------------------
  // T13 - Restore concorrente (simulazione doppi clic / chiamate simultanee)
  // ----------------------------------------------------------------------------
  console.log("\n[T13] Restore concorrente (doppio clic simultaneo)...");
  localStorage.clear();
  saveAnalysisRecord({ id: "rec_sync", timestamp: "2026-10-09T00:00:00Z", rawInput: "Sync", modalita: "deposito", fuoriPerimetro: false });
  const bSync = await createBackupEnvelope();

  // Lanciamo due restore in contemporanea senza attendere la prima
  const p1 = executeSafeRestore(bSync.jsonString);
  const p2 = executeSafeRestore(bSync.jsonString);
  const [outcome1, outcome2] = await Promise.all([p1, p2]);

  // Una deve aver avuto successo, l'altra deve essere stata rifiutata dal blocco concorrenza
  const successCount = (outcome1.success ? 1 : 0) + (outcome2.success ? 1 : 0);
  const blockedCount = (!outcome1.success ? 1 : 0) + (!outcome2.success ? 1 : 0);

  assert(successCount === 1, "T13: Esattamente una operazione deve completarsi con successo");
  assert(blockedCount === 1, "T13: La seconda operazione deve essere intercettata e bloccata");
  console.log("   -> [PASS] T13: Concorrenza gestita, lock attivo, nessuna corruzione.");

  // ----------------------------------------------------------------------------
  // T14 - Snapshot corrotto (corruzione manuale dello snapshot di rollback)
  // ----------------------------------------------------------------------------
  console.log("\n[T14] Snapshot corrotto (corruzione volontaria dello snapshot di rollback)...");
  // Assicuriamo uno stato locale integro
  localStorage.clear();
  saveAnalysisRecord({ id: "rec_sicuro", timestamp: "2026-10-09T00:00:00Z", rawInput: "Dati salvi", modalita: "deposito", fuoriPerimetro: false });
  
  // Corrompiamo volontariamente la chiave di snapshot in localStorage
  localStorage.setItem("jarvis_safety_snapshot_before_restore_v1", "{ INVALID_JSON_DATA_CORRUPTED [");

  const rollbackCorruptOutcome = restoreSafetySnapshot();
  assert(rollbackCorruptOutcome.success === false, "T14: Rollback da snapshot corrotto deve fallire");
  assert(
    rollbackCorruptOutcome.error !== undefined && rollbackCorruptOutcome.error.includes("Snapshot di sicurezza corrotto"),
    "T14: Errore esplicito di snapshot corrotto"
  );
  // Verifichiamo che i dati correnti locali non siano stati cancellati o azzerati
  const intactData = loadHistory();
  assert(intactData.length === 1 && intactData[0].id === "rec_sicuro", "T14: Dati locali principali salvi e intatti al 100%");
  console.log("   -> [PASS] T14: Snapshot corrotto intercettato con errore gestito, dati correnti preservati al 100%.");

  console.log("\n================================================================================");
  console.log("TUTTI I 14 TEST (T01 - T14) SONO STATI SUPERATI AL 100% CON SUCCESSO ASSOLUTO!");
  console.log("================================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test fallito con eccezione:", err);
  process.exit(1);
});
