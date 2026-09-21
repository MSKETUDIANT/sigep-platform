"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, clearSession, getToken } from "@/lib/api";

type Utilisateur = {
  identifiant: string;
  nom: string;
  prenoms: string;
  profil: string;
};

const LIBELLES_PROFIL: Record<string, string> = {
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

export default function EspacePage() {
  const router = useRouter();
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch("/comptes/moi/")
      .then((r) => r.json())
      .then((donnees) => setUtilisateur(donnees))
      .finally(() => setChargement(false));
  }, [router]);

  function seDeconnecter() {
    clearSession();
    router.replace("/login");
  }

  if (chargement) {
    return <main className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement...</main>;
  }

  if (!utilisateur) {
    return null;
  }

  const libelleProfil = LIBELLES_PROFIL[utilisateur.profil] ?? utilisateur.profil;

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <p className="text-sm text-muted-foreground">Espace</p>
          <h1 className="text-lg font-semibold text-primary">
            {utilisateur.prenoms} {utilisateur.nom} — {libelleProfil}
          </h1>
        </div>
        <Button variant="outline" onClick={seDeconnecter}>
          Déconnexion
        </Button>
      </header>

      <div className="p-6">
        {utilisateur.profil === "super_admin" ? (
          <EspaceSuperAdmin />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Tableau de bord — {libelleProfil}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              L&apos;espace détaillé de ce profil sera construit au fil des prochains sprints, une fois
              les modules correspondants disponibles (écoles, élèves, notes, signalements...).
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

type Compteurs = {
  regions?: number;
  prefectures?: number;
  sousPrefectures?: number;
  communes?: number;
  quartiers?: number;
  comptes?: number;
};

function EspaceSuperAdmin() {
  const [stats, setStats] = useState<Compteurs>({});

  useEffect(() => {
    async function charger() {
      const [regions, prefectures, sousPrefectures, communes, quartiers, comptes] = await Promise.all([
        apiFetch("/territoire/regions/").then((r) => r.json()),
        apiFetch("/territoire/prefectures/").then((r) => r.json()),
        apiFetch("/territoire/sous-prefectures/").then((r) => r.json()),
        apiFetch("/territoire/communes/").then((r) => r.json()),
        apiFetch("/territoire/quartiers/").then((r) => r.json()),
        apiFetch("/comptes/utilisateurs/").then((r) => r.json()),
      ]);
      setStats({
        regions: regions.count,
        prefectures: prefectures.count,
        sousPrefectures: sousPrefectures.count,
        communes: communes.count,
        quartiers: quartiers.count,
        comptes: comptes.count,
      });
    }
    charger();
  }, []);

  const cartes: { label: string; valeur?: number }[] = [
    { label: "Régions", valeur: stats.regions },
    { label: "Préfectures", valeur: stats.prefectures },
    { label: "Sous-préfectures", valeur: stats.sousPrefectures },
    { label: "Communes", valeur: stats.communes },
    { label: "Quartiers", valeur: stats.quartiers },
    { label: "Comptes", valeur: stats.comptes },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cartes.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-primary">{c.valeur ?? "…"}</p>
              <p className="text-sm text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="secondary" asChild>
            <a href="http://localhost:8000/admin/ref/sousprefecture/add/" target="_blank" rel="noreferrer">
              Créer une sous-préfecture
            </a>
          </Button>
          <Button variant="secondary" asChild>
            <a href="http://localhost:8000/admin/ref/quartier/add/" target="_blank" rel="noreferrer">
              Créer un quartier
            </a>
          </Button>
          <Button variant="secondary" asChild>
            <a href="http://localhost:8000/api/comptes/utilisateurs/" target="_blank" rel="noreferrer">
              Créer un compte
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
