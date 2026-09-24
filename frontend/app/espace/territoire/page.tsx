"use client";

import { useState } from "react";
import { Building2, Landmark, type LucideIcon, Map as MapIcon, MapPin, Navigation, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import { SectionTable } from "@/components/section-table";
import { useUtilisateurCourant } from "@/lib/contexte-utilisateur";
import { useFormulaireDialogue } from "@/lib/hooks/use-formulaire-dialogue";
import { useRessource, useRessourcePaginee } from "@/lib/hooks/use-ressource";
import { cn } from "@/lib/utils";

// Écriture réservée au Super Admin sur les 5 niveaux territoriaux
// (apps.ref.views, LectureAuthentifieEcritureSuperAdmin) — miroir exact
// côté frontend pour ne pas proposer "Ajouter" à un profil qui se prendra
// un 403 à la soumission (même logique que PROFILS_ECRITURE_ETABLISSEMENT).
const PROFILS_ECRITURE_TERRITOIRE = ["super_admin"];

type Region = { id: string; code: string; nom: string; chef_lieu: string | null; actif: boolean; type_zone: string };
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

// Sous-préfecture (schéma A) uniquement : "En attente de DSE" n'a de sens que
// pour ce niveau, le DSE étant rattaché à la sous-préfecture (§17 du dossier).
const LIBELLES_STATUT_SOUS_PREFECTURE: Record<string, string> = {
  active: "Active",
  en_attente: "En attente de DSE",
  suspendue: "Suspendue",
};

// Quartier (schéma B) : seulement 2 statuts (§9 du dossier) — pas de notion de
// DSE, rôle sans rapport avec un quartier.
const LIBELLES_STATUT_QUARTIER: Record<string, string> = {
  actif: "Actif",
  suspendu: "Suspendu",
};

/** US-1.7 : changer le statut d'une unité territoriale directement depuis le tableau. */
function StatutModifiable({
  valeur,
  onChange,
  libelles,
}: {
  valeur: string;
  onChange: (v: string) => Promise<unknown>;
  libelles: Record<string, string>;
}) {
  const [enCours, setEnCours] = useState(false);

  async function gererChangement(e: React.ChangeEvent<HTMLSelectElement>) {
    setEnCours(true);
    try {
      await onChange(e.target.value);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <SelectNatif value={valeur} onChange={gererChangement} disabled={enCours} className="h-8 w-44 text-xs">
      {Object.entries(libelles).map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </SelectNatif>
  );
}

/** Badge iconographique par niveau territorial — une région/préfecture n'est pas une
 * personne, donc pas d'avatar à initiales ici, mais un repère visuel cohérent avec
 * le tableau de bord et la sidebar. */
function IconeNiveau({ icone: Icone, accent, nom }: { icone: LucideIcon; accent: string; nom: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white", accent)}>
        <Icone className="h-4 w-4" />
      </div>
      <span className="font-medium">{nom}</span>
    </div>
  );
}

function PastillesFiltre<T extends string>({
  options,
  valeur,
  onChange,
}: {
  options: { valeur: T; label: string }[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.valeur}
          onClick={() => onChange(o.valeur)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            valeur === o.valeur
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SectionRegions() {
  const utilisateur = useUtilisateurCourant();
  const peutEcrire = !!utilisateur && PROFILS_ECRITURE_TERRITOIRE.includes(utilisateur.profil);
  const [recherche, setRecherche] = useState("");
  const { items, count, page, setPage, pageSize, setPageSize, totalPages, chargement, erreur, creer } =
    useRessourcePaginee<Region>("/territoire/regions/", { recherche });
  const [nom, setNom] = useState("");
  const [chefLieu, setChefLieu] = useState("");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre={`Régions (${count})`}
      items={items}
      chargement={chargement}
      erreur={erreur}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      total={count}
      filtres={<Input placeholder="Rechercher une région..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="max-w-xs" />}
      colonnes={[
        { label: "Code", rendu: (r) => r.code },
        {
          label: "Nom",
          rendu: (r) => (
            <div className="flex items-center gap-2">
              <IconeNiveau icone={MapIcon} accent="bg-primary" nom={r.nom} />
              {r.type_zone === "zone_speciale" && <Badge variant="accent">Zone spéciale</Badge>}
            </div>
          ),
        },
        { label: "Chef-lieu", rendu: (r) => r.chef_lieu ?? "—" },
      ]}
      actionsEnTete={
        peutEcrire ? (
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
                dialogue.soumettre({ nom, chef_lieu: chefLieu || undefined }, () => {
                  setNom("");
                  setChefLieu("");
                });
              }}
            >
              <div>
                <Label htmlFor="region-nom">Nom</Label>
                <Input id="region-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="region-chef-lieu">Chef-lieu</Label>
                <Input id="region-chef-lieu" value={chefLieu} onChange={(e) => setChefLieu(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Le code est généré automatiquement.</p>
              {dialogue.erreur && <p className="text-sm text-destructive">{dialogue.erreur}</p>}
              <Button type="submit" disabled={dialogue.enCours}>
                {dialogue.enCours ? "Création..." : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        ) : undefined
      }
    />
  );
}

function SectionPrefectures() {
  const utilisateur = useUtilisateurCourant();
  const peutEcrire = !!utilisateur && PROFILS_ECRITURE_TERRITOIRE.includes(utilisateur.profil);
  const [recherche, setRecherche] = useState("");
  const { items, count, page, setPage, pageSize, setPageSize, totalPages, chargement, erreur, creer } =
    useRessourcePaginee<Prefecture>("/territoire/prefectures/", { recherche });
  const { items: regions } = useRessource<Region>("/territoire/regions/");
  const [nom, setNom] = useState("");
  const [regionId, setRegionId] = useState("");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre={`Préfectures (${count})`}
      items={items}
      chargement={chargement}
      erreur={erreur}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      total={count}
      filtres={<Input placeholder="Rechercher une préfecture..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="max-w-xs" />}
      colonnes={[
        { label: "Code", rendu: (p) => p.code },
        { label: "Nom", rendu: (p) => <IconeNiveau icone={Building2} accent="bg-accent" nom={p.nom} /> },
        { label: "Région", rendu: (p) => p.region_nom },
      ]}
      actionsEnTete={
        peutEcrire ? (
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
                dialogue.soumettre({ nom, region: regionId }, () => {
                  setNom("");
                  setRegionId("");
                });
              }}
            >
              <div>
                <Label htmlFor="pref-nom">Nom</Label>
                <Input id="pref-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="pref-region">Région</Label>
                <SelectNatif id="pref-region" value={regionId} onChange={(e) => setRegionId(e.target.value)} required>
                  <option value="">— choisir —</option>
                  {regions
                    .filter((r) => r.type_zone !== "zone_speciale")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nom}
                      </option>
                    ))}
                </SelectNatif>
                <p className="mt-1 text-xs text-muted-foreground">
                  Conakry (zone spéciale) n&apos;a pas de préfecture — schéma B uniquement.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Le code est généré automatiquement.</p>
              {dialogue.erreur && <p className="text-sm text-destructive">{dialogue.erreur}</p>}
              <Button type="submit" disabled={dialogue.enCours}>
                {dialogue.enCours ? "Création..." : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        ) : undefined
      }
    />
  );
}

const FILTRES_STATUT_SOUS_PREFECTURE = [
  { valeur: "Tous" as const, label: "Tous" },
  { valeur: "active" as const, label: "Active" },
  { valeur: "en_attente" as const, label: "En attente de DSE" },
  { valeur: "suspendue" as const, label: "Suspendue" },
];

const FILTRES_STATUT_QUARTIER = [
  { valeur: "Tous" as const, label: "Tous" },
  { valeur: "actif" as const, label: "Actif" },
  { valeur: "suspendu" as const, label: "Suspendu" },
];

function SectionSousPrefectures() {
  const utilisateur = useUtilisateurCourant();
  const peutEcrire = !!utilisateur && PROFILS_ECRITURE_TERRITOIRE.includes(utilisateur.profil);
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] =
    useState<(typeof FILTRES_STATUT_SOUS_PREFECTURE)[number]["valeur"]>("Tous");
  const { items, count, page, setPage, pageSize, setPageSize, totalPages, chargement, erreur, creer, mettreAJour } =
    useRessourcePaginee<SousPrefecture>("/territoire/sous-prefectures/", {
      recherche,
      filtres: { statut: filtreStatut === "Tous" ? undefined : filtreStatut },
    });
  const { items: prefectures } = useRessource<Prefecture>("/territoire/prefectures/");
  const [nom, setNom] = useState("");
  const [prefectureId, setPrefectureId] = useState("");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre={`Sous-préfectures (${count})`}
      items={items}
      chargement={chargement}
      erreur={erreur}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      total={count}
      filtres={
        <>
          <Input placeholder="Rechercher une sous-préfecture..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="max-w-xs" />
          <PastillesFiltre options={FILTRES_STATUT_SOUS_PREFECTURE} valeur={filtreStatut} onChange={setFiltreStatut} />
        </>
      }
      colonnes={[
        { label: "Code", rendu: (s) => s.code },
        { label: "Nom", rendu: (s) => <IconeNiveau icone={Landmark} accent="bg-succes" nom={s.nom} /> },
        { label: "Préfecture", rendu: (s) => s.prefecture_nom },
        {
          label: "Statut",
          rendu: (s) => (
            <StatutModifiable
              valeur={s.statut}
              onChange={(v) => mettreAJour(s.id, { statut: v })}
              libelles={LIBELLES_STATUT_SOUS_PREFECTURE}
            />
          ),
        },
        { label: "Écoles", rendu: (s) => s.nombre_ecoles },
      ]}
      actionsEnTete={
        peutEcrire ? (
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
        ) : undefined
      }
    />
  );
}

const FILTRES_TYPE_COMMUNE = [
  { valeur: "Tous" as const, label: "Toutes" },
  { valeur: "urbaine" as const, label: "Urbaine" },
  { valeur: "rurale" as const, label: "Rurale" },
];

function SectionCommunes() {
  const utilisateur = useUtilisateurCourant();
  const peutEcrire = !!utilisateur && PROFILS_ECRITURE_TERRITOIRE.includes(utilisateur.profil);
  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState<(typeof FILTRES_TYPE_COMMUNE)[number]["valeur"]>("Tous");
  const { items, count, page, setPage, pageSize, setPageSize, totalPages, chargement, erreur, creer } =
    useRessourcePaginee<Commune>("/territoire/communes/", {
      recherche,
      filtres: { type_commune: filtreType === "Tous" ? undefined : filtreType },
    });
  const { items: regions } = useRessource<Region>("/territoire/regions/");
  const [nom, setNom] = useState("");
  const [regionId, setRegionId] = useState("");
  const [typeCommune, setTypeCommune] = useState("urbaine");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre={`Communes (${count})`}
      items={items}
      chargement={chargement}
      erreur={erreur}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      total={count}
      filtres={
        <>
          <Input placeholder="Rechercher une commune..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="max-w-xs" />
          <PastillesFiltre options={FILTRES_TYPE_COMMUNE} valeur={filtreType} onChange={setFiltreType} />
        </>
      }
      colonnes={[
        { label: "Code", rendu: (c) => c.code },
        { label: "Nom", rendu: (c) => <IconeNiveau icone={MapPin} accent="bg-primary" nom={c.nom} /> },
        { label: "Région", rendu: (c) => c.region_nom },
        { label: "Type", rendu: (c) => (c.type_commune === "urbaine" ? "Urbaine" : "Rurale") },
      ]}
      actionsEnTete={
        peutEcrire ? (
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
                dialogue.soumettre({ nom, region: regionId, type_commune: typeCommune }, () => {
                  setNom("");
                  setRegionId("");
                });
              }}
            >
              <div>
                <Label htmlFor="com-nom">Nom</Label>
                <Input id="com-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
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
              <p className="text-xs text-muted-foreground">Le code est généré automatiquement.</p>
              {dialogue.erreur && <p className="text-sm text-destructive">{dialogue.erreur}</p>}
              <Button type="submit" disabled={dialogue.enCours}>
                {dialogue.enCours ? "Création..." : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        ) : undefined
      }
    />
  );
}

