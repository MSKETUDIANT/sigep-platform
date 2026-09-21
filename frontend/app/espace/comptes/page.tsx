"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import { SectionTable } from "@/components/section-table";
import { apiFetch } from "@/lib/api";
import { useRessource } from "@/lib/hooks/use-ressource";

type Utilisateur = {
  id: string;
  identifiant: string;
  nom: string;
  prenoms: string;
  profil: string;
  profil_display: string;
  statut: string;
  statut_display: string;
  is_active: boolean;
  affectation_active: {
    id: string;
    sous_prefecture: string | null;
    commune: string | null;
    prefecture: string | null;
    region: string | null;
  } | null;
};

const PROFILS_CREABLES = [
  { valeur: "dse", label: "Directeur Sous-Préfectoral" },
  { valeur: "dce", label: "Directeur Communal" },
  { valeur: "dpe", label: "Directeur Préfectoral" },
  { valeur: "ir", label: "Inspecteur Régional" },
  { valeur: "directeur_ecole", label: "Directeur d'École" },
  { valeur: "enseignant", label: "Enseignant" },
  { valeur: "dge", label: "Directeur Général de l'Éducation" },
  { valeur: "ministre", label: "Ministre" },
  { valeur: "cabinet", label: "Cabinet" },
];

const PROFILS_AVEC_PERIMETRE = ["dse", "dce", "dpe", "ir"];

const LIBELLES_STATUT: Record<string, string> = {
  actif: "Actif",
  en_attente_activation: "En attente d'activation",
  suspendu: "Suspendu",
  revoque: "Révoqué",
};

function StatutBadge({ statut }: { statut: string }) {
  // Légende officielle (§3 du dossier fonctionnel) : vert = conforme/actif,
  // orange = à surveiller, rouge = critique/bloqué.
  const variante = statut === "actif" ? "succes" : statut === "revoque" ? "destructive" : "accent";
  return <Badge variant={variante}>{LIBELLES_STATUT[statut] ?? statut}</Badge>;
}

export default function ComptesPage() {
  const { items, chargement, erreur, recharger } = useRessource<Utilisateur>("/comptes/utilisateurs/");

  return (
    <div className="space-y-4">
      <SectionTable
        titre="Comptes utilisateurs"
        items={items}
        chargement={chargement}
        erreur={erreur}
        colonnes={[
          { label: "Identifiant", rendu: (u) => u.identifiant },
          { label: "Nom", rendu: (u) => `${u.prenoms} ${u.nom}` },
          { label: "Profil", rendu: (u) => u.profil_display },
          { label: "Statut", rendu: (u) => <StatutBadge statut={u.statut} /> },
          {
            label: "Actions",
            rendu: (u) => <ActionsUtilisateur utilisateur={u} onChange={recharger} />,
          },
        ]}
        actionsEnTete={<DialogueCreerCompte onCree={recharger} />}
      />
    </div>
  );
}

function ActionsUtilisateur({ utilisateur, onChange }: { utilisateur: Utilisateur; onChange: () => void }) {
  const [enCours, setEnCours] = useState<string | null>(null);

  async function revoquer() {
    if (!confirm(`Révoquer le compte ${utilisateur.identifiant} ? La connexion sera immédiatement bloquée.`)) return;
    setEnCours("revoquer");
    await apiFetch(`/comptes/utilisateurs/${utilisateur.id}/revoquer/`, { method: "POST" });
    setEnCours(null);
    onChange();
  }

  async function reinitialiser() {
    setEnCours("reinitialiser");
    const reponse = await apiFetch(`/comptes/utilisateurs/${utilisateur.id}/reinitialiser_mot_de_passe/`, {
      method: "POST",
    });
    const donnees = await reponse.json();
    setEnCours(null);
    alert(`Nouveau mot de passe provisoire pour ${utilisateur.identifiant} :\n\n${donnees.mot_de_passe_provisoire_genere}`);
    onChange();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {PROFILS_AVEC_PERIMETRE.includes(utilisateur.profil) && (
        <DialogueAffecter utilisateur={utilisateur} onAffecte={onChange} />
      )}
      <Button size="sm" variant="outline" disabled={enCours !== null} onClick={reinitialiser}>
        Réinitialiser mdp
      </Button>
      {utilisateur.statut !== "revoque" && (
        <Button size="sm" variant="destructive" disabled={enCours !== null} onClick={revoquer}>
          Révoquer
        </Button>
      )}
    </div>
  );
}

