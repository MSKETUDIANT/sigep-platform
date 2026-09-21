"use client";

import { useState } from "react";
import { CheckCheck, Plus } from "lucide-react";

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

type Signalement = {
  id: string;
  ecole: string;
  ecole_nom: string;
  categorie: string;
  categorie_display: string;
  description: string;
  origine: string;
  origine_display: string;
  auteur_nom: string | null;
  nom_declarant: string;
  telephone_declarant: string;
  statut: string;
  statut_display: string;
  commentaire_traitement: string;
  cree_le: string;
};
type Ecole = { id: string; nom: string };

const CATEGORIES = [
  { valeur: "infrastructure", label: "Infrastructure" },
  { valeur: "pedagogique", label: "Pédagogique" },
  { valeur: "securite", label: "Sécurité" },
  { valeur: "administratif", label: "Administratif" },
  { valeur: "autre", label: "Autre" },
];

const FILTRES_STATUT = ["Tous", "nouveau", "en_cours", "traite", "rejete"] as const;
const LIBELLES_STATUT: Record<string, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  traite: "Traité",
  rejete: "Rejeté",
};

function StatutBadge({ statut, label }: { statut: string; label: string }) {
  const variante = statut === "traite" ? "succes" : statut === "rejete" ? "destructive" : "accent";
  return <Badge variant={variante}>{label}</Badge>;
}

export default function SignalementsPage() {
  const { items, chargement, erreur, creer, action, recharger } = useRessource<Signalement>(
    "/etablissements/signalements/"
  );
  const { items: ecoles } = useRessource<Ecole>("/etablissements/ecoles/");
  const [filtreStatut, setFiltreStatut] = useState<(typeof FILTRES_STATUT)[number]>("Tous");

  const itemsFiltres = items.filter((s) => filtreStatut === "Tous" || s.statut === filtreStatut);

  const [ecoleId, setEcoleId] = useState("");
  const [categorie, setCategorie] = useState("infrastructure");
  const [description, setDescription] = useState("");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre={`Signalements (${itemsFiltres.length})`}
      items={itemsFiltres}
      chargement={chargement}
      erreur={erreur}
      filtres={
        <div className="flex flex-wrap gap-1.5">
          {FILTRES_STATUT.map((f) => (
            <button
              key={f}
              onClick={() => setFiltreStatut(f)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filtreStatut === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {f === "Tous" ? "Tous" : LIBELLES_STATUT[f]}
            </button>
          ))}
        </div>
      }
      colonnes={[
        { label: "École", rendu: (s) => s.ecole_nom },
        { label: "Catégorie", rendu: (s) => s.categorie_display },
        {
          label: "Origine",
          rendu: (s) => (
            <div>
              <Badge variant={s.origine === "citoyen" ? "secondary" : "outline"}>{s.origine_display}</Badge>
              <p className="mt-1 text-xs text-muted-foreground">{s.auteur_nom ?? s.nom_declarant}</p>
            </div>
          ),
        },
        { label: "Description", rendu: (s) => <p className="max-w-xs truncate text-sm">{s.description}</p> },
        { label: "Statut", rendu: (s) => <StatutBadge statut={s.statut} label={s.statut_display} /> },
        {
          label: "Actions",
          rendu: (s) => <DialogueTraiter signalement={s} onTraite={recharger} action={action} />,
        },
      ]}
      actionsEnTete={
        <Dialog open={dialogue.ouvert} onOpenChange={dialogue.setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Nouveau signalement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau signalement</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                dialogue.soumettre({ ecole: ecoleId, categorie, description }, () => {
                  setEcoleId("");
                  setDescription("");
                });
              }}
            >
              <div>
                <Label htmlFor="sig-ecole">École</Label>
                <SelectNatif id="sig-ecole" value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} required>
                  <option value="">— choisir —</option>
                  {ecoles.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom}
                    </option>
                  ))}
                </SelectNatif>
              </div>
              <div>
                <Label htmlFor="sig-categorie">Catégorie</Label>
                <SelectNatif id="sig-categorie" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.valeur} value={c.valeur}>
                      {c.label}
                    </option>
                  ))}
                </SelectNatif>
              </div>
              <div>
                <Label htmlFor="sig-description">Description</Label>
                <textarea
                  id="sig-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              {dialogue.erreur && <p className="text-sm text-destructive">{dialogue.erreur}</p>}
              <Button type="submit" disabled={dialogue.enCours}>
                {dialogue.enCours ? "Envoi..." : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

function DialogueTraiter({
  signalement,
  onTraite,
  action,
}: {
  signalement: Signalement;
  onTraite: () => void;
  action: (chemin: string, payload?: Record<string, unknown>) => Promise<unknown>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [statut, setStatut] = useState("en_cours");
  const [commentaire, setCommentaire] = useState(signalement.commentaire_traitement);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      await action(`/etablissements/signalements/${signalement.id}/traiter/`, {
        statut,
        commentaire_traitement: commentaire,
      });
      setOuvert(false);
      onTraite();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally {
      setEnCours(false);
    }
  }

  if (signalement.statut === "traite" || signalement.statut === "rejete") {
    return <p className="text-xs text-muted-foreground">{signalement.commentaire_traitement || "—"}</p>;
  }

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <CheckCheck className="mr-1.5 h-4 w-4" />
          Traiter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Traiter le signalement</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={soumettre}>
          <p className="text-sm text-muted-foreground">{signalement.description}</p>
          <div>
            <Label htmlFor="tr-statut">Statut</Label>
            <SelectNatif id="tr-statut" value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="en_cours">En cours</option>
              <option value="traite">Traité</option>
              <option value="rejete">Rejeté</option>
            </SelectNatif>
          </div>
          <div>
            <Label htmlFor="tr-commentaire">Commentaire</Label>
            <textarea
              id="tr-commentaire"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <Button type="submit" disabled={enCours}>
            {enCours ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
