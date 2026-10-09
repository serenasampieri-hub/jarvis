import React, { useState } from "react";
import {
  X,
  Printer,
  Copy,
  Check,
  Brain,
  Sparkles,
  Layers,
  Target,
  Volume2,
  GitBranch,
  Scale,
  ShieldCheck,
  ArrowRight,
  Flame,
  Gauge,
  BookOpen,
} from "lucide-react";

interface BrochureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrochureModal: React.FC<BrochureModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = async () => {
    const brochureText = `=================================================
JARVIS — SECONDO CERVELLO VIRTUALE
Cabina di Regia Personale & Decisionale di Serena Sampieri
=================================================

1. COS'È E A CHE SERVE JARVIS
Jarvis non è un assistente generalista e non è un generatore automatico di to-do list.
È il secondo cervello privato di Serena, progettato con un unico scopo fondamentale:
assorbire il caos mentale, proteggere la sua energia e ridurre il lavoro cognitivo residuo, senza mai produrre nuovo lavoro da amministrare.

2. I QUATTRO PILASTRI NON NEGOZIABILI
- ZERO COMPIACIMENTO & ONESTÀ LEALE: lucidità e giudizio senza durezza punitiva. Non asseconda alibi o piani irrealistici; dice con chiarezza se un'idea è dispersiva o se la priorità reale è riposare.
- NON TUTTO È UN'AZIONE (LE 3 INTENZIONI):
  * Deposito: togliersi un peso dalla testa senza ricevere compiti imposti.
  * Elaborazione: comprendere nodi, collegamenti e contraddizioni senza ancora decidere.
  * Azione/Decisione: richiedere direzione, priorità (1-3) e un baby step concreto.
- MINIMA SPESA COGNITIVA, MASSIMA RESA: priorità (1-3) calibrate sull'energia reale della giornata. Baby step da 5-10 minuti piccolo ma capace di produrre un avanzamento effettivo (non solo illusione di movimento).
- CONTINUITÀ REALE (REPLICA & INTEGRA): non azzera la memoria; mantiene la storia del dossier, i vincoli e lo stato del progetto.

3. ARCHITETTURA OPERATIVA
- Voce Naturale in Mobilità: trascrive pulendo gli intercalari, sintetizza in ~30s di audio asciutto e autorevole.
- Replica & Integra Step-by-Step: permette di replicare sul progetto aperto per aggiungere vincoli o chiedere il passo successivo senza rispiegare tutto.
- Il Consiglio dei Quattro: mette attorno al tavolo Pragmatico, Economo, Scettico e Serena del Futuro per evidenziare tensioni e costi reali.

4. PROTOCOLLO DI COLLAUDO (7 GIORNI A CRACOVIA)
- La Domanda Centrale: Jarvis comprende Serena abbastanza da ridurre il suo lavoro mentale, o produce altro materiale intelligente che Serena deve ancora leggere, correggere e organizzare?
- Criterio di Riuscita:
  * È un Secondo Cervello se comprende l'intenzione, distingue lo scarico dall'azione, ricorda i dossier e abbassa il carico mentale da prima a dopo.
  * È ancora un semplice assistente se produce risposte generiche, trasforma ogni pensiero in compito e genera ulteriore materiale da amministrare.

5. RISERVATEZZA
Tutti i dati e i dossier salvati risiedono esclusivamente nel LocalStorage del browser sul dispositivo di Serena.`;

