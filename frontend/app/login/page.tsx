"use client";

import { useState } from "react";

type ReponseConnexion = {
  access: string;
  refresh: string;
  profil: string;
  identifiant: string;
  nom_complet: string;
  mot_de_passe_provisoire: boolean;
};

export default function LoginPage() {
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [resultat, setResultat] = useState<ReponseConnexion | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setResultat(null);
    setEnCours(true);
    try {
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/comptes/connexion/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiant, password: motDePasse }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) {
        setErreur(donnees.detail || "Identifiant ou mot de passe incorrect.");
        return;
      }
      setResultat(donnees);
      window.localStorage.setItem("sigep_access_token", donnees.access);
      window.localStorage.setItem("sigep_refresh_token", donnees.refresh);
    } catch {
      setErreur("Impossible de contacter le serveur SIGEP.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main className="page">
      <h1>Connexion SIGEP</h1>
      <form onSubmit={seConnecter} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 320 }}>
        <label>
          Identifiant
          <input
            type="text"
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          />
        </label>
        <button type="submit" disabled={enCours} style={{ padding: "0.6rem", cursor: "pointer" }}>
          {enCours ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      {erreur && <p style={{ color: "#b3261e", marginTop: "1rem" }}>{erreur}</p>}

      {resultat && (
        <div style={{ marginTop: "1rem" }}>
          <p>
            Connecté en tant que <strong>{resultat.nom_complet}</strong> ({resultat.profil})
          </p>
          {resultat.mot_de_passe_provisoire && (
            <p style={{ color: "#8a5a00" }}>Mot de passe provisoire — à changer.</p>
          )}
        </div>
      )}
    </main>
  );
}
