"use client";

import { useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";

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

type Inspection = {
  id: string;
  ecole: string;
  ecole_nom: string;
  signalement: string | null;
  inspecteur: string;
  inspecteur_nom: string;
  date_prevue: string;
  statut: string;
  statut_display: string;
  date_realisation: string | null;
  rapport: string;
};
type Ecole = { id: string; nom: string };

const FILTRES_STATUT = ["Tous", "planifiee", "realisee", "annulee"] as const;
const LIBELLES_STATUT: Record<string, string> = {
  planifiee: "Planifiée",
  realisee: "Réalisée",
  annulee: "Annulée",
};

function StatutBadge({ statut, label }: { statut: string; label: string }) {
  const variante = statut === "realisee" ? "succes" : statut === "annulee" ? "destructive" : "accent";
  return <Badge variant={variante}>{label}</Badge>;
}

export default function InspectionsPage() {
  const utilisateur = useUtilisateurCourant();
  const [filtreStatut, setFiltreStatut] = useState<(typeof FILTRES_STATUT)[number]>("Tous");
  const { items, count, page, setPage, pageSize, setPageSize, totalPages, chargement, erreur, creer, action, recharger } =
    useRessourcePaginee<Inspection>("/etablissements/inspections/", {
      filtres: { statut: filtreStatut === "Tous" ? undefined : filtreStatut },
    });
  const { items: ecoles } = useRessource<Ecole>("/etablissements/ecoles/");

  const [ecoleId, setEcoleId] = useState("");
  const [datePrevue, setDatePrevue] = useState("");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre={`Inspections (${count})`}
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
        { label: "École", rendu: (i) => i.ecole_nom },
        { label: "Inspecteur", rendu: (i) => i.inspecteur_nom },
        { label: "Date prévue", rendu: (i) => i.date_prevue },
        { label: "Statut", rendu: (i) => <StatutBadge statut={i.statut} label={i.statut_display} /> },
        {
          label: "Rapport",
          rendu: (i) =>
            i.statut === "realisee" ? (
              <p className="max-w-xs truncate text-sm">{i.rapport}</p>
            ) : (
              <DialogueRapport inspection={i} onConsigne={recharger} action={action} />
            ),
        },
      ]}
      actionsEnTete={
        <Dialog open={dialogue.ouvert} onOpenChange={dialogue.setOuvert}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Planifier une inspection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Planifier une inspection</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                dialogue.soumettre(
                  { ecole: ecoleId, inspecteur: utilisateur?.id, date_prevue: datePrevue },
                  () => {
                    setEcoleId("");
                    setDatePrevue("");
                  }
                );
              }}
            >
              <div>
                <Label htmlFor="insp-ecole">École</Label>
                <SelectNatif id="insp-ecole" value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} required>
                  <option value="">— choisir —</option>
                  {ecoles.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom}
                    </option>
                  ))}
                </SelectNatif>
              </div>
              <div>
                <Label htmlFor="insp-date">Date prévue</Label>
                <Input
                  id="insp-date"
                  type="date"
                  value={datePrevue}
                  onChange={(e) => setDatePrevue(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Vous serez enregistré·e comme inspecteur·rice assigné·e.
              </p>
              {dialogue.erreur && <p className="text-sm text-destructive">{dialogue.erreur}</p>}
              <Button type="submit" disabled={dialogue.enCours}>
                {dialogue.enCours ? "Enregistrement..." : "Planifier"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

function DialogueRapport({
  inspection,
  onConsigne,
  action,
}: {
  inspection: Inspection;
  onConsigne: () => void;
  action: (chemin: string, payload?: Record<string, unknown>) => Promise<unknown>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [dateRealisation, setDateRealisation] = useState(new Date().toISOString().slice(0, 10));
  const [rapport, setRapport] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      await action(`/etablissements/inspections/${inspection.id}/consigner-rapport/`, {
        date_realisation: dateRealisation,
        rapport,
      });
      setOuvert(false);
      onConsigne();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <ClipboardCheck className="mr-1.5 h-4 w-4" />
          Consigner le rapport
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rapport d&apos;inspection — {inspection.ecole_nom}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={soumettre}>
          <div>
            <Label htmlFor="rap-date">Date de réalisation</Label>
            <Input
              id="rap-date"
              type="date"
              value={dateRealisation}
              onChange={(e) => setDateRealisation(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="rap-texte">Rapport</Label>
            <textarea
              id="rap-texte"
              value={rapport}
              onChange={(e) => setRapport(e.target.value)}
              required
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <Button type="submit" disabled={enCours}>
            {enCours ? "Enregistrement..." : "Consigner"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