    try {
      await navigator.clipboard.writeText(brochureText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto print:max-h-none print:border-none print:shadow-none print:w-full print:bg-white print:text-slate-900">
        
        {/* Header Modale (Nascosto in stampa) */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
              <BookOpen className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Brochure Ufficiale di Jarvis
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Documento Esecutivo & Guida all'Architettura Cognitiva
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href="/brochure.html"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1.5 px-2.5 font-medium shadow-xs"
              title="Apri o Scarica versione HTML"
            >
              <span>Apri a Schermo Intero</span>
            </a>

            <a
              href="/brochure.md"
              download="JARVIS_BROCHURE.md"
              className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1.5 px-2.5 font-medium shadow-xs"
              title="Scarica file Markdown"
            >
              <span>⬇ Scarica .MD</span>
            </a>

            <button
              onClick={handleCopyText}
              className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1.5 px-2.5 font-medium shadow-xs"
              title="Copia testo della brochure"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span className="hidden sm:inline">{copied ? "Copiato" : "Copia Testo"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg border border-sky-300 hover:border-sky-400 bg-sky-50 text-sky-800 hover:bg-sky-100 transition-colors cursor-pointer text-xs flex items-center gap-1.5 px-2.5 font-bold shadow-xs"
              title="Stampa o Salva in PDF"
            >
              <Printer className="w-3.5 h-3.5 text-sky-600" />
              <span>Stampa / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer ml-1"
              title="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo Scrollabile / Documento Stampabile */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-8 flex-1 bg-[#F8FAFC] text-slate-800 print:text-slate-900 print:overflow-visible print:p-8 print:bg-white">
          
          {/* COPERTINA / HERO BROCHURE */}
          <div className="relative border-b-2 border-slate-200 pb-8 space-y-4 print:border-slate-900">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-800 font-bold uppercase tracking-wider print:bg-slate-100 print:border-slate-300 print:text-slate-800">
                Documento Esecutivo Privato
              </span>
              <span className="text-slate-500 print:text-slate-600 font-semibold">
                Edizione Speciale Collaudo (7 Giorni a Cracovia)
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-sky-500 shadow-xs shadow-sky-500/50 print:bg-sky-600" />
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 uppercase print:text-slate-950">
                  JARVIS
                </h1>
              </div>
              <p className="text-base sm:text-lg font-bold text-sky-800 print:text-slate-800">
                Secondo Cervello Virtuale & Cabina di Regia Personale di Serena Sampieri
              </p>
              <p className="text-xs sm:text-sm text-slate-600 print:text-slate-600 max-w-2xl leading-relaxed">
                Infrastruttura cognitiva di de-saturazione, scomposizione operativa e supporto decisionale. Progettata su misura per pensare con Serena, proteggere la sua energia e assorbire il caos mentale senza produrre nuovo lavoro da amministrare.
              </p>
            </div>
          </div>

          {/* SEZIONE 1: A CHE SERVE (L'ESSENZA) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Brain className="w-5 h-5 shrink-0 text-sky-600" />
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider">
                1. A che serve Jarvis: Scopo & Identità
              </h2>
            </div>
            
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700 print:text-slate-800">
              Jarvis <strong>non è un assistente generalista</strong> e <strong>non è un generatore automatico di to-do list</strong>. La maggior parte dei sistemi digitali attuali fallisce perché trasforma ogni frase in un compito, riversando addosso all'utente altro materiale intelligente da leggere, verificare e riordinare.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-xs">
                <span className="text-[11px] font-mono font-bold text-sky-700 uppercase bg-sky-50 px-2 py-0.5 rounded border border-sky-200">Funzione I</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase pt-1">Decompressione</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Accoglie sfoghi, orari confusi e timori. Pulisce gli intercalari e archivia ordinatamente senza forzare compiti.
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-xs">
                <span className="text-[11px] font-mono font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Funzione II</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase pt-1">Filtro Leale</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Smonta alibi e piani irrealistici. Dice con lucidità chirurgica se un'idea è dispersiva o se la priorità è riposare.
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-xs">
                <span className="text-[11px] font-mono font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Funzione III</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase pt-1">Minima Spesa</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Taglia il superfluo: isola 1-3 priorità massime e un Baby Step (5-10 min) capace di sbloccare davvero il problema.
                </p>
              </div>
            </div>
          </div>

          {/* SEZIONE 2: I 4 PILASTRI NON NEGOZIABILI */}
          <div className="space-y-4 border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 text-slate-900">
              <Layers className="w-5 h-5 shrink-0 text-sky-600" />
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider">
                2. I Quattro Pilastri Non Negoziabili
              </h2>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-1 shadow-xs">
                <strong className="text-amber-800 block font-bold text-xs uppercase tracking-wider">
                  1. Zero Compiacimento e Onestà Leale
                </strong>
                <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                  Jarvis non cerca l'approvazione di Serena. Non usa frasi da guru, cerimonie o finti incoraggiamenti. Offre lucidità assoluta e giudizio sincero, senza durezza fine a se stessa: la fermezza serve a proteggere l'energia reale di Serena.
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-1 shadow-xs">
                <strong className="text-sky-800 block font-bold text-xs uppercase tracking-wider">
                  2. Non Tutto è un'Azione (Le 3 Intenzioni Distinte)
                </strong>
                <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                  • <em>Deposito:</em> togliersi un pensiero dalla testa. Jarvis registra, riordina e tace; non assegna compiti.<br/>
                  • <em>Elaborazione:</em> esplorare contraddizioni e collegamenti senza essere ancora pronti a decidere.<br/>
                  • <em>Azione / Decisione:</em> richiesta esplicita di direzione, priorità rigide e baby step concreto.
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-1 shadow-xs">
                <strong className="text-emerald-800 block font-bold text-xs uppercase tracking-wider">
                  3. Minima Spesa Cognitiva & Baby Step Giusto
                </strong>
                <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                  Nessun obbligo dogmatico di trovare sempre tre priorità: se l'energia della giornata è esaurita, Jarvis ne propone una sola. Il Baby Step da 5-10 minuti deve essere <strong>giusto</strong> (deve avvicinare concretamente alla soluzione, senza offrire solo l'illusione consolatoria di muoversi).
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-1 shadow-xs">
                <strong className="text-indigo-800 block font-bold text-xs uppercase tracking-wider">
                  4. Continuità Reale & Memoria dei Dossier
                </strong>
                <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                  Con la funzione <em>Replica & Integra</em>, Jarvis sa dove si trova realmente il progetto. Non azzera il contesto: incorpora i nuovi vincoli, registra ciò che è stato fatto ed elimina ciò che è superato senza rispiegare tutto da capo.
                </p>
              </div>
            </div>
          </div>

          {/* SEZIONE 3: ARCHITETTURA OPERATIVA (LE FUNZIONALITÀ) */}
          <div className="space-y-4 border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 text-slate-900">
              <Sparkles className="w-5 h-5 shrink-0 text-sky-600" />
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider">
                3. L'Infrastruttura Operativa sul Campo
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-1 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="p-1 rounded bg-sky-50 text-sky-600 border border-sky-100">
                    <Volume2 className="w-4 h-4" />
                  </span>
                  <span>Dettatura Vocale & Sintesi ~30s</span>
                </div>
                <p className="text-slate-600 leading-relaxed pt-1">
                  Pensato per l'uso a una mano e con le cuffie. Trascrive e pulisce il parlato, restituendo un verdetto audio asciutto e rapido.
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-1 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="p-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <GitBranch className="w-4 h-4" />
                  </span>
                  <span>Replica & Integra Step by Step</span>
                </div>
                <p className="text-slate-600 leading-relaxed pt-1">
                  Modulo interattivo ai piedi del dossier per aggiungere dettagli ("Ho fatto il baby step, qual è il prossimo?") senza ripartire da zero.
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-1 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="p-1 rounded bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100">
                    <Scale className="w-4 h-4" />
                  </span>
                  <span>Il Consiglio dei Quattro</span>
                </div>
                <p className="text-slate-600 leading-relaxed pt-1">
                  Quattro voci indipendenti (Pragmatico, Economo, Scettico, Serena del Futuro) per far emergere costi nascosti, rischi e verdetti provvisori.
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-1 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="p-1 rounded bg-teal-50 text-teal-600 border border-teal-100">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <span>Perimetro & Privacy Locale</span>
                </div>
                <p className="text-slate-600 leading-relaxed pt-1">
                  Esclusione categorica di contesti lavorativi protetti (ASL Roma 1 / MUM) e archiviazione dati esclusiva nel LocalStorage del browser.
                </p>
              </div>
            </div>
          </div>

          {/* SEZIONE 4: IL PROTOCOLLO DI COLLAUDO (7 GIORNI A CRACOVIA) */}
          <div className="space-y-4 border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 text-slate-900">
              <Gauge className="w-5 h-5 shrink-0 text-sky-600" />
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider">
                4. Il Collaudo dei 7 Giorni: Criteri di Riuscita
              </h2>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
              <div className="text-xs font-mono text-sky-800 uppercase font-bold">
                La Domanda Centrale del Collaudo:
              </div>
              <blockquote className="text-sm sm:text-base font-semibold italic text-slate-900 border-l-4 border-sky-500 pl-4 py-1 bg-sky-50/60 rounded-r-xl">
                "Jarvis comprende Serena abbastanza da ridurre il suo lavoro mentale oppure produce altro materiale intelligente che Serena deve ancora leggere, correggere e organizzare?"
              </blockquote>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-1.5">
                  <strong className="text-emerald-900 block font-bold text-xs uppercase">È un Secondo Cervello se:</strong>
                  <ul className="text-slate-700 space-y-1 text-xs">
                    <li>• Comprende l'intenzione dietro le parole</li>
                    <li>• Distingue deposito, elaborazione e azione</li>
                    <li>• Mantiene il contesto dei dossier</li>
                    <li>• Calibra le priorità sull'energia reale</li>
                    <li>• Riduce le spiegazioni ripetute</li>
                  </ul>
                </div>

                <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 space-y-1.5">
                  <strong className="text-rose-900 block font-bold text-xs uppercase">Resta un semplice assistente se:</strong>
                  <ul className="text-slate-700 space-y-1 text-xs">
                    <li>• Produce risposte generiche</li>
                    <li>• Trasforma ogni pensiero in compito</li>
                    <li>• Obbliga a correggere continuamente la sintesi</li>
                    <li>• Genera ulteriore materiale da amministrare</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER BROCHURE */}
          <div className="border-t border-slate-200 pt-6 text-[11px] font-mono text-slate-500 flex flex-wrap items-center justify-between gap-3">
            <div>JARVIS — Cabina di Regia Personale di Serena Sampieri</div>
            <div>Versione: Collaudo 7 Giorni · Cracovia</div>
          </div>

        </div>

        {/* Footer Barra Azioni (Nascosta in stampa) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <span className="text-xs text-slate-500 font-mono hidden sm:inline font-medium">
            Disponibile in ogni momento da iPhone e desktop.
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-sky-600" />
              <span>Stampa / Salva in PDF</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Chiudi
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
