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
