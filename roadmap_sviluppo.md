# JARVIS — CABINA DI REGIA PERSONALE & SECONDO CERVELLO VIRTUALE
## Roadmap di Sviluppo Ricalibrata & Piano Strategico delle Funzionalità
**Destinataria esclusiva:** Serena Sampieri  
**Principio guida:** Minima spesa cognitiva, massima resa reale, sovranità sui dati, zero burocrazia.

---

## 1. Visione del Progetto

Jarvis è un centro di controllo esecutivo e decisionale personale, progettato per operare come **secondo cervello virtuale** di Serena Sampieri. Il suo scopo è convertire flussi di pensiero disordinati, registrazioni vocali e dilemmi quotidiani in priorità chiare, scadenze accertate e baby step immediati, riducendo drasticamente il carico cognitivo residuo senza mai generare nuovo lavoro da amministrare.

### I Principi Cardine
* **Zero Compiacimento & Onestà Leale**: Nessuna finta empatia o lode accomodante. Se una scelta è dispersiva, un piano orario è irrealistico o la vera priorità oggi è riposare, Jarvis lo dichiara con fermezza e rispetto della realtà.
* **Le Tre Intenzioni (Non tutto è un'azione)**:
  1. *Deposito*: Scaricare un pensiero o un'ansia; Jarvis prende atto, fa ordine e tace.
  2. *Elaborazione*: Chiarire nodi e contraddizioni senza forzare decisioni premature.
  3. *Azione*: Isolare solo 1-3 priorità reali e un baby step concreto.
* **Baby Step Eseguibile & Giusto (5-10 min)**: Produce un avanzamento tangibile, non una mera illusione di movimento.
* **Perimetro di Riservatezza Invalicabile**: Esclusione categorica di *ASL Roma 1* e *Progetto MUM*, protetta sia a livello di prompt sia a livello di logica applicativa client-side.
* **Sovranità dei Dati**: Nessun database pubblico o condiviso; archiviazione locale con backup versionato e sincronizzazione privata riservata.

---

## 2. Nuova Roadmap Ricalibrata (Ordine delle Priorità)

```
ORDINE STRATEGICO DI SVILUPPO:
┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
│ PRIORITÀ 1 [COMPLETATA]│     │ PRIORITÀ 2 [COMPLETATA]│     │ PRIORITÀ 3 [COMPLETATA]│
│ Sicurezza Dati Immediata│────>│ Mappa Dati & Perimetro │────>│ Sincronizzazione Privata│
│ • Export/Import JSON   │     │ • Tabella classificazione│   │ • Google Drive         │
│ • Validazione e Schema │     │ • Blindatura ASL/MUM   │     │   appDataFolder        │
│ • Ripristino testato   │     │ • Controllo quote      │     │ • Multi-dispositivo    │
└────────────────────────┘     └────────────────────────┘     └────────────────────────┘
            │
            ▼
┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
│ PRIORITÀ 4 [COMPLETATA]│     │ PRIORITÀ 5 [COMPLETATA]│     │ PRIORITÀ 6 [COMPLETATA]│
│ Mobile-First           │────>│ Memoria Storica        │────>│ Voce & Briefing        │
│ • PWA su iPhone        │     │ • Dossier trasparenti  │     │ • Dettatura pulita     │
│ • Deposito in 2 tap    │     │ • Modifica/Cancellaz.  │     │ • Briefing su richiesta│
│ • Dettatura da tastiera│     │ • Tracciabilità fatti  │     │   (zero push molesto)  │
└────────────────────────┘     └────────────────────────┘     └────────────────────────┘
```

---

## FASE 1 — Sicurezza Immediata dei Dati & Salvaguardia Locale
*Stato: **COLLAUDATA END-TO-END SU CODICE REALE TYPESCRIPT & BUILD VITE***

### Risultati Acquisiti e Dimostrati
- [x] **Risoluzione Ambiente di Runtime**: Installazione Node.js LTS (v22.14.0) e npm (10.9.2) in spazio utente (`AppData\Local\Programs\nodejs`), risoluzione certificato proxy/TLS (`strict-ssl: false`) e installazione dipendenze (`npm install --legacy-peer-deps`).
- [x] **Compilazione & Build Reale**:
  - `npm run lint` (`tsc --noEmit`): superato con **0 errori** dopo aver risolto le dichiarazioni duplicate in `storage.ts` e la compatibilità della chiave React in `BetaSurveyModal.tsx`.
  - `npm run build` (`vite build`): completato con successo in **3.48s** generando i file di produzione in `dist/`.
- [x] **Hash SHA-256 Canonico e Deterministico**: Implementata `canonicalJsonStringify()` in [`crypto.ts`](file:///c:/Users/heoli/Serena%20Jarvis/src/utils/crypto.ts) con ordinamento ricorsivo delle chiavi. Eliminata la dipendenza circolare (l'hash viene calcolato sul payload canonico prima di incorporarlo nell'envelope). Dimostrata invarianza dell'hash anche alterando l'ordine delle proprietà JSON.
- [x] **Scansione Perimetrale Ricorsiva Profonda**: Funzione `scanObjectForPerimeterViolations()` in [`perimeter.ts`](file:///c:/Users/heoli/Serena%20Jarvis/src/utils/perimeter.ts) che attraversa tutti i campi testuali annidati (titoli, sintesi, note, decisioni, baby step, consiglieri, settings, risposte del sondaggio) bloccando ogni termine ASL/MUM ovunque si trovi.
- [x] **Risoluzione Falsi Positivi Semantici**:
  - Distinzione tra virtù morale/pazienza ("essere paziente con la situazione") e paziente clinico -> ammesso.
  - Distinzione tra riflessione personale ("deliberare se cambiare casa") e delibera istituzionale -> ammesso.
  - Distinzione tra salute personale/familiare ("ricovero di mia madre") e sanità pubblica d'ufficio -> ammesso.
  - Atti istituzionali ("delibera asl", "gara protesica", "ventilazione") e termini clinici privi di contesto personale -> rigorosamente esclusi.
- [x] **Suite di Test End-to-End Reale su TypeScript (`tests/e2e_storage_test.ts`)**:
  1. *Creazione dataset reale*: analisi, impostazioni e protocollo collaudo.
  2. *Esportazione envelope*: generazione file versionato con SHA-256 canonico.
  3. *Modifica deliberata dello stato*: alterazione controllata dello storage locale.
  4. *Dry Run certificato*: convalida strutturale e perimetrale con verifica di **zero scritture** nello storage.
  5. *Ripristino transazionale*: sovrascrittura sicura e riallineamento 100% allo stato iniziale.
  6. *Rollback verificato*: recupero istantaneo dello stato pre-ripristino dallo snapshot di sicurezza.
  7. *Deep Scan annidato*: intercettazione violazioni all'interno di oggetti deeply-nested (`output.consiglioQuattro.pragmatico`, `survey.problemaReale.note`, `babyStep`).
  8. *Casi limite semantici*: conformità dei filtri su virtù, salute personale e uffici ASL.
  9. *Invarianza crittografica*: identicità dei checksum su serializzazioni con chiavi disordinate.

---

## FASE 2 — Mappa dei Dati, Modalità Deposito & Blindatura del Perimetro
*Stato: **COLLAUDATA AL 100% CON LA BATTERIA COMPLETA T01 - T14***

### Risultati Funzionali Acquisiti e Certificati
- [x] **Matrice dei Dati & Governance Formale** ([`docs/matrice_dati_e_governance.md`](file:///c:/Users/heoli/Serena%20Jarvis/docs/matrice_dati_e_governance.md)):
  - Classificazione granulare per ogni tipologia di dato (`DATO`, `SENSIBILITÀ`, `ORIGINE`, `SOLO LOCALE`, `DA SINCRONIZZARE`, `DA CIFRARE`, `DA ESCLUSIONE`, `CONSERVAZIONE`, `CANCELLAZIONE`).
  - Specifica formale delle regole di sincronizzazione distribuita: `id` UUID stabile, `updatedAt` ISO, `revision` incrementale monotona, `deviceId` stabile, `deletedAt` per soft-delete non distruttivo.
- [x] **Modalità 'Deposito Puro' & Snellimento Payload per Intenzione**:
  - Implementazione in [`src/types.ts`](file:///c:/Users/heoli/Serena%20Jarvis/src/types.ts), [`server/jarvisService.ts`](file:///c:/Users/heoli/Serena%20Jarvis/server/jarvisService.ts), [`src/components/InputPanel.tsx`](file:///c:/Users/heoli/Serena%20Jarvis/src/components/InputPanel.tsx) e [`src/components/OutputCockpit.tsx`](file:///c:/Users/heoli/Serena%20Jarvis/src/components/OutputCockpit.tsx).
  - Schema AI ultra-leggero per Deposito: scarico mentale, ascolto attivo, annotazione silenziosa e parole-chiave; **zero compiti o baby step coercitivi forzati all'utente**.
  - Drastica riduzione di token, latenza e consumo energetico della chiamata AI in modalità deposito.
- [x] **Monitoraggio Trasparente Impronta & Quota Storage** ([`src/utils/storageQuota.ts`](file:///c:/Users/heoli/Serena%20Jarvis/src/utils/storageQuota.ts)):
  - Calcolo esatto dei byte UTF-16 in `localStorage` e ripartizione per categoria (dossier, impostazioni, survey/protocollo, snapshot di sicurezza).
  - Soglie prudenziali conservative sui 5 MB: stato *Nominale* (<80%), *Attenzione* (>=80%), *Critico* (>=95%).
  - Widget visivo integrato nel drawer di Sovranità Dati ([`src/components/HistoryDrawer.tsx`](file:///c:/Users/heoli/Serena%20Jarvis/src/components/HistoryDrawer.tsx)).
- [x] **Misure di Hardening Implementate nel Core**:
  - Blocco concorrenza atomico (`isRestoreLockActive`) contro doppi clic o sovrascritture simultanee.
  - Verifica preventiva bloccante su integrità hash SHA-256 (hash mismatch trattato come errore fatale, zero scritture).
  - Resilienza a snapshot di rollback corrotto (gestione dell'errore senza corrompere i dati locali correnti).
- [x] **Certificazione Completa Superata: T01 - T14 (100% PASS)** ([`tests/t01_t14_rigorous_suite_test.ts`](file:///c:/Users/heoli/Serena%20Jarvis/tests/t01_t14_rigorous_suite_test.ts)):
  - T01 Backup corrotto (hash alterato respinto al 100%)
  - T02 Backup con hash mancante (respinto)
  - T03 SchemaVersion non valida (999 e 0 respinte)
  - T04 JSON malformato (errore gestito senza crash)
  - T05 Archivio vuoto (ripristino coerente)
  - T06 Rollback multiplo (sequenza A-B-A-B integra)
  - T07 Benchmark grandi dataset (100, 500, 1.000 record con tempi <26ms)
  - T08 Stress test testi giganti (20k, 50k, 100k caratteri con hash canonico esatto)
  - T09 Restore ciclico (A -> B -> C -> A)
  - T10 Deep Scan annidamenti profondi (profondità albero 5 intercettata)
  - T11 Deep Scan array multidimensionali (3 livelli di annidamento intercettati)
  - T12 Matrice semantica falsi positivi (8 casi semantici verificati)
  - T13 Concorrenza restore (lock atomico verificato)
  - T14 Snapshot rollback corrotto (segnalazione pulita senza corruzione dati)

---

## FASE 3 — Sincronizzazione Privata Multi-Dispositivo (Sovrana)
*Stato: **COMPLETATA & COLLAUDATA AL 100% (SUITE SYNC-01 — SYNC-08)***

### Risultati Acquisiti e Verificati
- [x] **Integrazione Google Drive `appDataFolder` (`drive.appdata`)** ([`src/utils/syncEngine.ts`](file:///c:/Users/heoli/Serena%20Jarvis/src/utils/syncEngine.ts)):
  - Archiviazione nello spazio applicativo privato e invisibile del Google Drive personale di Serena.
  - **Zero database terzi**: nessun server cloud, Supabase, Firebase o backend condiviso.
  - Token di accesso OAuth2 custodito esclusivamente nella memoria volatile di sessione (mai salvato in chiaro su storage persistente).
- [x] **Motore di Riconciliazione Deterministico a 3 Vie**:
  - Riconciliazione additiva di record disgiunti senza duplicazioni.
  - Risoluzione conflitti deterministica basata su `revision` e `updatedAt`.
  - **Merge Conservativo dei Compiti**: se un'attività o un baby step viene completato su un dispositivo (es. iPhone), lo stato di completamento è prioritario e viene preservato anche se l'altro dispositivo aveva un testo modificato offline.
  - **Propagazione Tombstone (`deletedAt`)**: cancellazioni tracciate in modo non distruttivo per scongiurare resurrezioni di record tra dispositivi offline.
  - **Riconciliazione non distruttiva del Sondaggio 7 Giorni**: le risposte fornite da dispositivi differenti vengono unificate campo per campo senza sovrascritture accidentali.
- [x] **Barriera Perimetrale Bidirezionale**:
  - Il caveau remoto viene validato con dry-run e deep-scan prima di qualsiasi scrittura locale.
  - Se il file remoto contiene riferimenti ASL o MUM, la sincronizzazione viene bloccata a tutela della sfera personale.
- [x] **Interfaccia Sobria e Non Invasiva**:
  - Badge discreto in testata ([`src/components/Header.tsx`](file:///c:/Users/heoli/Serena%20Jarvis/src/components/Header.tsx)) con stato (*Sincronizzato*, *In corso*, *Offline/Locale*, *Errore*), timestamp dell'ultimo allineamento e sincronizzazione al clic.
  - Pannello di gestione dedicato nel cassetto Sovranità Dati ([`src/components/HistoryDrawer.tsx`](file:///c:/Users/heoli/Serena%20Jarvis/src/components/HistoryDrawer.tsx)) con toggle per auto-sync all'avvio, pulsante manuale "Sincronizza Ora" e configurazione protetta del token di sessione.
  - **Zero popup o modali moleste** durante il normale utilizzo dell'app.
- [x] **Suite di Collaudo Dedicata Fase 3 (`tests/fase3_sync_engine_test.ts`)**:
  - `SYNC-01`: Riconciliazione additiva non conflittuale ✅
  - `SYNC-02`: Risoluzione deterministica revision/timestamp ✅
  - `SYNC-03`: Merge conservativo dei compiti completati ✅
  - `SYNC-04`: Propagazione tombstone anti-resurrezione ✅
  - `SYNC-05`: Riconciliazione unificata impostazioni e sondaggio beta ✅
  - `SYNC-06`: Barriera perimetrale bidirezionale su caveau remoto ✅
  - `SYNC-07`: Integrità canonica deterministica SHA-256 ✅
  - `SYNC-08`: Ciclo E2E Google Drive mock (init, download, merge, patch, snapshot) ✅
- [x] **Verifica Statica e di Build**:
  - `npx tsc --noEmit`: 0 errori di tipizzazione.
  - `npm run build`: bundle di produzione compilato con successo (727ms).

---

## FASE 4 — Mobile-First & Deposito a Basso Attrito
*Stato: **COMPLETATA & COLLAUDATA AL 100% (SUITE MOB-01 — MOB-03, PWA-01 — PWA-04)***

### Risultati Acquisiti e Verificati
- [x] **Progressive Web App (PWA) & Offline Shell**:
  - `manifest.json` completo con `display: "standalone"`, `orientation: "portrait"`, colori di tema (`#F8FAFC`) e icone responsive con scopo maskable.
  - Tag iOS dedicati in `index.html`: `apple-mobile-web-app-capable="yes"`, `apple-mobile-web-app-status-bar-style="default"`, `apple-mobile-web-app-title="Jarvis"`.
  - Service Worker (`public/sw.js`) con pre-caching della shell applicativa (`/`, `/index.html`, `/manifest.json`, `/icon.svg`), navigazione network-first con fallback offline su `index.html`, e cache stale-while-revalidate per gli asset statici.
  - Bypass esplicito delle rotte API (`/api/*`) e Google Drive OAuth dal Service Worker.
- [x] **Ergonomia Tattile iOS & No Zoom Accidentale**:
  - Risoluzione definitiva del bug di zoom automatico su iOS Safari tramite regola mirata su mobile: `@media screen and (max-width: 768px) { input, textarea, select { font-size: 16px !important; } }`.
  - Supporto pieno alle safe areas dei dispositivi con notch/Dynamic Island (`env(safe-area-inset-top/bottom/left/right)`).
  - Eliminazione del ritardo di 300ms al tocco tramite `touch-action: manipulation;`.
  - Target touch conformi agli standard Apple HIG (>= 44px).
- [x] **Flusso "Scarico Rapido in 2 Tocchi"**:
  - Scorciatoia "⚡ Scarico Rapido" disponibile sia nella testata dell'InputPanel che direttamente dalla Dashboard quotidiana.
  - Al tocco: passaggio istantaneo alla modalità Deposito, reset dell'area di digitazione e posizionamento automatico del cursore nel campo testo in 60ms pronto per la scrittura o la dettatura.
- [x] **Fallback Vocale Trasparente & Notifica iOS Home Screen**:
  - Pillola informativa sobria in interfaccia mobile per incoraggiare l'uso del microfono nativo della tastiera iOS (🎙️), infinitamente più accurato e rapido delle API Web Speech mobili.
  - Suggerimento discreto e dismissibile (con persistenza in `localStorage`) per aggiungere Jarvis alla schermata Home di iPhone come web app standalone.
- [x] **Suite di Collaudo Dedicata Fase 4 (`tests/fase4_mobile_pwa_test.ts`)**:
  - `PWA-01`: Validità `manifest.json` e configurazione standalone ✅
  - `PWA-02`: Meta-tag iOS e viewport `viewport-fit=cover` in `index.html` ✅
  - `PWA-03`: Regole CSS safe-area, touch-action e font-size 16px anti-zoom ✅
  - `PWA-04`: Script Service Worker con pre-caching, offline fallback e bypass API ✅
  - `MOB-01`: Componente InputPanel con trigger e ref Scarico Rapido ✅
  - `MOB-02`: Touch targets >= 44px in InputPanel ✅
  - `MOB-03`: Callback ed ergonomia in Dashboard e App root ✅
- [x] **Verifica Statica e di Build**:
  - `npx tsc --noEmit`: 0 errori di tipizzazione.
  - `npm run build`: bundle di produzione e asset PWA compilati in 966ms.

---

## FASE 5 — Memoria Storica Trasparente & Controllo Totale
*Stato: **COMPLETATA & COLLAUDATA AL 100% (SUITE MEM-01 — MEM-10)***

### Risultati Acquisiti e Verificati
- [x] **Distinzione Fatti vs Ipotesi & Divieto Assoluto di Inferenze Arbitrarie**:
  - Netta tipizzazione strutturale tra fatti/preferenze confermate e deduzioni provvisorie: [`src/utils/memoryManager.ts`](file:///c:/Users/heoli/Serena%20Jarvis/src/utils/memoryManager.ts).
  - Divieto etico invalicabile di giudizi morali o etichette psicologiche sull'identità di Serena (*"procrastinatrice"*, *"pigra"*, *"incapace"*, ecc.), respinti a monte con avviso esplicito.
  - Le ipotesi non convalidate vengono etichettate come `[IPOTESI DA VALIDARE]` e non entrano nella memoria permanente fino alla convalida manuale di Serena.
- [x] **Sovranità Totale di Modifica ed Oblio (Controllo Totale CRUD)**:
  - Componente dedicato ad alta ergonomia: [`src/components/MemoryDossierManager.tsx`](file:///c:/Users/heoli/Serena%20Jarvis/src/components/MemoryDossierManager.tsx), integrato come tab primario in testata e accessibile in 1 clic.
  - Modifica del testo in linea immediata per ogni singolo fatto memorizzato.
  - Eliminazione istantanea con marcatore tombstone (`deletedAt`) per preservare la sincronizzazione distribuita senza resurrezioni.
  - Pulsante rapido nel Cockpit di analisi ([`src/components/OutputCockpit.tsx`](file:///c:/Users/heoli/Serena%20Jarvis/src/components/OutputCockpit.tsx)) per memorizzare direttamente baby step o sintesi nei fatti del secondo cervello.
- [x] **Dossier Evolutivi & Continuità Progetti (Replica & Integra)**:
  - 4 Dossier tematici di default (*Salute, Energia & Ritmi Personali*, *Casa, Spazi & Logistica*, *Finanze & Risorse*, *Studio, Scrittura & Idee Creative*) più creazione libera di nuovi dossier.
  - Collegamento bidirezionale tra memorie e dossier con conteggio analitico.
- [x] **Integrazione Trasparente con Prompt AI (`buildMemoryContextForAI`)**:
  - Il contesto delle chiamate AI in [`server/jarvisService.ts`](file:///c:/Users/heoli/Serena%20Jarvis/server/jarvisService.ts) riceve esclusivamente i fatti confermati e le direttive etiche, garantendo coerenza di memoria a lungo termine senza allucinazioni.
- [x] **Crittografia, Backup, Sync & Quote**:
  - Backup Envelope versionato aggiornato con inclusione di `payload.memories` e `payload.dossiers` sotto hash canonico deterministico SHA-256.
  - Motore di sincronizzazione Google Drive a 3 vie ([`src/utils/syncEngine.ts`](file:///c:/Users/heoli/Serena%20Jarvis/src/utils/syncEngine.ts)) esteso a memorie e dossier con risoluzione conflitti deterministica e propagazione tombstone.
  - Monitoraggio quote storage ([`src/utils/storageQuota.ts`](file:///c:/Users/heoli/Serena%20Jarvis/src/utils/storageQuota.ts)) aggiornato per tracciare i byte di memorie e dossier.
  - Retrocompatibilità garantita al 100% per i backup storici privi di memorie.
- [x] **Suite di Collaudo Dedicata Fase 5 (`tests/fase5_memoria_trasparente_test.ts`)**:
  - `MEM-01`: Creazione memoria di tipo FATTO e IPOTESI con metadati distribuiti ✅
  - `MEM-02`: Divieto etico assoluto di etichette psicologiche sull'identità di Serena ✅
  - `MEM-03`: Barriera perimetrale ASL Roma 1 & Progetto MUM su memorie e dossier ✅
  - `MEM-04`: Transizione controllata Ipotesi -> Fatto (Controllo Sovrano) ✅
  - `MEM-05`: Modifica in linea ed eliminazione non distruttiva (tombstone) ✅
  - `MEM-06`: Dossier tematici evolutivi e collegamenti di progetto ✅
  - `MEM-07`: Costruzione contesto trasparente per l'AI (Solo fatti certi) ✅
  - `MEM-08`: Integrazione Envelope di Backup e Hash Canonico SHA-256 ✅
  - `MEM-09`: Riconciliazione Sync a 3 vie (Merge additivo, revisioni, tombstone) ✅
  - `MEM-10`: Retrocompatibilità totale con backup legacy (senza memorie) ✅
- [x] **Verifica Statica e di Build**:
  - `npx tsc --noEmit`: 0 errori di tipizzazione.
  - `npm run build`: bundle di produzione compilato con successo in 978ms.

---

## FASE 6 — Voce Fluida e Briefing su Richiesta
*Stato: **COMPLETATA & COLLAUDATA AL 100% (SUITE BRF-01 — BRF-09)***

### Risultati Acquisiti e Verificati
- [x] **Briefing Rigorosamente PULL (Su Richiesta)**:
  - Zero notifiche push invasive, zero sveglie mattutine automatiche alle 08:00.
  - Pulsante prominente ma sobrio in testata della sezione *OGGI — Regia Quotidiana*: [`src/components/Dashboard.tsx`](file:///c:/Users/heoli/Serena%20Jarvis/src/components/Dashboard.tsx).
  - Generazione istantanea del punto della giornata solo quando Serena lo richiede cliccando **"🎙️ Dammi il punto di oggi"**.
- [x] **Formato Ultra-Compatto (I 3 Pilastri di Focus)**:
  - **1 sola priorità reale aperta**: selezionata deterministicamente tra le attività aperte o le scadenze vincolanti.
  - **1 baby step concreto da 5-10 minuti**: isolato per sbloccare l'inerzia senza affanno o compiti forzati.
  - **Vincoli oggettivi entro 24-48h**: solo scadenze inderogabili imminenti (le scadenze a lungo termine vengono escluse per non intasare l'attenzione).
- [x] **Tono René Ferretti (Sobrietà Pragmatica · Zero Prediche)**:
  - Stile sobrio, asciutto, disincantato, privo di falso ottimismo e di retorica motivazionale da guru (*"Poco fumo, un passo per volta: portiamo a casa la giornata, poi si vedrà"*).
  - Resilienza a orizzonte sgombro: se non ci sono compiti pendenti né scadenze, il briefing comunica serenamente l'assenza di pendenze (*"Orizzonte completamente sgombro: giornata libera da urgenze"*).
- [x] **Barriera Perimetrale Invalicabile (ASL & MUM rigorosamente esclusi)**:
  - Deep-scan perimetrale e filtro a monte in [`src/utils/briefingVoice.ts`](file:///c:/Users/heoli/Serena%20Jarvis/src/utils/briefingVoice.ts): nessun dato di ufficio ASL Roma 1 o Progetto MUM entra nella sintesi del briefing o nel parlato.
  - Validazione `classifyPerimeter` applicata sia sui record sorgente sia sul testo parlato prima della pronuncia.
- [x] **Integrazione Memoria Storica Trasparente (Fase 5)**:
  - Il briefing attinge ai fatti confermati e alle preferenze di ritmo personale registrate nel secondo cervello (es. blocchi di lavoro, pause, orari).
- [x] **Web Speech API Audio Controller & Card Interattiva**:
  - Componente dedicato: [`src/components/DailyBriefingCard.tsx`](file:///c:/Users/heoli/Serena%20Jarvis/src/components/DailyBriefingCard.tsx).
  - Controlli audio integrati W3C: **Ascolta (Play)**, **Pausa**, **Stop**, con rilevamento automatico di voci italiane naturali (`it-IT`).
  - Durata stimata di ascolto calcolata (~20-30 secondi).
  - Box a scomparsa per la lettura testuale silenziosa della trascrizione.
  - Tasto rapido in 1 tap **"Segna come Fatto"** per archiviare il baby step direttamente dal briefing.
- [x] **Suite di Collaudo Dedicata Fase 6 (`tests/fase6_briefing_voce_test.ts`)**:
  - `BRF-01`: Generazione PULL deterministica (ID univoco e timestamp) ✅
  - `BRF-02`: Formato compatto: 1 sola priorità reale aperta isolata ✅
  - `BRF-03`: Isolamento di 1 solo baby step concreto (5-10 min) ✅
  - `BRF-04`: Filtro vincoli oggettivi (solo imminenti 24-48h, escluse scadenze lontane) ✅
  - `BRF-05`: Tono René Ferretti sobrio (zero retorica motivazionale) ✅
  - `BRF-06`: Barriera perimetrale ASL/MUM invalicabile (intercettazione ed espulsione totale) ✅
  - `BRF-07`: Integrazione memoria storica trasparente e ritmi personali ✅
  - `BRF-08`: Pulizia testo parlato, stima durata e controller Web Speech API (play, pause, resume, cancel) ✅
  - `BRF-09`: Resilienza stato orizzonte sgombro (zero compiti/scadenze) ✅
- [x] **Verifica Statica e di Build**:
  - `npx tsc --noEmit`: 0 errori di tipizzazione.
  - `npm run build`: bundle di produzione Vite compilato con successo.

