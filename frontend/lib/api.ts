const API_URL = process.env.NEXT_PUBLIC_API_URL;

// sessionStorage plutôt que localStorage : chaque onglet garde sa propre
// session, indépendante des autres — deux comptes différents peuvent rester
// connectés en parallèle dans deux fenêtres/onglets du même navigateur.
// Contrepartie assumée : fermer l'onglet déconnecte (localStorage aurait
// survécu à la fermeture du navigateur), acceptée au profit de l'isolation.
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("sigep_access_token");
}

export function clearSession() {
  window.sessionStorage.removeItem("sigep_access_token");
  window.sessionStorage.removeItem("sigep_refresh_token");
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
