"use client";

import { useState } from "react";

/** Factorise l'état ouvert/en-cours/erreur commun à tous les formulaires en Dialog. */
export function useFormulaireDialogue<TPayload>(onSoumettre: (payload: TPayload) => Promise<unknown>) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(payload: TPayload, reinitialiser?: () => void) {
    setEnCours(true);
    setErreur(null);
    try {
      await onSoumettre(payload);
      setOuvert(false);
      reinitialiser?.();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally {
      setEnCours(false);
    }
  }

  return { ouvert, setOuvert, enCours, erreur, soumettre };
}
