"use client";

import { useState } from "react";
import { Plus, Send, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputTelephone, formaterTelephoneGuinee } from "@/components/ui/input-telephone";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import { SectionTable } from "@/components/section-table";
import { apiFetch } from "@/lib/api";
import { useFormulaireDialogue } from "@/lib/hooks/use-formulaire-dialogue";
import { useRessource, useRessourcePaginee } from "@/lib/hooks/use-ressource";

type Enseignant = {
  id: string;
  matricule: string;
  utilisateur_nom: string;
  identifiant_lecture: string;
  matiere_principale: string;
  statut_enseignant: string;
  statut_enseignant_display: string;
};
type Ecole = { id: string; nom: string };
type Classe = { id: string; libelle: string; cycle_libelle: string };

export default function EnseignantsPage() {
  const { items, count, page, setPage, pageSize, setPageSize, totalPages, chargement, erreur, recharger } =
    useRessourcePaginee<Enseignant>("/comptes/enseignants/");

  return (
    <SectionTable
      titre={`Enseignants (${count})`}
      items={items}
      chargement={chargement}
      erreur={erreur}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      total={count}
      colonnes={[
        {
          label: "Enseignant",
          rendu: (e) => (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">{e.utilisateur_nom}</p>
                <p className="text-xs text-muted-foreground">{e.matricule}</p>
              </div>
            </div>
          ),
        },
        { label: "Matière principale", rendu: (e) => e.matiere_principale || "—" },
        { label: "Statut", rendu: (e) => <Badge variant="succes">{e.statut_enseignant_display}</Badge> },
        {
          label: "Actions",
          rendu: (e) => <DialogueAffecterIntervention enseignant={e} onAffecte={recharger} />,
        },
      ]}
      actionsEnTete={<DialogueCreerEnseignant onCree={recharger} />}
    />
  );
}

function DialogueCreerEnseignant({ onCree }: { onCree: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [identifiant, setIdentifiant] = useState("");
  const [telephone, setTelephone] = useState("");
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [matiere, setMatiere] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [motDePasseGenere, setMotDePasseGenere] = useState<string | null>(null);

  function fermer() {
    setOuvert(false);
    setIdentifiant("");
    setTelephone("");
    setNom("");
    setPrenoms("");
    setMatiere("");
    setMotDePasseGenere(null);
    setErreur(null);
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await apiFetch("/comptes/enseignants/", {
        method: "POST",
        body: JSON.stringify({
          identifiant,
          telephone: formaterTelephoneGuinee(telephone),
          nom,
          prenoms,
          matiere_principale: matiere,
        }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) throw new Error(JSON.stringify(donnees));
      setMotDePasseGenere(donnees.mot_de_passe_provisoire_genere);
      onCree();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={(v) => (v ? setOuvert(true) : fermer())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel enseignant</DialogTitle>
        </DialogHeader>
        {motDePasseGenere ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Compte <strong>{identifiant}</strong> créé. Mot de passe provisoire (à transmettre) :
            </p>
            <p className="rounded-md bg-secondary p-3 font-mono text-sm">{motDePasseGenere}</p>
            <Button onClick={fermer}>Fermer</Button>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={soumettre}>
            <div>
              <Label htmlFor="ens-identifiant">Identifiant</Label>
              <Input id="ens-identifiant" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="ens-telephone">Téléphone</Label>
              <InputTelephone id="ens-telephone" value={telephone} onChange={setTelephone} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ens-nom">Nom</Label>
                <Input id="ens-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="ens-prenoms">Prénoms</Label>
                <Input id="ens-prenoms" value={prenoms} onChange={(e) => setPrenoms(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="ens-matiere">Matière principale</Label>
              <Input id="ens-matiere" value={matiere} onChange={(e) => setMatiere(e.target.value)} />
            </div>
            {erreur && <p className="text-sm text-destructive">{erreur}</p>}
            <Button type="submit" disabled={enCours}>
              {enCours ? "Création..." : "Créer (mot de passe généré automatiquement)"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DialogueAffecterIntervention({ enseignant, onAffecte }: { enseignant: Enseignant; onAffecte: () => void }) {
  const { items: ecoles } = useRessource<Ecole>("/etablissements/ecoles/");
  const { items: classes } = useRessource<Classe>("/territoire/classes/");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>(async (payload) => {
    const reponse = await apiFetch("/comptes/interventions-enseignants/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const donnees = await reponse.json();
    if (!reponse.ok) throw new Error(JSON.stringify(donnees));
    onAffecte();
    return donnees;
  });

  const [ecoleId, setEcoleId] = useState("");
  const [classeId, setClasseId] = useState("");
  const [matiere, setMatiere] = useState(enseignant.matiere_principale);
  const [volumeHoraire, setVolumeHoraire] = useState("");

  return (
    <Dialog open={dialogue.ouvert} onOpenChange={dialogue.setOuvert}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Send className="mr-1.5 h-4 w-4" />
          Affecter à une classe
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Affecter {enseignant.utilisateur_nom}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            dialogue.soumettre({
              enseignant: enseignant.id,
              ecole: ecoleId,
              classe: classeId,
              matiere,
              volume_horaire_hebdo: volumeHoraire || 0,
            });
          }}
        >
          <div>
            <Label htmlFor="int-ecole">École</Label>
            <SelectNatif id="int-ecole" value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} required>
              <option value="">— choisir —</option>
              {ecoles.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom}
                </option>
              ))}
            </SelectNatif>
          </div>
          <div>
            <Label htmlFor="int-classe">Classe</Label>
            <SelectNatif id="int-classe" value={classeId} onChange={(e) => setClasseId(e.target.value)} required>
              <option value="">— choisir —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle} ({c.cycle_libelle})
                </option>
              ))}
            </SelectNatif>
          </div>
          <div>
            <Label htmlFor="int-matiere">Matière</Label>
            <Input id="int-matiere" value={matiere} onChange={(e) => setMatiere(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="int-volume">Volume horaire hebdomadaire</Label>
            <Input
              id="int-volume"
              type="number"
              step="0.5"
              value={volumeHoraire}
              onChange={(e) => setVolumeHoraire(e.target.value)}
            />
          </div>
          {dialogue.erreur && <p className="text-sm text-destructive">{dialogue.erreur}</p>}
          <Button type="submit" disabled={dialogue.enCours}>
            {dialogue.enCours ? "Enregistrement..." : "Affecter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
