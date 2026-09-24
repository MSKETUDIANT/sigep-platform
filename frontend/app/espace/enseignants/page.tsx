"use client";

import { useState } from "react";
import { CheckCircle2, Plus, Send, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputTelephone, formaterTelephoneGuinee } from "@/components/ui/input-telephone";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import { SectionTable } from "@/components/section-table";
import { apiFetch, extraireErreurApi } from "@/lib/api";
import { PROFILS_ECRITURE_ETABLISSEMENT, useUtilisateurCourant } from "@/lib/contexte-utilisateur";
import { useFormulaireDialogue } from "@/lib/hooks/use-formulaire-dialogue";
import { useRessource, useRessourcePaginee } from "@/lib/hooks/use-ressource";
import { suggererIdentifiant } from "@/lib/utils";

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

// Catalogue confirmé 2026-09-25 — doit rester synchronisé avec
// backend/apps/usr/services.py (MATIERES_COLLEGE/MATIERES_LYCEE). Pas de
// filière (SM/SS/Lettres) distinguée au lycée pour l'instant : les 7
// matières dominantes des 3 filières sont regroupées dans une seule liste.
const MATIERES_COLLEGE = [
  "Français", "Mathématiques", "Physique", "Chimie", "Biologie",
  "Histoire", "Géographie", "Éducation Civique et Morale", "Anglais",
  "Éducation Physique et Sportive",
];
const MATIERES_LYCEE = [
  "Français", "Anglais", "Philosophie", "Éducation Physique et Sportive",
  "Mathématiques", "Physique", "Chimie", "Sciences de la Vie et de la Terre",
  "Histoire", "Géographie", "Économie",
];
const MATIERES_PAR_CYCLE: Record<string, string[]> = { college: MATIERES_COLLEGE, lycee: MATIERES_LYCEE };
// Doit rester synchronisé avec backend/apps/usr/services.py::LIMITE_INTERVENTIONS_SECONDAIRE.
const LIMITE_MATIERES = 4;
type Classe = { id: string; libelle: string; cycle_libelle: string; cycle_code: string };

export default function EnseignantsPage() {
  const utilisateur = useUtilisateurCourant();
  const peutEcrire = !!utilisateur && PROFILS_ECRITURE_ETABLISSEMENT.includes(utilisateur.profil);
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
        ...(peutEcrire
          ? [
              {
                label: "Actions",
                rendu: (e: Enseignant) => <DialogueAffecterIntervention enseignant={e} onAffecte={recharger} />,
              },
            ]
          : []),
      ]}
      actionsEnTete={peutEcrire ? <DialogueCreerEnseignant onCree={recharger} /> : undefined}
    />
  );
}

