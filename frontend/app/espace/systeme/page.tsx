"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionTable } from "@/components/section-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { useFormulaireDialogue } from "@/lib/hooks/use-formulaire-dialogue";
import { useRessource } from "@/lib/hooks/use-ressource";

type Parametre = { id: string; cle: string; valeur: string; description: string; modifie_le: string };
type Sauvegarde = { nom: string; taille_octets: number; cree_le: string };

export default function SystemePage() {
  return (
    <div className="space-y-6">
      <SectionParametres />
      <SectionSauvegardes />
      <SectionMatriceDesDroits />
    </div>
  );
}

function SectionParametres() {
  const { items, chargement, erreur, creer, mettreAJour } = useRessource<Parametre>("/parametres/");
  const [cle, setCle] = useState("");
  const [valeur, setValeur] = useState("");
  const [description, setDescription] = useState("");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre="Paramètres système"
      items={items}
      chargement={chargement}
      erreur={erreur}
      colonnes={[
        { label: "Clé", rendu: (p) => <span className="font-mono text-xs">{p.cle}</span> },
        {
          label: "Valeur",
          rendu: (p) => <ValeurModifiable parametre={p} onChange={(v) => mettreAJour(p.id, { valeur: v })} />,
        },
        { label: "Description", rendu: (p) => p.description || "—" },
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
              <DialogTitle>Nouveau paramètre</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                dialogue.soumettre({ cle, valeur, description }, () => {
                  setCle("");
                  setValeur("");
                  setDescription("");
                });
              }}
            >
              <div>
                <Label htmlFor="param-cle">Clé</Label>
                <Input id="param-cle" value={cle} onChange={(e) => setCle(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="param-valeur">Valeur</Label>
                <Input id="param-valeur" value={valeur} onChange={(e) => setValeur(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="param-description">Description</Label>
                <Input id="param-description" value={description} onChange={(e) => setDescription(e.target.value)} />
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

function ValeurModifiable({ parametre, onChange }: { parametre: Parametre; onChange: (v: string) => Promise<unknown> }) {
  const [valeur, setValeur] = useState(parametre.valeur);
  const [enCours, setEnCours] = useState(false);

  async function enregistrer() {
    if (valeur === parametre.valeur) return;
    setEnCours(true);
    try {
      await onChange(valeur);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Input
      value={valeur}
      onChange={(e) => setValeur(e.target.value)}
      onBlur={enregistrer}
      disabled={enCours}
      className="h-8 w-48 text-xs"
    />
  );
}

function SectionSauvegardes() {
  const [sauvegardes, setSauvegardes] = useState<Sauvegarde[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);

  async function charger() {
    setChargement(true);
    const reponse = await apiFetch("/sauvegardes/");
    setSauvegardes(await reponse.json());
    setChargement(false);
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lancer() {
    setEnCours(true);
    try {
      const reponse = await apiFetch("/sauvegardes/", { method: "POST" });
      setSauvegardes(await reponse.json());
    } finally {
      setEnCours(false);
    }
  }

  function formaterTaille(octets: number) {
    return `${(octets / 1024).toFixed(0)} Ko`;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Sauvegardes (US-2.8)</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={charger}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Actualiser
          </Button>
          <Button size="sm" onClick={lancer} disabled={enCours}>
            {enCours ? "Sauvegarde en cours..." : "Lancer une sauvegarde"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {chargement ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : sauvegardes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune sauvegarde pour l&apos;instant.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fichier</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Créée le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sauvegardes.map((s) => (
                <TableRow key={s.nom}>
                  <TableCell className="font-mono text-xs">{s.nom}</TableCell>
                  <TableCell>{formaterTaille(s.taille_octets)}</TableCell>
                  <TableCell>{new Date(s.cree_le).toLocaleString("fr-FR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Pour une sauvegarde quotidienne automatique, planifier{" "}
          <code className="rounded bg-muted px-1 py-0.5">docker compose exec -T backend python manage.py backup_db</code> via
          cron (ou le Planificateur de tâches Windows).
        </p>
      </CardContent>
    </Card>
  );
}

const MATRICE = [
  { module: "Référentiel territorial (régions, préfectures...)", lecture: "Tout compte connecté", ecriture: "Super Admin" },
  { module: "Comptes utilisateurs", lecture: "Super Admin", ecriture: "Super Admin" },
  { module: "Affectations des responsables", lecture: "Super Admin", ecriture: "Super Admin" },
  { module: "Paramètres système", lecture: "Super Admin", ecriture: "Super Admin" },
];

function SectionMatriceDesDroits() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Matrice des droits (US-2.6)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Règles effectivement appliquées par l&apos;API aujourd&apos;hui. Le reste de la matrice du dossier
          fonctionnel (§17 — par périmètre DSE/DCE/DPE/IR) sera complété au fur et à mesure que les modules
          correspondants existeront.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Lecture</TableHead>
              <TableHead>Écriture</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MATRICE.map((m) => (
              <TableRow key={m.module}>
                <TableCell>{m.module}</TableCell>
                <TableCell>{m.lecture}</TableCell>
                <TableCell>{m.ecriture}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
