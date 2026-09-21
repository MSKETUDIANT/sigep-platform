"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReponseConnexion = {
  access: string;
  refresh: string;
  profil: string;
  identifiant: string;
  nom_complet: string;
  mot_de_passe_provisoire: boolean;
};

export default function LoginPage() {
  const router = useRouter();
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
      router.push("/espace");
    } catch {
      setErreur("Impossible de contacter le serveur SIGEP.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-guinee-rouge" />
            <span className="h-2 w-2 rounded-full bg-guinee-jaune" />
            <span className="h-2 w-2 rounded-full bg-guinee-vert" />
          </div>
          <CardTitle className="text-primary">Connexion SIGEP</CardTitle>
          <CardDescription>Système Intégré de Gestion de l&apos;Enseignement Préuniversitaire</CardDescription>
        </CardHeader>
        <form onSubmit={seConnecter}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="identifiant">Identifiant</Label>
              <Input
                id="identifiant"
                type="text"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mot-de-passe">Mot de passe</Label>
              <Input
                id="mot-de-passe"
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
              />
            </div>

            {erreur && <p className="text-sm text-destructive">{erreur}</p>}

            {resultat && (
              <div className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
                <p>
                  Connecté en tant que <strong>{resultat.nom_complet}</strong> ({resultat.profil})
                </p>
                {resultat.mot_de_passe_provisoire && (
                  <p className="mt-1 text-accent-foreground">Mot de passe provisoire — à changer.</p>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={enCours} className="w-full">
              {enCours ? "Connexion..." : "Se connecter"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
