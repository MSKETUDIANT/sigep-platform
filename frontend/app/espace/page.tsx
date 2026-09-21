"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { LIBELLES_PROFIL, useUtilisateurCourant } from "@/lib/contexte-utilisateur";

export default function EspacePage() {
  const utilisateur = useUtilisateurCourant();
  if (!utilisateur) return null;

  if (utilisateur.profil === "super_admin") {
    return <EspaceSuperAdmin />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tableau de bord — {LIBELLES_PROFIL[utilisateur.profil] ?? utilisateur.profil}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        L&apos;espace détaillé de ce profil sera construit au fil des prochains sprints, une fois les
        modules correspondants disponibles (écoles, élèves, notes, signalements...).
      </CardContent>
    </Card>
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
            <a href="/espace/territoire">Gérer le territoire</a>
          </Button>
          <Button variant="secondary" asChild>
            <a href="/espace/comptes">Gérer les comptes</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
