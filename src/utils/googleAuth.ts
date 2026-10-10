/**
 * Integrazione Google Identity Services (GIS) per autorizzazione OAuth2
 * scope: https://www.googleapis.com/auth/drive.appdata
 */

declare global {
  interface Window {
    google?: any;
  }
}

export function isGoogleGsiAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.google?.accounts?.oauth2);
}

export function requestGoogleAccessToken(
  clientId: string,
  onSuccess: (token: string) => void,
  onError?: (error: any) => void
): void {
  if (typeof window === "undefined") return;

  if (!window.google?.accounts?.oauth2) {
    if (onError) {
      onError(
        new Error(
          "Libreria Google Identity Services non ancora caricata nel browser. Verifica la connessione o inserisci il token manualmente."
        )
      );
    }
    return;
  }

  try {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: "https://www.googleapis.com/auth/drive.appdata",
      callback: (tokenResponse: any) => {
        if (tokenResponse?.error) {
          if (onError) onError(new Error(tokenResponse.error_description || tokenResponse.error));
          return;
        }
        if (tokenResponse?.access_token) {
          onSuccess(tokenResponse.access_token);
        } else {
          if (onError) onError(new Error("Nessun access token restituito da Google."));
        }
      },
      error_callback: (err: any) => {
        if (onError) onError(err);
      },
    });

    client.requestAccessToken({ prompt: "consent" });
  } catch (err: any) {
    if (onError) onError(err);
  }
}
