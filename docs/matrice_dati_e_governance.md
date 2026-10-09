# JARVIS — MATRICE DEI DATI & GOVERNANCE DELLA PRIVACY
## Mappa dei Dati, Classificazione di Riservatezza & Perimetro Invalicabile
**Titolare esclusiva dei dati:** Serena Sampieri  
**Architettura:** Sovrana, Locale-First con Sincronizzazione Privata su Google Drive (`appDataFolder`)  
**Versione Specifiche:** 1.0 (Fase 2 Roadmap)

---

## 1. Principi di Architettura dei Dati

1. **Minimizzazione e Pertinenza**: Jarvis memorizza unicamente dati funzionali ad alleggerire il carico cognitivo personale di Serena (decisioni, organizzazione domestica/privata, scadenze familiari, pensieri da depositare).
2. **Divieto di Dati Istituzionali / Lavorativi d'Ufficio**:
   * I dati di **ASL Roma 1** (pazienti, cartelle, delibere, determine, gare d'appalto, ventiloterapia, budget di distretto, comunicazioni sindacali o istituzionali) sono **categoricamente esclusi al 100%**.
   * I dati di **Progetto MUM** (canali editoriali, podcast, scalette di redazione, blog) appartengono a canali di lavoro specifici e sono esclusi dal secondo cervello personale.
3. **Dual-Layer Guardrail**:
   * **Livello 1 (Client-side)**: Blocco deterministico immediato prima dell'invio in rete o della persistenza nello storage.
   * **Livello 2 (Server-side)**: Verifica preventiva sui payload prima di qualsiasi invocazione dei modelli linguistici (Gemini).
4. **Trasparenza Totale**: Nessun dato opaco, nessun log telemetrico occulto, nessuna cessione a terzi. Tutto risiede nello storage locale del browser di Serena e, in Fase 3, nella sua cartella nascosta personale Google Drive (`drive.appdata`).

---

## 2. Matrice Formale di Classificazione dei Dati

| DATO | SENSIBILITÀ | ORIGINE | SOLO LOCALE | DA SINCRONIZZARE | DA CIFRARE | DA ESCLUDERE | CONSERVAZIONE | CANCELLAZIONE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Input Grezzo Serena (`rawInput`)** | Alta | Voce / Tastiera | No | Sì (Drive privato) | In transito (HTTPS) / A riposo su Drive | Termini ASL/MUM | Permanente con revisione | Soft-delete (`deletedAt`) o eliminazione definitiva manuale |
| **Trascrizione Pulita (`trascrizionePulita`)** | Media | Jarvis AI | No | Sì (Drive privato) | Standard Drive | Termini ASL/MUM | Permanente associata al record | Eliminata con il record |
| **Pensieri & Sfoghi (`deposito`)** | Massima (Intima) | Serena | Opzionale utente | Sì (su Drive personale riservato) | Riservata | Nessuna se personale | Permanente o auto-archiviazione a scelta | Eliminazione in 1 clic da interfaccia |
| **Salute Personale / Familiare** *(es. visite private, visite genitori/figli)* | Alta | Serena | No | Sì (Drive privato) | Riservata | Sanità pubblica d'ufficio / ASL | Fino a risoluzione promemoria | Soft-delete o cancellazione manuale |
| **Decisioni & Dilemmi (`decisione`, `consiglio`)** | Alta | Serena + Jarvis | No | Sì (Drive privato) | Standard Drive | Ambiti lavorativi ASL/MUM | Permanente come memoria storica | Eliminabile da Serena con 1 clic |
| **Azioni & Baby Step (`azioni`, `babyStep`)** | Media | Jarvis AI | No | Sì (Drive privato) | Standard Drive | Termini ASL/MUM | Fino a completamento (`completato: true`) | Archiviabile o eliminabile |
| **Scadenze & Termini (`scadenze`)** | Media | Serena + Jarvis | No | Sì (Drive privato) | Standard Drive | Delibere / Gare ASL | Fino a decorrenza termine | Archiviabile |
| **Impostazioni Applicazione (`settings`)** | Bassa | Interfaccia utente | No | Sì (Drive privato) | Standard | Chiavi API / Token (vietati nell'envelope) | Permanente per dispositivo | Sovrascrivibile |
| **Protocollo di Collaudo 7 Giorni (`survey`)** | Media | Questionario Serena | No | Sì (Drive privato) | Standard | Riferimenti lavorativi | Permanente per analisi efficacia | Reset manuale da modale |
| **Snapshot di Sicurezza (`safetySnapshot`)** | Alta | Sistema automatico | **SÌ (SOLO LOCALE)** | **NO (Non sincronizzato)** | Locale browser | Esclusioni standard | Solo l'ultimo snapshot valido | Sovrascritto a ogni ripristino o eliminabile |
| **Dati ASL Roma 1 / Ufficio Sanitario** | **CRITICA / VIETATA** | Qualsiasi sorgente | **NO (Rifiutato)** | **NO (Bloccato)** | N/A | **ESCLUSIONE TOTALE AL 100%** | **Nessuna (Zero scritture)** | **Respinto istantaneamente con notifica** |
| **Dati Progetto MUM / Podcast** | **VIETATA** | Qualsiasi sorgente | **NO (Rifiutato)** | **NO (Bloccato)** | N/A | **ESCLUSIONE TOTALE AL 100%** | **Nessuna (Zero scritture)** | **Respinto istantaneamente con notifica** |

---

## 3. Schema dei Metadati di Sincronizzazione e Governance

Ogni record archiviato o sincronizzato implementa la struttura identificativa deterministica definita nello Step 1:

```json
{
  "id": "rec_uuid-v4-stabile",
  "createdAt": "2026-10-09T18:00:00.000Z",
  "updatedAt": "2026-10-09T18:00:00.000Z",
  "revision": 1,
  "deviceId": "dev_f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "deletedAt": null
}
```

### Regole di Risoluzione e Conflitti
1. **Identificativo Stabile (`id`)**: Non muta mai durante il ciclo di vita del record, garantendo l'allineamento tra dispositivi.
2. **Revisione Crescente (`revision`)**: A ogni modifica (es. completamento di un baby step o modifica di un titolo), `revision` aumenta di `1` e `updatedAt` viene aggiornato.
3. **Cancellazione Non Distruttiva (`deletedAt`)**: L'eliminazione non fa sparire immediatamente il record dallo storage se deve essere propagata ai dispositivi: registra un marcatore timestamp (`deletedAt: "2026-..."`), evitando che un altro dispositivo offline lo re-inserisca credendolo un elemento nuovo.
4. **Diritto all'Oblio**: Serena dispone di un comando di cancellazione definitiva (Hard Delete) locale che rimuove integralmente sia record che snapshot.

---

## 4. Gestione delle Quote di Memorizzazione (Storage Footprint)

* **Tecnologia attuale**: `localStorage` (limite di sicurezza prudenziale fissato a 5 MB per origine).
* **Controllo Continuo del Peso**: Il modulo `storageQuota.ts` calcola l'impronta esatta in byte (UTF-16) per ogni voce di archivio.
* **Soglie di Allarme**:
  * **Sotto l'80% (< 4 MB)**: Funzionamento nominale verde.
  * **Oltre l'80% (>= 4 MB)**: Avviso non invasivo nel Drawer che consiglia l'esportazione di un backup di sicurezza.
  * **Soglia Critica (> 4.8 MB)**: Invito alla pulizia delle analisi superate o predisposizione del bridge trasparente verso **IndexedDB** (capienza multi-gigabyte).
