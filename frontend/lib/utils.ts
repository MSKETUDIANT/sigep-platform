import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Suggère un identifiant à partir du prénom et du nom (ex. "Mamadou" +
 * "Diallo" -> "mdiallo") — reste une suggestion, l'admin peut toujours la
 * modifier avant de créer le compte. */
export function suggererIdentifiant(prenoms: string, nom: string): string {
  const nettoyer = (texte: string) =>
    texte
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z]/g, "")
      .toLowerCase();

  const premierPrenom = nettoyer(prenoms.trim().split(/\s+/)[0] ?? "");
  const nomNettoye = nettoyer(nom.trim().split(/\s+/)[0] ?? "");

  if (!premierPrenom && !nomNettoye) return "";
  return `${premierPrenom.slice(0, 1)}${nomNettoye}`;
}
