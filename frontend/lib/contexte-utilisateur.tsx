"use client";

import { createContext, useContext } from "react";

export type AffectationActive = {
  id: string;
  sous_prefecture: string | null;
  commune: string | null;
  prefecture: string | null;
  region: string | null;
  ecole_id: string | null;
  date_debut: string;
};

export type Utilisateur = {
  id: string;
  identifiant: string;
  nom: string;
  prenoms: string;
  profil: string;
  affectation_active?: AffectationActive | null;
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

// Profils autorisés en écriture sur Enseignants/Élèves/Équipements côté
// backend (apps.core.permissions.LectureAuthentifieEcritureSuperAdminOuDirecteurEcole) —
// à utiliser pour n'afficher les boutons "Ajouter"/"Affecter" qu'aux profils
// qui peuvent réellement soumettre le formulaire, plutôt que de laisser un
// profil territorial en lecture seule (DSE/DCE/DPE/IR/DGE/Ministre/Cabinet)
// remplir un formulaire pour se prendre un 403 à la fin.
export const PROFILS_ECRITURE_ETABLISSEMENT = ["super_admin", "directeur_ecole"];
