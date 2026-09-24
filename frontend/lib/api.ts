const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("sigep_access_token");
}

export function clearSession() {
  window.localStorage.removeItem("sigep_access_token");
  window.localStorage.removeItem("sigep_refresh_token");
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const reponse = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (reponse.status === 401 && typeof window !== "undefined") {
    clearSession();
    window.location.href = "/login";
  }
  return reponse;
}

/** Transforme une réponse d'erreur DRF ({"champ": ["message"]}, {"detail": "..."},
 * {"non_field_errors": [...]}) en un message lisible — au lieu d'afficher le
 * JSON brut à l'utilisateur. */
export function extraireErreurApi(donnees: unknown): string {
  if (donnees == null) return "Une erreur est survenue.";
  if (typeof donnees === "string") return donnees;
  if (typeof donnees !== "object") return "Une erreur est survenue.";

  const objet = donnees as Record<string, unknown>;
  if (typeof objet.detail === "string") return objet.detail;

  for (const valeur of Object.values(objet)) {
    if (Array.isArray(valeur) && typeof valeur[0] === "string") return valeur[0];
    if (typeof valeur === "string") return valeur;
  }
  return "Une erreur est survenue.";
}
