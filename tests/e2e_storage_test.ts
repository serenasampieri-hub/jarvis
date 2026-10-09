/**
 * Test Suite End-to-End sul codice TypeScript reale di Jarvis.
 * Esegue le funzioni effettive di storage.ts, perimeter.ts e crypto.ts.
 */

// 1. Mock in-memory di localStorage per ambiente Node
const memoryStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => (key in memoryStorage ? memoryStorage[key] : null),
  setItem: (key: string, val: string) => {
    memoryStorage[key] = String(val);
  },
  removeItem: (key: string) => {
    delete memoryStorage[key];
  },
  clear: () => {
    Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]);
  },
};

// 2. Mock crypto SubtleCrypto se necessario
if (!globalThis.crypto) {
  const nodeCrypto = await import("crypto");
  (globalThis as any).crypto = nodeCrypto.webcrypto;
}

import {
  createBackupEnvelope,
  validateBackupDryRun,
  executeSafeRestore,
  createSafetySnapshot,
  restoreSafetySnapshot,
  saveAnalysisRecord,
  loadHistory,
  loadSettings,
  saveSettings,
  loadBetaSurvey,
  saveBetaSurvey,
} from "../src/utils/storage";
import {
  classifyPerimeter,
  scanObjectForPerimeterViolations,
} from "../src/utils/perimeter";
import { canonicalJsonStringify, computeSha256 } from "../src/utils/crypto";
import { AnalysisRecord, JarvisSettings, BetaSurveyData } from "../src/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

