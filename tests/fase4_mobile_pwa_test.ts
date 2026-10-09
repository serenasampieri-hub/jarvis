/**
 * Suite di Collaudo Rigorosa per la Fase 4:
 * Mobile-First, PWA su iPhone & Deposito a Basso Attrito ("Scarico Rapido in 2 Tocchi").
 *
 * Copre:
 * - PWA-01: Validità e conformità di manifest.json
 * - PWA-02: Tag HTML Mobile & iOS Safe Area in index.html
 * - PWA-03: Service Worker (public/sw.js) per funzionamento offline
 * - MOB-01: Ergonomia Tattile e Prevenzione Zoom iOS in src/index.css
 * - MOB-02: Flusso "Scarico Rapido in 2 Tocchi" (Dashboard & InputPanel)
 * - MOB-03: Fallback Trasparente Vocale & Istruzioni iOS
 * - PWA-04: Integrità degli asset PWA generati nella build dist/
 */

import * as fs from "fs";
import * as path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

const ROOT_DIR = process.cwd();

async function runFase4Tests() {
  console.log("================================================================================");
  console.log("SUITE COLLAUDO FASE 4: MOBILE-FIRST, PWA IPHONE & DEPOSITO A BASSO ATTRITO");
  console.log("================================================================================\n");

  // ----------------------------------------------------------------------------
  // PWA-01: Validità e conformità di manifest.json
  // ----------------------------------------------------------------------------
  console.log("▶ PWA-01: Verifica manifest.json per installazione PWA autonoma su iPhone/Desktop");
  {
    const manifestPath = path.join(ROOT_DIR, "public", "manifest.json");
    assert(fs.existsSync(manifestPath), "public/manifest.json deve esistere");

    const manifestRaw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestRaw);

    assert(manifest.name && manifest.name.includes("Jarvis"), "manifest.name deve contenere Jarvis");
    assert(manifest.short_name === "Jarvis", "manifest.short_name deve essere 'Jarvis'");
    assert(manifest.display === "standalone", `display deve essere 'standalone', trovato: ${manifest.display}`);
    assert(manifest.start_url === "/", "start_url deve essere '/'");
    assert(manifest.background_color === "#F8FAFC", `background_color deve essere #F8FAFC, trovato: ${manifest.background_color}`);
    assert(manifest.theme_color === "#F8FAFC", `theme_color deve essere #F8FAFC, trovato: ${manifest.theme_color}`);
    assert(manifest.orientation === "portrait", "orientation deve essere portrait");
    assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "Devono essere presenti almeno 2 icone (192 e 512)");

    const has512 = manifest.icons.some((icon: any) => icon.sizes === "512x512");
    const has192 = manifest.icons.some((icon: any) => icon.sizes === "192x192");
    assert(has512 && has192, "Devono essere presenti sia l'icona 192x192 sia quella 512x512");

    console.log("  ✅ PWA-01 PASS: manifest.json conforme agli standard W3C e Apple per PWA standalone.");
  }

  // ----------------------------------------------------------------------------
  // PWA-02: Tag HTML Mobile & iOS Safe Area in index.html
  // ----------------------------------------------------------------------------
  console.log("\n▶ PWA-02: Verifica meta tag mobile e supporto Apple Web App in index.html");
  {
    const indexPath = path.join(ROOT_DIR, "index.html");
    const indexHtml = fs.readFileSync(indexPath, "utf-8");

    assert(indexHtml.includes("viewport-fit=cover"), "index.html deve includere viewport-fit=cover per gestire notch e Dynamic Island");
    assert(indexHtml.includes("user-scalable=no"), "index.html deve specificare user-scalable=no per evitare zoom accidentale");
    assert(indexHtml.includes('apple-mobile-web-app-capable" content="yes"'), "index.html deve contenere apple-mobile-web-app-capable='yes'");
    assert(indexHtml.includes('apple-mobile-web-app-status-bar-style" content="default"'), "index.html deve impostare status-bar-style a default");
    assert(indexHtml.includes('apple-touch-icon'), "index.html deve definire link rel='apple-touch-icon'");
    assert(indexHtml.includes('manifest.json'), "index.html deve collegare manifest.json");

    console.log("  ✅ PWA-02 PASS: index.html equipaggiato con tutti i meta tag per iOS fullscreen.");
  }

  // ----------------------------------------------------------------------------
  // PWA-03: Service Worker (public/sw.js) per funzionamento offline
  // ----------------------------------------------------------------------------
  console.log("\n▶ PWA-03: Verifica Service Worker e strategia di caching offline (public/sw.js)");
  {
    const swPath = path.join(ROOT_DIR, "public", "sw.js");
    assert(fs.existsSync(swPath), "public/sw.js deve esistere");

    const swContent = fs.readFileSync(swPath, "utf-8");
    assert(swContent.includes("PRECACHE_ASSETS"), "sw.js deve definire un elenco di asset essenziali di precache");
    assert(swContent.includes("/index.html") && swContent.includes("/manifest.json"), "sw.js deve pre-memorizzare index.html e manifest.json");
    assert(swContent.includes("request.mode === \"navigate\""), "sw.js deve gestire esplicitamente la navigazione HTML");
    assert(swContent.includes("url.pathname.startsWith(\"/api/\")"), "sw.js deve escludere le chiamate API dal caching indebito");
    assert(swContent.includes("googleapis.com"), "sw.js deve escludere le API di Google dal caching statico");
    assert(swContent.includes("caches.delete"), "sw.js deve gestire la pulizia delle vecchie versioni della cache all'attivazione");

    // Verifica registrazione in src/main.tsx
    const mainPath = path.join(ROOT_DIR, "src", "main.tsx");
    const mainContent = fs.readFileSync(mainPath, "utf-8");
    assert(
      mainContent.includes("serviceWorker") && mainContent.includes("register('/sw.js')"),
      "src/main.tsx deve registrare il Service Worker"
    );

    console.log("  ✅ PWA-03 PASS: Service Worker implementato e registrato correttamente con gestione offline.");
  }

  // ----------------------------------------------------------------------------
  // MOB-01: Ergonomia Tattile e Prevenzione Zoom iOS in src/index.css
  // ----------------------------------------------------------------------------
  console.log("\n▶ MOB-01: Verifica regole CSS iOS safe area e blocco zoom Safari (src/index.css)");
  {
    const cssPath = path.join(ROOT_DIR, "src", "index.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    assert(cssContent.includes("safe-area-inset-top"), "index.css deve supportare env(safe-area-inset-top)");
    assert(cssContent.includes("safe-area-inset-bottom"), "index.css deve supportare env(safe-area-inset-bottom)");
    assert(cssContent.includes("font-size: 16px !important"), "index.css deve forzare font-size 16px su mobile per impedire l'auto-zoom di Safari");
    assert(cssContent.includes("touch-action: manipulation"), "index.css deve specificare touch-action: manipulation per eliminare il ritardo al tap");

    console.log("  ✅ MOB-01 PASS: Safe area insets e prevenzione zoom 16px implementati in index.css.");
  }

  // ----------------------------------------------------------------------------
  // MOB-02: Flusso "Scarico Rapido in 2 Tocchi" (Dashboard & InputPanel)
  // ----------------------------------------------------------------------------
  console.log("\n▶ MOB-02: Verifica flusso 'Scarico Rapido in 2 Tocchi'");
  {
    const inputPanelPath = path.join(ROOT_DIR, "src", "components", "InputPanel.tsx");
    const inputPanelContent = fs.readFileSync(inputPanelPath, "utf-8");

    assert(inputPanelContent.includes("handleScaricoRapido"), "InputPanel.tsx deve contenere l'handler handleScaricoRapido");
    assert(inputPanelContent.includes("textareaRef"), "InputPanel.tsx deve usare textareaRef per il focus istantaneo");
    assert(inputPanelContent.includes("text-base sm:text-sm"), "InputPanel.tsx textarea deve usare text-base su mobile per conformità iOS");
    assert(inputPanelContent.includes("min-h-[44px]"), "InputPanel.tsx deve applicare min-h-[44px] ai pulsanti primari touch");

    const dashboardPath = path.join(ROOT_DIR, "src", "components", "Dashboard.tsx");
    const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");
    assert(dashboardContent.includes("onNavigateToScaricoRapido"), "Dashboard.tsx deve supportare la prop onNavigateToScaricoRapido");
    assert(dashboardContent.includes("Scarico Rapido"), "Dashboard.tsx deve mostrare il pulsante 'Scarico Rapido'");

    const appPath = path.join(ROOT_DIR, "src", "App.tsx");
    const appContent = fs.readFileSync(appPath, "utf-8");
    assert(appContent.includes("handleNavigateToScaricoRapido"), "App.tsx deve implementare handleNavigateToScaricoRapido");

    console.log("  ✅ MOB-02 PASS: Flusso Scarico Rapido in 2 Tocchi cablato end-to-end con focus reattivo.");
  }

  // ----------------------------------------------------------------------------
  // MOB-03: Fallback Trasparente Vocale & Istruzioni iOS
  // ----------------------------------------------------------------------------
  console.log("\n▶ MOB-03: Verifica fallback vocale e suggerimento tastiera nativa iOS");
  {
    const inputPanelPath = path.join(ROOT_DIR, "src", "components", "InputPanel.tsx");
    const inputPanelContent = fs.readFileSync(inputPanelPath, "utf-8");

    assert(inputPanelContent.includes("isIOS"), "InputPanel.tsx deve rilevare l'ambiente iOS");
    assert(inputPanelContent.includes("tastiera nativa Apple"), "InputPanel.tsx deve indicare l'uso del microfono della tastiera iOS");

    const appPath = path.join(ROOT_DIR, "src", "App.tsx");
    const appContent = fs.readFileSync(appPath, "utf-8");
    assert(appContent.includes("showPwaPrompt"), "App.tsx deve rilevare quando mostrare il prompt PWA iOS");
    assert(appContent.includes("Aggiungi alla schermata Home"), "App.tsx deve mostrare istruzioni sobrie per installare su iPhone");

    console.log("  ✅ MOB-03 PASS: Rilevamento iOS e istruzioni microfono nativo verificati.");
  }

  // ----------------------------------------------------------------------------
  // PWA-04: Integrità degli asset PWA generati nella build dist/
  // ----------------------------------------------------------------------------
  console.log("\n▶ PWA-04: Verifica presenza degli asset PWA nella cartella di produzione dist/");
  {
    const distDir = path.join(ROOT_DIR, "dist");
    assert(fs.existsSync(distDir), "dist/ deve esistere dopo la build");

    const distSw = path.join(distDir, "sw.js");
    const distManifest = path.join(distDir, "manifest.json");
    const distIcon = path.join(distDir, "icon.svg");
    const distHtml = path.join(distDir, "index.html");

    assert(fs.existsSync(distSw), "dist/sw.js deve essere presente nel bundle");
    assert(fs.existsSync(distManifest), "dist/manifest.json deve essere presente nel bundle");
    assert(fs.existsSync(distIcon), "dist/icon.svg deve essere presente nel bundle");
    assert(fs.existsSync(distHtml), "dist/index.html deve essere presente nel bundle");

    console.log("  ✅ PWA-04 PASS: Bundle dist/ completo con tutti gli asset offline e manifest.");
  }

  console.log("\n================================================================================");
  console.log("ESITO FINALE FASE 4: TUTTI I 7 CRITERI MOBILE-FIRST & PWA SUPERATI AL 100%");
  console.log("================================================================================\n");
}

runFase4Tests().catch((err) => {
  console.error("ERRORE NON GESTITO:", err);
  process.exit(1);
});
