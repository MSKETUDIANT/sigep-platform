"use client";

import { useState } from "react";
import { Plus, School } from "lucide-react";

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

// Création d'école réservée au Super Admin côté backend (org/views.py,
// EcoleViewSet.get_permissions) — dossier §17 : seul le Super Admin a
// "Création des unités territoriales". Le bouton ne doit donc apparaître
// qu'à ce profil, sinon les autres profils de gestion remplissent un
// formulaire pour se prendre un 403 à la fin.
const PROFILS_CREATION_ECOLE = ["super_admin"];

type Ecole = {
  id: string;
  code_ecole: string;
  nom: string;
  schema_identification: "A" | "B";
  sous_prefecture_nom: string | null;
  quartier_nom: string | null;
  commune_nom: string | null;
  prefecture_nom: string | null;
  region_nom: string;
  type_ecole: string;
  type_ecole_display: string;
  langue_enseignement_display: string;
  etat_general: string;
  etat_general_display: string;
  nombre_eleves: number;
  nombre_enseignants: number;
};
type SousPrefecture = { id: string; nom: string };
type Quartier = { id: string; nom: string };

const TYPES_ECOLE = [
  { valeur: "publique", label: "Publique" },
  { valeur: "privee", label: "Privée" },
  { valeur: "communautaire", label: "Communautaire" },
  { valeur: "franco_arabe", label: "Franco-arabe" },
  { valeur: "confessionnelle", label: "Confessionnelle" },
];

const LANGUES = [
  { valeur: "francais", label: "Français" },
  { valeur: "arabe", label: "Arabe" },
  { valeur: "francais_arabe", label: "Français-Arabe" },
  { valeur: "bilingue", label: "Bilingue" },
  { valeur: "anglais", label: "Anglais" },
];

const FILTRES_ETAT = [
  { valeur: "Tous" as const, label: "Tous" },
  { valeur: "conforme" as const, label: "Conforme" },
  { valeur: "a_renover" as const, label: "À rénover" },
  { valeur: "critique" as const, label: "Critique" },
];

function EtatBadge({ etat, label }: { etat: string; label: string }) {
  // Légende officielle §3 du dossier fonctionnel : vert = conforme,
  // orange = à rénover, rouge = critique.
  const variante = etat === "conforme" ? "succes" : etat === "critique" ? "destructive" : "accent";
  return <Badge variant={variante}>{label}</Badge>;
}

export default function EcolesPage() {
  const utilisateur = useUtilisateurCourant();
  const peutCreer = !!utilisateur && PROFILS_CREATION_ECOLE.includes(utilisateur.profil);
  const [recherche, setRecherche] = useState("");
  const [filtreEtat, setFiltreEtat] = useState<(typeof FILTRES_ETAT)[number]["valeur"]>("Tous");
  const { items, count, page, setPage, pageSize, setPageSize, totalPages, chargement, erreur, creer } =
    useRessourcePaginee<Ecole>("/etablissements/ecoles/", {
      recherche,
      filtres: { etat_general: filtreEtat === "Tous" ? undefined : filtreEtat },
    });
  const { items: sousPrefectures } = useRessource<SousPrefecture>("/territoire/sous-prefectures/");
  const { items: quartiers } = useRessource<Quartier>("/territoire/quartiers/");

  const [nom, setNom] = useState("");
  const [schema, setSchema] = useState<"A" | "B">("A");
  const [sousPrefectureId, setSousPrefectureId] = useState("");
  const [quartierId, setQuartierId] = useState("");
  const [typeEcole, setTypeEcole] = useState("publique");
  const [langue, setLangue] = useState("francais");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre={`Écoles (${count})`}
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
          <Input
            placeholder="Rechercher une école..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex flex-wrap gap-1.5">
            {FILTRES_ETAT.map((f) => (
              <button
                key={f.valeur}
                onClick={() => setFiltreEtat(f.valeur)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filtreEtat === f.valeur
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      }
      colonnes={[
        { label: "Code", rendu: (e) => <span className="font-mono text-xs">{e.code_ecole}</span> },
        {
          label: "Nom",
          rendu: (e) => (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <School className="h-4 w-4" />
              </div>
              <span className="font-medium">{e.nom}</span>
            </div>
          ),
        },
        {
          label: "Rattachement",
          rendu: (e) => e.sous_prefecture_nom ?? e.quartier_nom ?? "—",
        },
        { label: "Type", rendu: (e) => e.type_ecole_display },
        { label: "Langue", rendu: (e) => e.langue_enseignement_display },
        { label: "État", rendu: (e) => <EtatBadge etat={e.etat_general} label={e.etat_general_display} /> },
        { label: "Élèves", rendu: (e) => e.nombre_eleves },
      ]}
      actionsEnTete={
        peutCreer ? (
        <Dialog open={dialogue.ouvert} onOpenChange={dialogue.setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle école</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const payload: Record<string, unknown> = {
                  nom,
                  schema_identification: schema,
                  type_ecole: typeEcole,
                  langue_enseignement: langue,
                };
                if (schema === "A") payload.sous_prefecture = sousPrefectureId;
                else payload.quartier = quartierId;
                dialogue.soumettre(payload, () => {
                  setNom("");
                  setSousPrefectureId("");
                  setQuartierId("");
                });
              }}
            >
              <div>
                <Label htmlFor="ecole-nom">Nom</Label>
                <Input id="ecole-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>

              <div>
                <Label htmlFor="ecole-schema">Rattachement territorial</Label>
                <SelectNatif
                  id="ecole-schema"
                  value={schema}
                  onChange={(e) => setSchema(e.target.value as "A" | "B")}
                >
                  <option value="A">Sous-préfecture (zones rurales/périurbaines)</option>
                  <option value="B">Quartier (Conakry)</option>
                </SelectNatif>
              </div>

              {schema === "A" ? (
                <div>
                  <Label htmlFor="ecole-sp">Sous-préfecture</Label>
                  <SelectNatif
                    id="ecole-sp"
                    value={sousPrefectureId}
                    onChange={(e) => setSousPrefectureId(e.target.value)}
                    required
                  >
                    <option value="">— choisir —</option>
                    {sousPrefectures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom}
                      </option>
                    ))}
                  </SelectNatif>
                </div>
              ) : (
                <div>
                  <Label htmlFor="ecole-quartier">Quartier</Label>
                  <SelectNatif
                    id="ecole-quartier"
                    value={quartierId}
                    onChange={(e) => setQuartierId(e.target.value)}
                    required
                  >
                    <option value="">— choisir —</option>
                    {quartiers.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.nom}
                      </option>
                    ))}
                  </SelectNatif>
                </div>
              )}

              <div>
                <Label htmlFor="ecole-type">Type</Label>
                <SelectNatif id="ecole-type" value={typeEcole} onChange={(e) => setTypeEcole(e.target.value)}>
                  {TYPES_ECOLE.map((t) => (
                    <option key={t.valeur} value={t.valeur}>
                      {t.label}
                    </option>
                  ))}
                </SelectNatif>
              </div>

              <div>
                <Label htmlFor="ecole-langue">Langue d&apos;enseignement</Label>
                <SelectNatif id="ecole-langue" value={langue} onChange={(e) => setLangue(e.target.value)}>
                  {LANGUES.map((l) => (
                    <option key={l.valeur} value={l.valeur}>
                      {l.label}
                    </option>
                  ))}
                </SelectNatif>
              </div>

              <p className="text-xs text-muted-foreground">
                Le code école, la préfecture/commune et la région sont déterminés automatiquement.
              </p>
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
