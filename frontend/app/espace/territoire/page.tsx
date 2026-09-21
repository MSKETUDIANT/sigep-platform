"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import { SectionTable } from "@/components/section-table";
import { useFormulaireDialogue } from "@/lib/hooks/use-formulaire-dialogue";
import { useRessource } from "@/lib/hooks/use-ressource";
import { cn } from "@/lib/utils";

type Region = { id: string; code: string; nom: string; chef_lieu: string | null; actif: boolean };
type Prefecture = { id: string; code: string; nom: string; region: string; region_nom: string };
type SousPrefecture = {
  id: string;
  code: string;
  nom: string;
  prefecture: string;
  prefecture_nom: string;
  statut: string;
  nombre_ecoles: number;
};
type Commune = { id: string; code: string; nom: string; region: string; region_nom: string; type_commune: string };
type Quartier = { id: string; code: string; nom: string; commune: string; commune_nom: string; statut: string };

const ONGLETS = ["Régions", "Préfectures", "Sous-préfectures", "Communes", "Quartiers"] as const;
type Onglet = (typeof ONGLETS)[number];

export default function TerritoirePage() {
  const [onglet, setOnglet] = useState<Onglet>("Régions");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {ONGLETS.map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              onglet === o ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {o}
          </button>
        ))}
      </div>

      {onglet === "Régions" && <SectionRegions />}
      {onglet === "Préfectures" && <SectionPrefectures />}
      {onglet === "Sous-préfectures" && <SectionSousPrefectures />}
      {onglet === "Communes" && <SectionCommunes />}
      {onglet === "Quartiers" && <SectionQuartiers />}
    </div>
  );
}

const LIBELLES_STATUT: Record<string, string> = {
  active: "Active",
  en_attente: "En attente de DSE",
  suspendue: "Suspendue",
};

function StatutBadge({ statut }: { statut: string }) {
  // Légende officielle (§3 du dossier fonctionnel) : vert = conforme/actif,
  // orange = à surveiller, rouge = critique/bloqué.
  const variante = statut === "active" ? "succes" : statut === "suspendue" ? "destructive" : "accent";
  return <Badge variant={variante}>{LIBELLES_STATUT[statut] ?? statut}</Badge>;
}

