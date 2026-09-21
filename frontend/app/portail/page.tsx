"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, School, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNatif } from "@/components/ui/select-natif";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type EcolePublique = {
  id: string;
  code_ecole: string;
  nom: string;
  type_ecole_display: string;
  region_nom: string | null;
  prefecture_nom: string | null;
  commune_nom: string | null;
  sous_prefecture_nom: string | null;
  quartier_nom: string | null;
  statut_ouverture: string;
  statut_ouverture_display: string;
  adresse: string;
};

const STATUTS = [
  { valeur: "", label: "Tous les statuts" },
  { valeur: "ouverte", label: "Ouverte" },
  { valeur: "fermee", label: "Fermée" },
  { valeur: "suspendue", label: "Suspendue" },
];

function StatutBadge({ statut, label }: { statut: string; label: string }) {
  const variante = statut === "ouverte" ? "succes" : statut === "suspendue" ? "accent" : "destructive";
  return <Badge variant={variante}>{label}</Badge>;
}

export default function RecherchePortailPage() {
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState("");
  const [resultats, setResultats] = useState<EcolePublique[]>([]);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    const delai = setTimeout(async () => {
      setChargement(true);
      const params = new URLSearchParams();
      if (recherche) params.set("search", recherche);
      if (statut) params.set("statut_ouverture", statut);
      const reponse = await fetch(`${API_URL}/public/ecoles/?${params.toString()}`);
      const donnees = await reponse.json();
      setResultats(donnees.results ?? []);
      setChargement(false);
    }, 300);
    return () => clearTimeout(delai);
  }, [recherche, statut]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Rechercher une école</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Retrouvez un établissement scolaire par son nom, sa zone ou son statut — aucun compte requis.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nom ou code de l'école..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="pl-9"
          />
        </div>
        <SelectNatif value={statut} onChange={(e) => setStatut(e.target.value)} className="max-w-[200px]">
          {STATUTS.map((s) => (
            <option key={s.valeur} value={s.valeur}>
              {s.label}
            </option>
          ))}
        </SelectNatif>
      </div>

      {chargement ? (
        <p className="text-sm text-muted-foreground">Recherche...</p>
      ) : resultats.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Aucune école ne correspond à cette recherche.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {resultats.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <School className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-primary">{e.nom}</p>
                  <p className="text-xs text-muted-foreground">{e.code_ecole} — {e.type_ecole_display}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {[e.quartier_nom ?? e.sous_prefecture_nom, e.commune_nom ?? e.prefecture_nom, e.region_nom]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <div className="mt-2">
                    <StatutBadge statut={e.statut_ouverture} label={e.statut_ouverture_display} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Vous cherchez plutôt à localiser les écoles sur une carte ?{" "}
        <Link href="/portail/carte" className="font-medium text-primary underline-offset-2 hover:underline">
          Voir la carte interactive
        </Link>
      </p>
    </div>
  );
}
