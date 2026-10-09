import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import {defineConfig, Plugin} from 'vite';
import { handleJarvisAnalysis } from './server/jarvisService';

dotenv.config();

function jarvisApiPlugin(): Plugin {
  return {
    name: 'jarvis-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/jarvis/analizza', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const result = await handleJarvisAnalysis(data.text, data.modalita, data.contestoPrecedente);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err: unknown) {
            const rawMsg = err instanceof Error ? err.message : String(err);
            const isBusy =
              rawMsg.includes("503") ||
              rawMsg.includes("429") ||
              rawMsg.includes("high demand") ||
              rawMsg.includes("UNAVAILABLE") ||
              rawMsg.includes("RESOURCE_EXHAUSTED") ||
              rawMsg.includes("temporaneamente occupato");

            if (isBusy) {
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error:
                    "Il motore di Jarvis è temporaneamente occupato. Il testo inserito non è stato perso. Riprova tra poco.",
                  isTemporaryBusy: true,
                })
              );
              return;
            }

            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: "Si è verificato un errore durante l'elaborazione. Riprova tra poco.",
                isTemporaryBusy: false,
              })
            );
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), jarvisApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
