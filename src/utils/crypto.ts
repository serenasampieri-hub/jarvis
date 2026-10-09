/**
 * Utility crittografiche e identificatori stabili per Jarvis.
 */

const DEVICE_ID_KEY = "jarvis_stable_device_id_v1";

/**
 * Recupera o genera un UUID stabile per il dispositivo corrente.
 */
export function getOrCreateDeviceId(): string {
  try {
    let devId = localStorage.getItem(DEVICE_ID_KEY);
    if (!devId) {
      devId = "dev_" + crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, devId);
    }
    return devId;
  } catch {
    return "dev_ephemeral_" + Math.random().toString(36).substring(2, 10);
  }
}

/**
 * Calcola l'hash crittografico SHA-256 di una stringa in esadecimale.
 */
export async function computeSha256(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback deterministico per ambienti senza SubtleCrypto
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "pseudo_" + Math.abs(hash).toString(16).padStart(16, "0");
}

/**
 * Serializza un oggetto JSON in forma canonica e deterministica.
 * Ordina ricorsivamente tutte le chiavi degli oggetti per garantire
 * che strutture con identico contenuto producano sempre la medesima stringa JSON,
 * eliminando variazioni dovute all'ordine di serializzazione o spaziature.
 */
export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalJsonStringify(item)).join(",") + "]";
  }
  const keys = Object.keys(obj)
    .filter((key) => obj[key] !== undefined)
    .sort();
  const pairs = keys.map((key) => {
    return JSON.stringify(key) + ":" + canonicalJsonStringify(obj[key]);
  });
  return "{" + pairs.join(",") + "}";
}

