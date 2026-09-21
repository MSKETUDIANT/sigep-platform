"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

/** Charge une liste paginée DRF et expose creer()/action() avec rechargement automatique. */
export function useRessource<T>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await apiFetch(endpoint);
      const donnees = await reponse.json();
      setItems(donnees.results ?? donnees);
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