async function runE2ETests() {
  console.log("=================================================");
  console.log("AVVIO COLLAUDO REALE END-TO-END SUL CODICE TYPESCRIPT");
  console.log("=================================================\n");

  // ------------------------------------------------------------------------
  // TEST 1: Creazione dataset di prova e verifica persistenza
  // ------------------------------------------------------------------------
  console.log("1. Creazione dataset di prova locale iniziale...");
  localStorage.clear();

  const record1: AnalysisRecord = {
    id: "rec_prova_01",
    timestamp: "2026-10-09T10:00:00.000Z",
    rawInput: "Organizzare il trasloco e ordinare gli scatoloni per lo studio personale.",
    trascrizionePulita: "Pianificare il trasloco dello studio.",
    titoloProgetto: "Trasloco Studio",
    sintesi: "Organizzazione scatoloni e logistica personale.",
    modalita: "organizzazione",
    fuoriPerimetro: false,
    babyStep: {
      azione: "Comprare 5 scatoloni rinforzati.",
      durataStimata: "10 min",
      motivo: "Rende tangibile il primo passo.",
    },
    azioni: [
      { id: "az_1", testo: "Comprare 5 scatoloni", energiaRichiesta: "bassa", tipo: "suggerimento", completata: false },
    ],
  };

  saveAnalysisRecord(record1);

  const initialSettings: JarvisSettings = {
    salvataggioAutomatico: true,
  };
  saveSettings(initialSettings);

  const initialSurvey: BetaSurveyData = {
    ...loadBetaSurvey(),
    caricoMentalePrima: 8,
    caricoMentaleDopo: 3,
    problemaReale: { giudizio: "Ottimo", note: "Ha colto la priorità reale." },
  };
  saveBetaSurvey(initialSurvey);

  const historyBeforeExport = loadHistory();
  assert(historyBeforeExport.length === 1, "History iniziale deve contenere 1 record");
  assert(historyBeforeExport[0].id === "rec_prova_01", "ID record deve corrispondere");
  console.log("   -> Dataset iniziale creato con successo (1 analisi, impostazioni, survey).");

  // ------------------------------------------------------------------------
  // TEST 2: Esportazione reale dell'archivio (Envelope + Hash canonico)
  // ------------------------------------------------------------------------
  console.log("\n2. Esportazione backup (createBackupEnvelope)...");
  const exportResult = await createBackupEnvelope();
  assert(exportResult.envelope.schemaVersion === 1, "schemaVersion deve essere 1");
  assert(exportResult.envelope.payload.history.length === 1, "L'envelope deve contenere 1 record");
  assert(!!exportResult.envelope.sha256Checksum, "L'hash SHA-256 deve essere presente");
  assert(exportResult.filename.startsWith("jarvis_backup_"), "Nome file deve iniziare con jarvis_backup_");
  console.log(`   -> File generato: ${exportResult.filename}`);
  console.log(`   -> Hash SHA-256 calcolato: ${exportResult.envelope.sha256Checksum}`);
  console.log(`   -> Record esportati: ${exportResult.envelope.stats.totalRecords}`);

  // ------------------------------------------------------------------------
  // TEST 3: Modifica deliberata dei dati locali
  // ------------------------------------------------------------------------
  console.log("\n3. Modifica deliberata dello stato locale...");
  const recordModificato: AnalysisRecord = {
    id: "rec_modificato_99",
    timestamp: "2026-10-09T12:00:00.000Z",
    rawInput: "Stato temporaneo modificato post-backup.",
    titoloProgetto: "Progetto Temporaneo",
    modalita: "deposito",
    fuoriPerimetro: false,
    deposito: {
      sintesi: "Riflessione temporanea",
      chiaviDiPensiero: ["temporaneo", "test"],
    },
  };
  saveAnalysisRecord(recordModificato);
  saveSettings({ salvataggioAutomatico: false });

  const historyModified = loadHistory();
  assert(historyModified.length === 2, "La history modificata deve avere 2 record");
  assert(loadSettings().salvataggioAutomatico === false, "Impostazione salvataggioAutomatico deve essere false");
  console.log("   -> Stato locale deliberatamente alterato (2 record presenti, impostazione alterata).");

  // ------------------------------------------------------------------------
  // TEST 4: Dry Run sul JSON esportato (Zero Scritture)
  // ------------------------------------------------------------------------
  console.log("\n4. Esecuzione Dry Run sul backup esportato (validateBackupDryRun)...");
  const dryRunResult = await validateBackupDryRun(exportResult.jsonString);
  assert(dryRunResult.isValid === true, "Il dry run su backup legittimo deve restituire isValid=true");
  assert(dryRunResult.errors.length === 0, "Nessun errore atteso");
  assert(dryRunResult.stats?.totalRecords === 1, "Stats dry run deve rilevare 1 record");

  // VERIFICA ASSOLUTA DI ZERO SCRITTURE DURANTE DRY RUN:
  const historyAfterDryRun = loadHistory();
  assert(historyAfterDryRun.length === 2, "Il Dry Run NON deve aver alterato i 2 record correnti nello storage!");
  assert(loadSettings().salvataggioAutomatico === false, "Il Dry Run NON deve aver toccato le impostazioni correnti!");
  console.log("   -> Dry Run superato con successo: ZERO scritture effettuate nello storage locale.");

  // ------------------------------------------------------------------------
  // TEST 5: Ripristino transazionale effettivo (executeSafeRestore)
  // ------------------------------------------------------------------------
  console.log("\n5. Esecuzione ripristino transazionale (executeSafeRestore)...");
  const restoreResult = await executeSafeRestore(exportResult.jsonString);
  assert(restoreResult.success === true, "Il ripristino deve avere successo");

  const historyRestored = loadHistory();
  const settingsRestored = loadSettings();
  const surveyRestored = loadBetaSurvey();

  assert(historyRestored.length === 1, "Dopo il ripristino, la history deve contenere esattamente 1 record");
  assert(historyRestored[0].id === "rec_prova_01", "Il record ripristinato deve essere rec_prova_01");
  assert(settingsRestored.salvataggioAutomatico === true, "L'impostazione deve essere tornata true");
  assert(surveyRestored.caricoMentalePrima === 8, "Survey deve essere ripristinato a 8");
  console.log("   -> Ripristino completato con successo: stato locale identico a quello originale al 100%.");

  // ------------------------------------------------------------------------
  // TEST 6: Rollback istantaneo allo stato precedente (restoreSafetySnapshot)
  // ------------------------------------------------------------------------
  console.log("\n6. Esecuzione Rollback allo snapshot precedente...");
  const rollbackOutcome = restoreSafetySnapshot();
  assert(rollbackOutcome.success === true, "Il rollback deve avere esito positivo");

  const historyAfterRollback = loadHistory();
  const settingsAfterRollback = loadSettings();

  assert(historyAfterRollback.length === 2, "Dopo il rollback, devono tornare i 2 record dello stato pre-ripristino");
  assert(historyAfterRollback.some((r) => r.id === "rec_modificato_99"), "rec_modificato_99 deve essere presente");
  assert(settingsAfterRollback.salvataggioAutomatico === false, "L'impostazione salvataggioAutomatico deve tornare false");
  console.log("   -> Rollback riuscito con successo: stato pre-ripristino recuperato in modo identico al 100%.");

  // ------------------------------------------------------------------------
  // TEST 7: Scansione perimetrale ricorsiva profonda su tutti i campi annidati
  // ------------------------------------------------------------------------
  console.log("\n7. Test scansione perimetrale ricorsiva su campi annidati (scanObjectForPerimeterViolations)...");

  // Caso 7.1: ASL annidato dentro output.consiglioQuattro.pragmatico
  const deepAslPayload = {
    history: [
      {
        id: "rec_clean_raw",
        rawInput: "Pianificare le vacanze estive con la famiglia.",
        output: {
          consiglioQuattro: {
            pragmatico: ["Verificare protocollo asl e parlare con colleghi asl"],
          },
        },
      },
    ],
  };
  const violationsAsl = scanObjectForPerimeterViolations(deepAslPayload, "payload");
  assert(violationsAsl.length > 0, "Deve intercettare ASL annidato nei consiglieri");
  assert(violationsAsl[0].path.includes("consiglioQuattro"), "Il path violazione deve puntare al campo annidato");
  console.log(`   -> [PASS] Intercettato ASL in campo profondo: ${violationsAsl[0].path}`);

  // Caso 7.2: MUM annidato dentro survey.problemaReale.note
  const deepMumPayload = {
    survey: {
      problemaReale: {
        note: "Trascrizione per la redazione del podcast mum",
      },
    },
  };
  const violationsMum = scanObjectForPerimeterViolations(deepMumPayload, "payload");
  assert(violationsMum.length > 0, "Deve intercettare MUM annidato nel survey");
  console.log(`   -> [PASS] Intercettato MUM in survey: ${violationsMum[0].path}`);

  // Caso 7.3: Gara Protesica annidata in babyStep
  const deepGaraPayload = {
    history: [
      {
        id: "rec_gara",
        rawInput: "Attività del giorno",
        babyStep: "Completare istruttoria gara protesica e ventiloterapia",
      },
    ],
  };
  const violationsGara = scanObjectForPerimeterViolations(deepGaraPayload, "payload");
  assert(violationsGara.length > 0, "Deve intercettare gara protesica in babyStep");
  console.log(`   -> [PASS] Intercettata gara protesica in babyStep: ${violationsGara[0].path}`);

  // ------------------------------------------------------------------------
  // TEST 8: Distinzione Sanitario Personale vs ASL Ufficio vs Virtù della Pazienza
  // ------------------------------------------------------------------------
  console.log("\n8. Test distinzione semantica (Personale vs ASL vs Virtù Pazienza)...");

  // 8.1 "devo essere paziente con questa situazione" -> AMMESSO (virtù morale)
  const testPazienza = classifyPerimeter("devo essere paziente con questa situazione complessa");
  assert(testPazienza.classification === "PERSONALE_AMMESSO", "La virtù della pazienza deve essere ammessa");
  console.log(`   -> [PASS] 'essere paziente' -> ${testPazienza.classification}`);

  // 8.2 "devo deliberare se cambiare casa" -> AMMESSO (riflessione personale)
  const testDeliberare = classifyPerimeter("devo deliberare se cambiare casa entro la primavera");
  assert(testDeliberare.classification === "PERSONALE_AMMESSO", "Deliberare personale deve essere ammesso");
  console.log(`   -> [PASS] 'deliberare se cambiare casa' -> ${testDeliberare.classification}`);

  // 8.3 "mia madre ha avuto un ricovero" -> AMMESSO (sanità familiare/personale)
  const testSaluteMadre = classifyPerimeter("mia madre ha avuto un ricovero ieri sera all'ospedale");
  assert(testSaluteMadre.classification === "PERSONALE_AMMESSO", "Ricovero familiare/madre deve essere ammesso");
  console.log(`   -> [PASS] 'ricovero di mia madre' -> ${testSaluteMadre.classification}`);

  // 8.4 "delibera asl roma 1 per incarico" -> ESCLUSO (ASL istituzionale)
  const testAslDelibera = classifyPerimeter("delibera asl per approvazione budget");
  assert(testAslDelibera.classification === "ASL_ESCLUSO", "Delibera ASL deve essere esclusa");
  console.log(`   -> [PASS] 'delibera asl' -> ${testAslDelibera.classification}`);

  // 8.5 "scheda clinica paziente per ricovero" -> DUBBIO_DA_NON_SALVARE (clinico senza contesto familiare)
  const testClinicoDubbio = classifyPerimeter("scheda clinica del paziente per autorizzazione ricovero");
  assert(testClinicoDubbio.classification === "DUBBIO_DA_NON_SALVARE", "Clinico senza contesto deve essere DUBBIO");
  console.log(`   -> [PASS] 'scheda clinica paziente' -> ${testClinicoDubbio.classification}`);

  // ------------------------------------------------------------------------
  // TEST 9: Invarianza dell'Hash Canonico rispetto all'ordine delle proprietà JSON
  // ------------------------------------------------------------------------
  console.log("\n9. Test invarianza dell'hash SHA-256 canonico...");
  const objA = { z: 1, a: "test", nested: { b: 2, a: 1 } };
  const objB = { a: "test", nested: { a: 1, b: 2 }, z: 1 };

  const hashA = await computeSha256(canonicalJsonStringify(objA));
  const hashB = await computeSha256(canonicalJsonStringify(objB));

  assert(hashA === hashB, "L'hash canonico deve essere identico indipendentemente dall'ordine delle chiavi");
  console.log(`   -> [PASS] Hash A: ${hashA}`);
  console.log(`   -> [PASS] Hash B: ${hashB}`);
  console.log("   -> Checksum canonico deterministico perfettamente invariante.");

  console.log("\n=================================================");
  console.log("TUTTI I 9 TEST END-TO-END SONO STATI SUPERATI AL 100%!");
  console.log("=================================================");
}

runE2ETests().catch((err) => {
  console.error("ERRORE DURANTE I TEST END-TO-END:", err);
  process.exit(1);
});
