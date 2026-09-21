"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch, getToken } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** Charge une liste DRF en suivant automatiquement toutes les pages (le
 * tableau doit afficher les 44 préfectures, pas juste les 25 premières). */
async function chargerToutesLesPages<T>(endpoint: string): Promise<T[]> {
  let url: string | null = `${API_URL}${endpoint}`;
  let tous: T[] = [];
  while (url) {
    const token = getToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const reponse: Response = await fetch(url, { headers });
    const donnees: { results?: T[]; next?: string | null } | T[] = await reponse.json();
    if (Array.isArray(donnees)) {
      tous = tous.concat(donnees);
      url = null;
    } else {
      tous = tous.concat(donnees.results ?? []);
      url = donnees.next ?? null;
    }
  }
  return tous;
}

/** Charge une liste paginée DRF (toutes pages) et expose creer()/action() avec rechargement automatique. */
export function useRessource<T>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setItems(await chargerToutesLesPages<T>(endpoint));
    } catch {
      setErreur("Impossible de charger les données.");
    } finally {
      setChargement(false);
    }
  }, [endpoint]);

  useEffect(() => {
    recharger();
  }, [recharger]);

  async function creer(payload: Record<string, unknown>) {
    const reponse = await apiFetch(endpoint, { method: "POST", body: JSON.stringify(payload) });
    const donnees = await reponse.json();
    if (!reponse.ok) {
      throw new Error(typeof donnees === "object" ? JSON.stringify(donnees) : String(donnees));
    }
    await recharger();
    return donnees as T;
  }

  async function action(chemin: string, payload: Record<string, unknown> = {}) {
    const reponse = await apiFetch(chemin, { method: "POST", body: JSON.stringify(payload) });
    const donnees = await reponse.json();
    if (!reponse.ok) {
      throw new Error(typeof donnees === "object" ? JSON.stringify(donnees) : String(donnees));
    }
    await recharger();
    return donnees;
  }

  async function mettreAJour(id: string, payload: Record<string, unknown>) {
    const reponse = await apiFetch(`${endpoint}${id}/`, { method: "PATCH", body: JSON.stringify(payload) });
    const donnees = await reponse.json();
    if (!reponse.ok) {
      throw new Error(typeof donnees === "object" ? JSON.stringify(donnees) : String(donnees));
    }
    await recharger();
    return donnees as T;
  }

  return { items, chargement, erreur, recharger, creer, action, mettreAJour };
}