function DialogueCreerCompte({ onCree }: { onCree: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [identifiant, setIdentifiant] = useState("");
  const [telephone, setTelephone] = useState("");
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [profil, setProfil] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [motDePasseGenere, setMotDePasseGenere] = useState<string | null>(null);

  function fermer() {
    setOuvert(false);
    setIdentifiant("");
    setTelephone("");
    setNom("");
    setPrenoms("");
    setProfil("");
    setMotDePasseGenere(null);
    setErreur(null);
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await apiFetch("/comptes/utilisateurs/", {
        method: "POST",
        body: JSON.stringify({ identifiant, telephone, profil, nom, prenoms }),
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
    <Dialog
      open={ouvert}
      onOpenChange={(v) => {
        if (!v) fermer();
        else setOuvert(true);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Créer un compte</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau compte</DialogTitle>
        </DialogHeader>

        {motDePasseGenere ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Compte <strong>{identifiant}</strong> créé. Mot de passe provisoire (à transmettre, ne sera plus
              jamais affiché) :
            </p>
            <p className="rounded-md bg-secondary p-3 font-mono text-sm">{motDePasseGenere}</p>
            <Button onClick={fermer}>Fermer</Button>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={soumettre}>
            <div>
              <Label htmlFor="cpt-identifiant">Identifiant</Label>
              <Input id="cpt-identifiant" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="cpt-telephone">Téléphone</Label>
              <Input id="cpt-telephone" value={telephone} onChange={(e) => setTelephone(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cpt-nom">Nom</Label>
                <Input id="cpt-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="cpt-prenoms">Prénoms</Label>
                <Input id="cpt-prenoms" value={prenoms} onChange={(e) => setPrenoms(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="cpt-profil">Profil</Label>
              <SelectNatif id="cpt-profil" value={profil} onChange={(e) => setProfil(e.target.value)} required>
                <option value="">— choisir —</option>
                {PROFILS_CREABLES.map((p) => (
                  <option key={p.valeur} value={p.valeur}>
                    {p.label}
                  </option>
                ))}
              </SelectNatif>
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

const CHAMP_PAR_PROFIL: Record<string, { champ: string; endpoint: string; label: string }> = {
  dse: { champ: "sous_prefecture", endpoint: "/territoire/sous-prefectures/", label: "Sous-préfecture" },
  dce: { champ: "commune", endpoint: "/territoire/communes/", label: "Commune" },
  dpe: { champ: "prefecture", endpoint: "/territoire/prefectures/", label: "Préfecture" },
  ir: { champ: "region", endpoint: "/territoire/regions/", label: "Région" },
};

function DialogueAffecter({ utilisateur, onAffecte }: { utilisateur: Utilisateur; onAffecte: () => void }) {
  const config = CHAMP_PAR_PROFIL[utilisateur.profil];
  const { items: options } = useRessource<{ id: string; nom: string }>(config.endpoint);
  const [ouvert, setOuvert] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [motif, setMotif] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const dejaAffecte = Boolean(utilisateur.affectation_active);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      let reponse: Response;
      if (dejaAffecte && utilisateur.affectation_active) {
        reponse = await apiFetch(`/comptes/affectations/${utilisateur.affectation_active.id}/reaffecter/`, {
          method: "POST",
          body: JSON.stringify({ [config.champ]: unitId, motif }),
        });
      } else {
        reponse = await apiFetch("/comptes/affectations/", {
          method: "POST",
          body: JSON.stringify({ utilisateur: utilisateur.id, profil: utilisateur.profil, [config.champ]: unitId, motif }),
        });
      }
      if (!reponse.ok) throw new Error(JSON.stringify(await reponse.json()));
      setOuvert(false);
      setUnitId("");
      setMotif("");
      onAffecte();
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
          {dejaAffecte ? "Réaffecter" : "Affecter"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dejaAffecte ? "Réaffecter" : "Affecter"} {utilisateur.prenoms} {utilisateur.nom}
          </DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={soumettre}>
          <div>
            <Label htmlFor="aff-unite">{config.label}</Label>
            <SelectNatif id="aff-unite" value={unitId} onChange={(e) => setUnitId(e.target.value)} required>
              <option value="">— choisir —</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nom}
                </option>
              ))}
            </SelectNatif>
          </div>
          <div>
            <Label htmlFor="aff-motif">Motif</Label>
            <Input id="aff-motif" value={motif} onChange={(e) => setMotif(e.target.value)} />
          </div>
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <Button type="submit" disabled={enCours}>
            {enCours ? "Enregistrement..." : dejaAffecte ? "Réaffecter" : "Affecter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
