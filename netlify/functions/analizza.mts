import { handleJarvisAnalysis } from "../../server/jarvisService";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { text, modalita, contestoPrecedente } = body || {};
    const result = await handleJarvisAnalysis(text, modalita, contestoPrecedente);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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
      return new Response(
        JSON.stringify({
          error:
            "Il motore di Jarvis è temporaneamente occupato. Il testo inserito non è stato perso. Riprova tra poco.",
          isTemporaryBusy: true,
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: rawMsg || "Si è verificato un errore durante l'elaborazione. Riprova tra poco.",
        isTemporaryBusy: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
