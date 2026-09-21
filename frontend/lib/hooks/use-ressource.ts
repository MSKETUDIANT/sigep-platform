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

export const TAILLE_PAGE = 25;

type OptionsRessourcePaginee = {
  /** Texte de recherche brut (débouncé en interne, envoyé comme ?search=). */
  recherche?: string;
  /** Filtres DRF supplémentaires (ex. { statut: "actif" }) — une valeur vide/undefined est omise. */
  filtres?: Record<string, string | undefined>;
};

/** Variante paginée côté serveur de useRessource — pour les listes principales
 * (SectionTable), là où charger les centaines de lignes d'un coup n'a plus de
 * sens (327 sous-préfectures, 200 quartiers, 100+ écoles...). Recherche et
 * filtres sont envoyés à l'API (search=/filterset_fields), pas appliqués
 * côté client. Pour peupler un <select> avec la liste complète (ex. choisir
 * une école dans un formulaire), continuer à utiliser useRessource. */
export function useRessourcePaginee<T>(endpoint: string, options: OptionsRessourcePaginee = {}) {
  const [items, setItems] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(TAILLE_PAGE);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rechercheDebouncee, setRechercheDebouncee] = useState(options.recherche ?? "");

  useEffect(() => {
    const delai = setTimeout(() => setRechercheDebouncee(options.recherche ?? ""), 300);
    return () => clearTimeout(delai);
  }, [options.recherche]);

  const cleFiltres = JSON.stringify(options.filtres ?? {});

  useEffect(() => {
    setPage(1);
  }, [rechercheDebouncee, cleFiltres, pageSize]);

  const recharger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (rechercheDebouncee) params.set("search", rechercheDebouncee);
      const filtres: Record<string, string | undefined> = JSON.parse(cleFiltres);
      for (const [cle, valeur] of Object.entries(filtres)) {
        if (valeur) params.set(cle, valeur);
      }
      const reponse = await apiFetch(`${endpoint}?${params.toString()}`);
      const donnees = await reponse.json();
      if (Array.isArray(donnees)) {
        setItems(donnees);
        setCount(donnees.length);
      } else {
        setItems(donnees.results ?? []);
        setCount(donnees.count ?? 0);
      }
    } catch {
      setErreur("Impossible de charger les données.");
    } finally {
      setChargement(false);
    }
  }, [endpoint, page, pageSize, rechercheDebouncee, cleFiltres]);

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

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return {
    items,
    count,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    chargement,
    erreur,
    recharger,
    creer,
    action,
    mettreAJour,
  };
}