function SectionQuartiers() {
  const utilisateur = useUtilisateurCourant();
  const peutEcrire = !!utilisateur && PROFILS_ECRITURE_TERRITOIRE.includes(utilisateur.profil);
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<(typeof FILTRES_STATUT_QUARTIER)[number]["valeur"]>("Tous");
  const { items, count, page, setPage, pageSize, setPageSize, totalPages, chargement, erreur, creer, mettreAJour } =
    useRessourcePaginee<Quartier>("/territoire/quartiers/", {
      recherche,
      filtres: { statut: filtreStatut === "Tous" ? undefined : filtreStatut },
    });
  const { items: communes } = useRessource<Commune>("/territoire/communes/");
  const [nom, setNom] = useState("");
  const [communeId, setCommuneId] = useState("");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre={`Quartiers (${count})`}
      items={items}
      chargement={chargement}
      erreur={erreur}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      total={count}
      filtres={
        <>
          <Input placeholder="Rechercher un quartier..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="max-w-xs" />
          <PastillesFiltre options={FILTRES_STATUT_QUARTIER} valeur={filtreStatut} onChange={setFiltreStatut} />
        </>
      }
      colonnes={[
        { label: "Code", rendu: (q) => q.code },
        { label: "Nom", rendu: (q) => <IconeNiveau icone={Navigation} accent="bg-accent" nom={q.nom} /> },
        { label: "Commune", rendu: (q) => q.commune_nom },
        {
          label: "Statut",
          rendu: (q) => (
            <StatutModifiable
              valeur={q.statut}
              onChange={(v) => mettreAJour(q.id, { statut: v })}
              libelles={LIBELLES_STATUT_QUARTIER}
            />
          ),
        },
      ]}
      actionsEnTete={
        peutEcrire ? (
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
        ) : undefined
      }
    />
  );
}
