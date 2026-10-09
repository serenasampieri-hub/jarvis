import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleJarvisAnalysis } from './server/jarvisService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

app.post('/api/jarvis/analizza', async (req, res) => {
  try {
    const { text, modalita, contestoPrecedente } = req.body || {};
    const result = await handleJarvisAnalysis(text, modalita, contestoPrecedente);
    res.json(result);
  } catch (err: unknown) {
    console.error("handleJarvisAnalysis error:", err);
    const rawMsg = err instanceof Error ? err.message : String(err);
    const isBusy =
      rawMsg.includes("503") ||
      rawMsg.includes("429") ||
      rawMsg.includes("high demand") ||
      rawMsg.includes("UNAVAILABLE") ||
      rawMsg.includes("RESOURCE_EXHAUSTED") ||
      rawMsg.includes("temporaneamente occupato");

    if (isBusy) {
      res.status(503).json({
        error:
          "Il motore di Jarvis è temporaneamente occupato. Il testo inserito non è stato perso. Riprova tra poco.",
        isTemporaryBusy: true,
      });
      return;
    }

    res.status(500).json({
      error: "Si è verificato un errore durante l'elaborazione. Riprova tra poco.",
      isTemporaryBusy: false,
    });
  }
});

// Serve frontend build in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Jarvis Server running on port ${PORT}`);
});