function DialogueCreerEnseignant({ onCree }: { onCree: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [identifiant, setIdentifiant] = useState("");
  const [identifiantModifieManuel, setIdentifiantModifieManuel] = useState(false);
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [cycle, setCycle] = useState<"primaire" | "college" | "lycee">("primaire");
  const [matieres, setMatieres] = useState<string[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [compteCree, setCompteCree] = useState(false);

  function basculerMatiere(m: string) {
    setMatieres((liste) =>
      liste.includes(m) ? liste.filter((x) => x !== m) : liste.length < LIMITE_MATIERES ? [...liste, m] : liste
    );
  }

  function mettreAJourNom(valeur: string) {
    setNom(valeur);
    if (!identifiantModifieManuel) setIdentifiant(suggererIdentifiant(prenoms, valeur));
  }

  function mettreAJourPrenoms(valeur: string) {
    setPrenoms(valeur);
    if (!identifiantModifieManuel) setIdentifiant(suggererIdentifiant(valeur, nom));
  }

  function fermer() {
    setOuvert(false);
    setIdentifiant("");
    setIdentifiantModifieManuel(false);
    setEmail("");
    setTelephone("");
    setNom("");
    setPrenoms("");
    setCycle("primaire");
    setMatieres([]);
    setCompteCree(false);
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
          email: email || undefined,
          telephone: formaterTelephoneGuinee(telephone),
          nom,
          prenoms,
          matiere_principale: matieres.join(", "),
        }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) throw new Error(extraireErreurApi(donnees));
      setCompteCree(true);
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
        {compteCree ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-succes">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">Compte {identifiant} créé.</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {email
                ? "Un email vient d'être envoyé pour que l'enseignant·e active son compte et choisisse lui-même/elle-même son mot de passe."
                : "Aucun email renseigné : utilisez \"Activer\" dans /espace/comptes, ou \"Réinitialiser mdp\" si l'enseignant·e a besoin d'un mot de passe à transmettre vous-même."}
            </p>
            <Button onClick={fermer}>Fermer</Button>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={soumettre}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ens-nom">Nom</Label>
                <Input id="ens-nom" value={nom} onChange={(e) => mettreAJourNom(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="ens-prenoms">Prénoms</Label>
                <Input id="ens-prenoms" value={prenoms} onChange={(e) => mettreAJourPrenoms(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="ens-identifiant">Identifiant</Label>
              <Input
                id="ens-identifiant"
                value={identifiant}
                onChange={(e) => {
                  setIdentifiant(e.target.value);
                  setIdentifiantModifieManuel(true);
                }}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Suggéré automatiquement depuis le nom et les prénoms — modifiable.
              </p>
            </div>
            <div>
              <Label htmlFor="ens-email">Email</Label>
              <Input
                id="ens-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@education.gov.gn"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Nécessaire pour que l&apos;enseignant·e puisse activer son compte lui-même/elle-même (code
                envoyé par email).
              </p>
            </div>
            <div>
              <Label htmlFor="ens-telephone">Téléphone</Label>
              <InputTelephone id="ens-telephone" value={telephone} onChange={setTelephone} required />
            </div>
            <div>
              <Label htmlFor="ens-cycle">Cycle</Label>
              <SelectNatif
                id="ens-cycle"
                value={cycle}
                onChange={(e) => {
                  setCycle(e.target.value as typeof cycle);
                  setMatieres([]);
                }}
              >
                <option value="primaire">Primaire (polyvalent, toutes matières)</option>
                <option value="college">Collège</option>
                <option value="lycee">Lycée</option>
              </SelectNatif>
              <p className="mt-1 text-xs text-muted-foreground">
                Sert uniquement à proposer la bonne liste de matières ci-dessous — la règle de
                polyvalence réelle (une seule classe au primaire, etc.) s&apos;applique à l&apos;affectation
                à une classe, pas ici.
              </p>
            </div>
            {cycle !== "primaire" && (
              <div>
                <Label>Matière(s) principale(s)</Label>
                <div className="grid grid-cols-2 gap-1.5 rounded-md border p-2">
                  {MATIERES_PAR_CYCLE[cycle].map((m) => (
                    <label key={m} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={matieres.includes(m)}
                        disabled={!matieres.includes(m) && matieres.length >= LIMITE_MATIERES}
                        onChange={() => basculerMatiere(m)}
                      />
                      {m}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Un enseignant du collège/lycée peut dispenser plusieurs matières (jusqu&apos;à{" "}
                  {LIMITE_MATIERES}, autant que d&apos;affectations possibles à des classes) —{" "}
                  {matieres.length}/{LIMITE_MATIERES} sélectionnée(s).
                </p>
              </div>
            )}
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
    if (!reponse.ok) throw new Error(extraireErreurApi(donnees));
    onAffecte();
    return donnees;
  });

  const [ecoleId, setEcoleId] = useState("");
  const [classeId, setClasseId] = useState("");
  const [matiere, setMatiere] = useState(enseignant.matiere_principale);
  const [volumeHoraire, setVolumeHoraire] = useState("");

  const classeChoisie = classes.find((c) => c.id === classeId);
  const estPrimaire = classeChoisie?.cycle_code === "primaire";

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
              matiere: estPrimaire ? "" : matiere,
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
            <SelectNatif
              id="int-classe"
              value={classeId}
              onChange={(e) => {
                setClasseId(e.target.value);
                setMatiere(""); // la matière valide dépend du cycle de la classe choisie
              }}
              required
            >
              <option value="">— choisir —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle} ({c.cycle_libelle})
                </option>
              ))}
            </SelectNatif>
          </div>
          {estPrimaire ? (
            <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
              Classe du primaire : l&apos;enseignant est polyvalent (toutes matières) et ne peut être
              titulaire que d&apos;une seule classe à la fois.
            </p>
          ) : (
            <div>
              <Label htmlFor="int-matiere">Matière</Label>
              <SelectNatif
                id="int-matiere"
                value={matiere}
                onChange={(e) => setMatiere(e.target.value)}
                required
                disabled={!classeChoisie}
              >
                <option value="">{classeChoisie ? "— choisir —" : "Choisissez d'abord la classe"}</option>
                {(classeChoisie ? MATIERES_PAR_CYCLE[classeChoisie.cycle_code] ?? [] : []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </SelectNatif>
              <p className="mt-1 text-xs text-muted-foreground">
                Collège/Lycée : plusieurs affectations possibles (jusqu&apos;à 4), une matière par
                affectation.
              </p>
            </div>
          )}
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
