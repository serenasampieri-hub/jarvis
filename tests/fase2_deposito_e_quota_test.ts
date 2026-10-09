import { getStorageFootprintReport, formatBytes } from "../src/utils/storageQuota";
import { saveAnalysisRecord, loadHistory, createBackupEnvelope, validateBackupDryRun } from "../src/utils/storage";
import { classifyPerimeter, scanObjectForPerimeterViolations } from "../src/utils/perimeter";
import { AnalysisRecord } from "../src/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

// Mocking minimal browser storage for Node.js test environment
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

async function runFase2Tests() {
  console.log("=================================================================");
  console.log("COLLAUDO AUTOMATIZZATO FASE 2: DEPOSITO & GESTIONE QUOTE");
  console.log("=================================================================\n");

  localStorage.clear();

  // -------------------------------------------------------------------
  // TEST 1: Storage Quota - Stato iniziale nominale
  // -------------------------------------------------------------------
  console.log("1. Verifica storage quota iniziale (vuoto)...");
  const reportIniziale = await getStorageFootprintReport();
  assert(reportIniziale.status === "nominale", "Stato iniziale deve essere 'nominale'");
  assert(reportIniziale.totalBytes === 0, "Byte iniziali devono essere 0");
  assert(reportIniziale.percentUsed === 0, "Percentuale iniziale deve essere 0%");
  console.log(`   -> [PASS] Quota iniziale: ${reportIniziale.totalFormatted} / ${reportIniziale.estimatedLimitFormatted} (${reportIniziale.status})`);

  // -------------------------------------------------------------------
  // TEST 2: Storage Quota - Calcolo UTF-16 byte con dati reali
  // -------------------------------------------------------------------
  console.log("\n2. Inserimento record in modalità 'deposito' e ricalcolo quota...");
  const depositoRecord: AnalysisRecord = {
    id: "deposito_test_01",
    timestamp: new Date().toISOString(),
    rawInput: "Ho mille pensieri che girano in testa sul weekend. Voglio solo scaricarli senza fare piani.",
    modalita: "deposito",
    modalitaEffettiva: "deposito",
    fuoriPerimetro: false,
    deposito: {
      sintesi: "Scarico mentale libero per il fine settimana senza obblighi operativi.",
      chiaviDiPensiero: ["weekend", "sovraccarico mentale", "decomprimere"],
      annotazioneSilenziosa: "Custodito in archivio; nessun baby step o compito generato.",
    },
    rispostaVocale: {
      situazione: "Pensieri sul fine settimana.",
      puntiSalienti: ["Nessun compito richiesto", "Pensiero protetto e custodito"],
      prossimoPasso: "Stacca e riposa.",
      testoParlatoCompleto: "Ho accolto e custodito il tuo pensiero. Nessun compito da fare.",
      durataStimataSecondi: 12,
    },
  };

  saveAnalysisRecord(depositoRecord);

  const reportConDati = await getStorageFootprintReport();
  assert(reportConDati.totalBytes > 0, "I byte totali devono essere maggiori di zero");
  assert(reportConDati.status === "nominale", "Con 1 record lo stato deve rimanere 'nominale'");
  const cronologiaCategory = reportConDati.categories.find(c => c.key === "jarvis_cronologia_serena_v1");
  assert(!!cronologiaCategory && cronologiaCategory.bytes > 0, "La categoria cronologia deve registrare byte");
  assert(cronologiaCategory?.itemCount === 1, "Il conteggio elementi deve essere 1");
  console.log(`   -> [PASS] Occupazione dopo record: ${reportConDati.totalFormatted} (Record contati: ${cronologiaCategory?.itemCount})`);

  // -------------------------------------------------------------------
  // TEST 3: Soglie di allerta Quota (Attenzione >= 80%, Critico >= 95%)
  // -------------------------------------------------------------------
  console.log("\n3. Verifica soglie prudenziali quota (Attenzione >= 80%, Critico >= 95%)...");
  
  // Simuliamo saturazione all'82% (82% di 5 MB = 4.1 MB UTF-16, circa 2.05 milioni di caratteri)
  const charCount82Percent = Math.floor((5 * 1024 * 1024 * 0.82) / 2);
  const fakeBigString82 = "X".repeat(charCount82Percent);
  localStorage.setItem("fake_filler_key", fakeBigString82);

  const reportAttenzione = await getStorageFootprintReport();
  assert(reportAttenzione.status === "attenzione", `Stato atteso 'attenzione', ottenuto: ${reportAttenzione.status}`);
  console.log(`   -> [PASS] Soglia 80% rilevata: stato=${reportAttenzione.status}, occupazione=${reportAttenzione.percentUsed}% (${reportAttenzione.totalFormatted})`);

  // Simuliamo saturazione al 96%
  const charCount96Percent = Math.floor((5 * 1024 * 1024 * 0.96) / 2);
  const fakeBigString96 = "Y".repeat(charCount96Percent);
  localStorage.setItem("fake_filler_key", fakeBigString96);

  const reportCritico = await getStorageFootprintReport();
  assert(reportCritico.status === "critico", `Stato atteso 'critico', ottenuto: ${reportCritico.status}`);
  console.log(`   -> [PASS] Soglia 95% rilevata: stato=${reportCritico.status}, occupazione=${reportCritico.percentUsed}% (${reportCritico.totalFormatted})`);

  // Ripristiniamo la situazione nominale
  localStorage.removeItem("fake_filler_key");

  // -------------------------------------------------------------------
  // TEST 4: Blindatura della modalità Deposito (Zero task forzati)
  // -------------------------------------------------------------------
  console.log("\n4. Verifica semantica e strutturale della modalità Deposito...");
  const recordsInHistory = loadHistory();
  const testRecord = recordsInHistory.find(r => r.id === "deposito_test_01");
  assert(!!testRecord, "Record di deposito trovato in cronologia");
  assert(testRecord?.modalita === "deposito", "La modalità salvata deve essere 'deposito'");
  assert(testRecord?.deposito !== undefined, "La sezione deposito deve essere valorizzata");
  assert(testRecord?.deposito?.sintesi.length! > 0, "La sintesi di deposito deve esistere");
  assert(testRecord?.babyStep === undefined, "La modalità deposito NON deve contenere babyStep");
  assert(testRecord?.azioni === undefined, "La modalità deposito NON deve contenere azioni forzate");
  console.log("   -> [PASS] Modalità Deposito isolata: nessun baby step né compito coercitivo imposto all'utente.");

  // -------------------------------------------------------------------
  // TEST 5: Controllo perimetro ASL/MUM applicato anche alla modalità Deposito
  // -------------------------------------------------------------------
  console.log("\n5. Verifica protezione perimetro istituzionale anche in modalità Deposito...");
  const inputViolazioneMUM = "Voglio annotare una riflessione sul budget del progetto MUM e gli sponsor";
  const classifMUM = classifyPerimeter(inputViolazioneMUM);
  assert(classifMUM.classification === "MUM_ESCLUSO", "Input con 'progetto MUM' deve essere classificato MUM_ESCLUSO");

  const inputViolazioneASL = "Riflessione sulla gara protesica della ASL Roma 1 da memorizzare";
  const classifASL = classifyPerimeter(inputViolazioneASL);
  assert(classifASL.classification === "ASL_ESCLUSO", "Input con 'ASL Roma 1' deve essere classificato ASL_ESCLUSO");

  const scansioneViolazione = scanObjectForPerimeterViolations({
    deposito: {
      sintesi: "Sintesi pulita",
      chiaviDiPensiero: ["personale", "gara protesica"],
    }
  });
  assert(scansioneViolazione.length > 0, "Scansione profonda deve bloccare 'gara protesica' in chiaviDiPensiero di deposito");
  console.log(`   -> [PASS] Perimetro attivo su Deposito: intercettate violazioni a monte e nella scansione profonda.`);

  // -------------------------------------------------------------------
  // TEST 6: Esportazione Backup & Dry Run con record Deposito
  // -------------------------------------------------------------------
  console.log("\n6. Verifica compatibilità Backup & Dry Run con schema Deposito...");
  const backup = await createBackupEnvelope();
  assert(backup.envelope.payload.history.length === 1, "Il backup deve contenere 1 record di cronologia");
  
  const dryRun = await validateBackupDryRun(backup.jsonString);
  assert(dryRun.isValid, "Il backup contenente record Deposito deve essere valido");
  assert(dryRun.errors.length === 0, "Nessun errore atteso nel dry run");
  assert(dryRun.warnings.length === 0, "Nessun warning su checksum o campi nel dry run");
  assert((dryRun.detectedPerimetroViolations?.length ?? 0) === 0, "Nessuna violazione di perimetro rilevata");
  assert(!!dryRun.envelope?.sha256Checksum, "L'envelope restituito deve contenere il checksum");
  console.log(`   -> [PASS] Backup & Dry Run con record Deposito completato con successo (Hash: ${dryRun.envelope?.sha256Checksum.slice(0, 16)}...)`);

  console.log("\n=================================================================");
  console.log("TUTTI I 6 TEST DELLA FASE 2 SONO STATI SUPERATI AL 100%!");
  console.log("=================================================================");
}

runFase2Tests().catch((err) => {
  console.error("Test fallito con errore:", err);
  process.exit(1);
});
