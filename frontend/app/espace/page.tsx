"use client";

import { useEffect, useState } from "react";
import { Building2, Landmark, MapPin, Navigation, Map as MapIcon, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { LIBELLES_PROFIL, useUtilisateurCourant } from "@/lib/contexte-utilisateur";
import { cn } from "@/lib/utils";

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

  const cartes: { label: string; valeur?: number; icone: typeof MapIcon; accent: string }[] = [
    { label: "Régions", valeur: stats.regions, icone: MapIcon, accent: "bg-primary" },
    { label: "Préfectures", valeur: stats.prefectures, icone: Building2, accent: "bg-accent" },
    { label: "Sous-préfectures", valeur: stats.sousPrefectures, icone: Landmark, accent: "bg-succes" },
    { label: "Communes", valeur: stats.communes, icone: MapPin, accent: "bg-primary" },
    { label: "Quartiers", valeur: stats.quartiers, icone: Navigation, accent: "bg-accent" },
    { label: "Comptes", valeur: stats.comptes, icone: Users, accent: "bg-succes" },
  ];

  const total = Object.values(stats).reduce((s, v) => s + (v ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-primary p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-primary-foreground/70">
          {total || "…"} enregistrements au total, tous types confondus
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cartes.map((c) => {
          const Icone = c.icone;
          return (
            <Card key={c.label} className="overflow-hidden">
              <div className={cn("h-1", c.accent)} />
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Icone className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-primary">{c.valeur ?? "…"}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          );
        })}
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
