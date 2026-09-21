"use client";

import { createContext, useContext } from "react";

export type Utilisateur = {
  id: string;
  identifiant: string;
  nom: string;
  prenoms: string;
  profil: string;
};

export const LIBELLES_PROFIL: Record<string, string> = {
  citoyen: "Citoyen",
  enseignant: "Enseignant",
  directeur_ecole: "Directeur d'École",
  dse: "Directeur Sous-Préfectoral",
  dce: "Directeur Communal",
  dpe: "Directeur Préfectoral",
  ir: "Inspecteur Régional",
  dge: "Directeur Général de l'Éducation",
  super_admin: "Super Admin",
  ministre: "Ministre",
  cabinet: "Cabinet",
};

export const UtilisateurContext = createContext<Utilisateur | null>(null);

export function useUtilisateurCourant() {
  return useContext(UtilisateurContext);
}
