/**
 * Modulo per il controllo trasparente delle quote e dell'occupazione di memoria in Jarvis.
 * Monitora lo spazio utilizzato in LocalStorage e predispone la telemetria per IndexedDB.
 */

export interface StorageCategoryFootprint {
  key: string;
  label: string;
  bytes: number;
  formatted: string;
  itemCount?: number;
}

export interface StorageQuotaReport {
  totalBytes: number;
  totalFormatted: string;
  estimatedLimitBytes: number;
  estimatedLimitFormatted: string;
  percentUsed: number;
  status: "nominale" | "attenzione" | "critico";
  statusMessage: string;
  categories: StorageCategoryFootprint[];
  navigatorEstimate?: {
    usageBytes: number;
    quotaBytes: number;
    percentUsed: number;
  };
}

const CONSERVATIVE_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024; // 5 MB prudenziali per LocalStorage

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Calcola l'ingombro in byte UTF-16 di una stringa memorizzata.
 * In JavaScript/LocalStorage ogni carattere richiede tipicamente 2 byte.
 */
function getStringByteSize(str: string | null): number {
  if (!str) return 0;
  return str.length * 2;
}

/**
 * Genera il report dettagliato dell'impronta di memoria corrente nel browser.
 */
export async function getStorageFootprintReport(): Promise<StorageQuotaReport> {
  const categories: StorageCategoryFootprint[] = [];
  let totalBytes = 0;

  try {
    if (typeof localStorage !== "undefined") {
      const keys = [
        { key: "jarvis_cronologia_serena_v1", label: "Cronologia Analisi & Sessioni" },
        { key: "jarvis_memorie_progetti_v1", label: "Memorie & Fatti Accertati (Fase 5)" },
        { key: "jarvis_dossier_tematici_v1", label: "Dossier Tematici & Progetti (Fase 5)" },
        { key: "jarvis_impostazioni_v1", label: "Impostazioni Personali" },
        { key: "jarvis_protocollo_personale_v1", label: "Protocollo 7 Giorni & Metriche" },
        { key: "jarvis_safety_snapshot_before_restore_v1", label: "Snapshot di Sicurezza (Rollback)" },
        { key: "jarvis_stable_device_id_v1", label: "Identificativo Dispositivo" },
      ];

      const trackedKeys = new Set(keys.map((k) => k.key));

      for (const item of keys) {
        const raw = localStorage.getItem(item.key);
        const bytes = getStringByteSize(raw);
        totalBytes += bytes;

        let count: number | undefined;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) count = parsed.length;
          } catch {
            // ignore
          }
        }

        categories.push({
          key: item.key,
          label: item.label,
          bytes,
          formatted: formatBytes(bytes),
          itemCount: count,
        });
      }

      // Eventuali altre chiavi non tracciate
      let untrackedBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !trackedKeys.has(k)) {
          untrackedBytes += getStringByteSize(localStorage.getItem(k));
        }
      }

      if (untrackedBytes > 0) {
        totalBytes += untrackedBytes;
        categories.push({
          key: "other",
          label: "Altri Dati Locali",
          bytes: untrackedBytes,
          formatted: formatBytes(untrackedBytes),
        });
      }
    }
  } catch {
    // Gestione fallback per ambienti senza localStorage
  }

  const percentUsed = Math.min(100, Math.round((totalBytes / CONSERVATIVE_STORAGE_LIMIT_BYTES) * 1000) / 10);

  let status: "nominale" | "attenzione" | "critico" = "nominale";
  let statusMessage = "Spazio di archiviazione ampiamente sufficiente.";

  if (percentUsed >= 95) {
    status = "critico";
    statusMessage =
      "Spazio quasi esaurito (>95%). È indispensabile esportare un backup e ripulire le analisi storiche.";
  } else if (percentUsed >= 80) {
    status = "attenzione";
    statusMessage =
      "Occupazione storage oltre l'80%. Si consiglia di effettuare un'esportazione di sicurezza.";
  }

  // Stima facoltativa del browser moderno via navigator.storage
  let navEst: StorageQuotaReport["navigatorEstimate"];
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      if (est.usage !== undefined && est.quota !== undefined) {
        navEst = {
          usageBytes: est.usage,
          quotaBytes: est.quota,
          percentUsed: Math.round((est.usage / est.quota) * 1000) / 10,
        };
      }
    } catch {
      // ignore
    }
  }

  return {
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    estimatedLimitBytes: CONSERVATIVE_STORAGE_LIMIT_BYTES,
    estimatedLimitFormatted: formatBytes(CONSERVATIVE_STORAGE_LIMIT_BYTES),
    percentUsed,
    status,
    statusMessage,
    categories,
    navigatorEstimate: navEst,
  };
}