function SectionRegions() {
  const { items, chargement, erreur, creer } = useRessource<Region>("/territoire/regions/");
  const [nom, setNom] = useState("");
  const [code, setCode] = useState("");
  const [chefLieu, setChefLieu] = useState("");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre="Régions"
      items={items}
      chargement={chargement}
      erreur={erreur}
      colonnes={[
        { label: "Code", rendu: (r) => r.code },
        { label: "Nom", rendu: (r) => r.nom },
        { label: "Chef-lieu", rendu: (r) => r.chef_lieu ?? "—" },
      ]}
      actionsEnTete={
        <Dialog open={dialogue.ouvert} onOpenChange={dialogue.setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle région</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                dialogue.soumettre({ nom, code, chef_lieu: chefLieu || undefined }, () => {
                  setNom("");
                  setCode("");
                  setChefLieu("");
                });
              }}
            >
              <div>
                <Label htmlFor="region-nom">Nom</Label>
                <Input id="region-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="region-code">Code (format GN-XXX)</Label>
                <Input id="region-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
              </div>
              <div>
                <Label htmlFor="region-chef-lieu">Chef-lieu</Label>
                <Input id="region-chef-lieu" value={chefLieu} onChange={(e) => setChefLieu(e.target.value)} />
              </div>
              {dialogue.erreur && <p className="text-sm text-destructive">{dialogue.erreur}</p>}
              <Button type="submit" disabled={dialogue.enCours}>
                {dialogue.enCours ? "Création..." : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

function SectionPrefectures() {
  const { items, chargement, erreur, creer } = useRessource<Prefecture>("/territoire/prefectures/");
  const { items: regions } = useRessource<Region>("/territoire/regions/");
  const [nom, setNom] = useState("");
  const [code, setCode] = useState("");
  const [regionId, setRegionId] = useState("");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre="Préfectures"
      items={items}
      chargement={chargement}
      erreur={erreur}
      colonnes={[
        { label: "Code", rendu: (p) => p.code },
        { label: "Nom", rendu: (p) => p.nom },
        { label: "Région", rendu: (p) => p.region_nom },
      ]}
      actionsEnTete={
        <Dialog open={dialogue.ouvert} onOpenChange={dialogue.setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle préfecture</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                dialogue.soumettre({ nom, code, region: regionId }, () => {
                  setNom("");
                  setCode("");
                  setRegionId("");
                });
              }}
            >
              <div>
                <Label htmlFor="pref-nom">Nom</Label>
                <Input id="pref-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="pref-code">Code (format GN-XXX-P-XXXX)</Label>
                <Input id="pref-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
              </div>
              <div>
                <Label htmlFor="pref-region">Région</Label>
                <SelectNatif id="pref-region" value={regionId} onChange={(e) => setRegionId(e.target.value)} required>
                  <option value="">— choisir —</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nom}
                    </option>
                  ))}
                </SelectNatif>
              </div>
              {dialogue.erreur && <p className="text-sm text-destructive">{dialogue.erreur}</p>}
              <Button type="submit" disabled={dialogue.enCours}>
                {dialogue.enCours ? "Création..." : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

function SectionSousPrefectures() {
  const { items, chargement, erreur, creer } = useRessource<SousPrefecture>("/territoire/sous-prefectures/");
  const { items: prefectures } = useRessource<Prefecture>("/territoire/prefectures/");
  const [nom, setNom] = useState("");
  const [prefectureId, setPrefectureId] = useState("");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre="Sous-préfectures"
      items={items}
      chargement={chargement}
      erreur={erreur}
      colonnes={[
        { label: "Code", rendu: (s) => s.code },
        { label: "Nom", rendu: (s) => s.nom },
        { label: "Préfecture", rendu: (s) => s.prefecture_nom },
        { label: "Statut", rendu: (s) => <StatutBadge statut={s.statut} /> },
        { label: "Écoles", rendu: (s) => s.nombre_ecoles },
      ]}
      actionsEnTete={
        <Dialog open={dialogue.ouvert} onOpenChange={dialogue.setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle sous-préfecture</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                dialogue.soumettre({ nom, prefecture: prefectureId }, () => {
                  setNom("");
                  setPrefectureId("");
                });
              }}
            >
              <div>
                <Label htmlFor="sp-nom">Nom</Label>
                <Input id="sp-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="sp-prefecture">Préfecture</Label>
                <SelectNatif
                  id="sp-prefecture"
                  value={prefectureId}
                  onChange={(e) => setPrefectureId(e.target.value)}
                  required
                >
                  <option value="">— choisir —</option>
                  {prefectures.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </SelectNatif>
              </div>
              <p className="text-xs text-muted-foreground">Le code est généré automatiquement.</p>
              {dialogue.erreur && <p className="text-sm text-destructive">{dialogue.erreur}</p>}
              <Button type="submit" disabled={dialogue.enCours}>
                {dialogue.enCours ? "Création..." : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

function SectionCommunes() {
  const { items, chargement, erreur, creer } = useRessource<Commune>("/territoire/communes/");
  const { items: regions } = useRessource<Region>("/territoire/regions/");
  const [nom, setNom] = useState("");
  const [code, setCode] = useState("");
  const [regionId, setRegionId] = useState("");
  const [typeCommune, setTypeCommune] = useState("urbaine");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre="Communes"
      items={items}
      chargement={chargement}
      erreur={erreur}
      colonnes={[
        { label: "Code", rendu: (c) => c.code },
        { label: "Nom", rendu: (c) => c.nom },
        { label: "Région", rendu: (c) => c.region_nom },
        { label: "Type", rendu: (c) => c.type_commune },
      ]}
      actionsEnTete={
        <Dialog open={dialogue.ouvert} onOpenChange={dialogue.setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle commune</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                dialogue.soumettre({ nom, code, region: regionId, type_commune: typeCommune }, () => {
                  setNom("");
                  setCode("");
                  setRegionId("");
                });
              }}
            >
              <div>
                <Label htmlFor="com-nom">Nom</Label>
                <Input id="com-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="com-code">Code (format GN-XXX-C-XXXX)</Label>
                <Input id="com-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
              </div>
              <div>
                <Label htmlFor="com-region">Région</Label>
                <SelectNatif id="com-region" value={regionId} onChange={(e) => setRegionId(e.target.value)} required>
                  <option value="">— choisir —</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nom}
                    </option>
                  ))}
                </SelectNatif>
              </div>
              <div>
                <Label htmlFor="com-type">Type</Label>
                <SelectNatif id="com-type" value={typeCommune} onChange={(e) => setTypeCommune(e.target.value)}>
                  <option value="urbaine">Urbaine</option>
                  <option value="rurale">Rurale</option>
                </SelectNatif>
              </div>
              {dialogue.erreur && <p className="text-sm text-destructive">{dialogue.erreur}</p>}
              <Button type="submit" disabled={dialogue.enCours}>
                {dialogue.enCours ? "Création..." : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

function SectionQuartiers() {
  const { items, chargement, erreur, creer } = useRessource<Quartier>("/territoire/quartiers/");
  const { items: communes } = useRessource<Commune>("/territoire/communes/");
  const [nom, setNom] = useState("");
  const [communeId, setCommuneId] = useState("");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre="Quartiers"
      items={items}
      chargement={chargement}
      erreur={erreur}
      colonnes={[
        { label: "Code", rendu: (q) => q.code },
        { label: "Nom", rendu: (q) => q.nom },
        { label: "Commune", rendu: (q) => q.commune_nom },
        { label: "Statut", rendu: (q) => <StatutBadge statut={q.statut} /> },
      ]}
      actionsEnTete={
        <Dialog open={dialogue.ouvert} onOpenChange={dialogue.setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau quartier</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                dialogue.soumettre({ nom, commune: communeId }, () => {
                  setNom("");
                  setCommuneId("");
                });
              }}
            >
              <div>
                <Label htmlFor="qua-nom">Nom</Label>
                <Input id="qua-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="qua-commune">Commune</Label>
                <SelectNatif id="qua-commune" value={communeId} onChange={(e) => setCommuneId(e.target.value)} required>
                  <option value="">— choisir —</option>
                  {communes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </SelectNatif>
              </div>
              <p className="text-xs text-muted-foreground">Le code est généré automatiquement.</p>
              {dialogue.erreur && <p className="text-sm text-destructive">{dialogue.erreur}</p>}
              <Button type="submit" disabled={dialogue.enCours}>
                {dialogue.enCours ? "Création..." : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    />
  );
}
