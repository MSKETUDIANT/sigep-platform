"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CalendarCheck,
  Clock,
  GraduationCap,
  Landmark,
  MapPin,
  Navigation,
  Map as MapIcon,
  NotebookPen,
  School,
  Users,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch, extraireErreurApi } from "@/lib/api";
import { LIBELLES_PROFIL, useUtilisateurCourant, type Utilisateur } from "@/lib/contexte-utilisateur";
import { useRessource } from "@/lib/hooks/use-ressource";
import { cn } from "@/lib/utils";

// Profils avec périmètre de gestion (national ou territorial) : leurs comptages
// École/Enseignants/Élèves/Équipements sont déjà bornés côté backend par
// ecoles_visibles() (US-3.4/US-4.5) — le dashboard n'a qu'à lire les compteurs.
const PROFILS_NATIONAUX = new Set(["dge", "ministre", "cabinet"]);
const PROFILS_PERIMETRE = new Set(["dge", "ministre", "cabinet", "ir", "dpe", "dce", "dse", "directeur_ecole"]);

export default function EspacePage() {
  const utilisateur = useUtilisateurCourant();
  if (!utilisateur) return null;

  if (utilisateur.profil === "super_admin") {
    return <EspaceSuperAdmin />;
  }

  if (utilisateur.profil === "enseignant") {
    return <EspaceEnseignant />;
  }

  if (PROFILS_PERIMETRE.has(utilisateur.profil)) {
    return <EspacePerimetre utilisateur={utilisateur} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tableau de bord — {LIBELLES_PROFIL[utilisateur.profil] ?? utilisateur.profil}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        L&apos;espace détaillé de ce profil sera construit au fil des prochains sprints, une fois les
        modules correspondants disponibles (écoles, élèves, notes, signalements...).
      </CardContent>
    </Card>
  );
}

type Compteurs = {
  regions?: number;
  prefectures?: number;
  sousPrefectures?: number;
  communes?: number;
  quartiers?: number;
  comptes?: number;
};

function EspaceSuperAdmin() {
  const [stats, setStats] = useState<Compteurs>({});

  useEffect(() => {
    async function charger() {
      const [regions, prefectures, sousPrefectures, communes, quartiers, comptes] = await Promise.all([
        apiFetch("/territoire/regions/").then((r) => r.json()),
        apiFetch("/territoire/prefectures/").then((r) => r.json()),
        apiFetch("/territoire/sous-prefectures/").then((r) => r.json()),
        apiFetch("/territoire/communes/").then((r) => r.json()),
        apiFetch("/territoire/quartiers/").then((r) => r.json()),
        apiFetch("/comptes/utilisateurs/").then((r) => r.json()),
      ]);
      setStats({
        regions: regions.count,
        prefectures: prefectures.count,
        sousPrefectures: sousPrefectures.count,
        communes: communes.count,
        quartiers: quartiers.count,
        comptes: comptes.count,
      });
    }
    charger();
  }, []);

  const cartes: { label: string; valeur?: number; icone: typeof MapIcon; accent: string }[] = [
    { label: "Régions", valeur: stats.regions, icone: MapIcon, accent: "bg-primary" },
    { label: "Préfectures", valeur: stats.prefectures, icone: Building2, accent: "bg-accent" },
    { label: "Sous-préfectures", valeur: stats.sousPrefectures, icone: Landmark, accent: "bg-succes" },
    { label: "Communes", valeur: stats.communes, icone: MapPin, accent: "bg-primary" },
    { label: "Quartiers", valeur: stats.quartiers, icone: Navigation, accent: "bg-accent" },
    { label: "Comptes", valeur: stats.comptes, icone: Users, accent: "bg-succes" },
  ];

  const total = Object.values(stats).reduce((s, v) => s + (v ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-primary p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-primary-foreground/70">
          {total || "…"} enregistrements au total, tous types confondus
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cartes.map((c) => {
          const Icone = c.icone;
          return (
            <Card key={c.label} className="overflow-hidden">
              <div className={cn("h-1", c.accent)} />
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Icone className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-primary">{c.valeur ?? "…"}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="secondary" asChild>
            <a href="/espace/territoire">Gérer le territoire</a>
          </Button>
          <Button variant="secondary" asChild>
            <a href="/espace/comptes">Gérer les comptes</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

type Intervention = {
  id: string;
  ecole: string;
  ecole_nom: string;
  classe: string;
  classe_libelle: string;
  cycle_code: string;
  matiere: string;
  volume_horaire_hebdo: string;
};

// §7.1 : barème 1re-6e année (Primaire, CP1..CM2) = /10, 7e à Terminale
// (Collège/Lycée) = /20 — miroir de ped.services.bareme() côté backend.
function baremeIntervention(intervention: Intervention): number {
  return intervention.cycle_code === "primaire" ? 10 : 20;
}

function EspaceEnseignant() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [effectifs, setEffectifs] = useState<Record<string, number>>({});
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function charger() {
      // Le backend restreint deja automatiquement aux interventions de l'enseignant connecte (US-4.6).
      const donnees = await apiFetch("/comptes/interventions-enseignants/").then((r) => r.json());
      const liste: Intervention[] = donnees.results ?? [];
      setInterventions(liste);

      const effectifsParPaire: Record<string, number> = {};
      await Promise.all(
        liste.map(async (i) => {
          const cle = `${i.ecole}-${i.classe}`;
          if (effectifsParPaire[cle] !== undefined) return;
          const eleves = await apiFetch(`/pedagogie/eleves/?ecole=${i.ecole}&classe=${i.classe}`).then((r) => r.json());
          effectifsParPaire[cle] = eleves.count ?? 0;
        })
      );
      setEffectifs(effectifsParPaire);
      setChargement(false);
    }
    charger();
  }, []);

  const ecolesUniques = new Set(interventions.map((i) => i.ecole)).size;
  const classesUniques = new Set(interventions.map((i) => i.classe)).size;
  const volumeTotal = interventions.reduce((s, i) => s + parseFloat(i.volume_horaire_hebdo || "0"), 0);
  const elevesSuivis = Object.values(effectifs).reduce((s, n) => s + n, 0);

  const cartes = [
    { label: "Écoles d'intervention", valeur: ecolesUniques, icone: School, accent: "bg-primary" },
    { label: "Classes en charge", valeur: classesUniques, icone: GraduationCap, accent: "bg-accent" },
    { label: "Élèves suivis", valeur: elevesSuivis, icone: Users, accent: "bg-succes" },
    { label: "Volume horaire / semaine", valeur: `${volumeTotal}h`, icone: Clock, accent: "bg-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cartes.map((c) => {
          const Icone = c.icone;
          return (
            <Card key={c.label} className="overflow-hidden">
              <div className={cn("h-1", c.accent)} />
              <CardContent className="p-4">
                <Icone className="mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-2xl font-bold text-primary">{chargement ? "…" : c.valeur}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes classes et écoles d&apos;intervention</CardTitle>
        </CardHeader>
        <CardContent>
          {chargement ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : interventions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune affectation pour l&apos;instant — le Super Admin doit vous affecter à une école et
              une classe.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>École</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Effectif</TableHead>
                  <TableHead>Horaire / semaine</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interventions.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.ecole_nom}</TableCell>
                    <TableCell>{i.classe_libelle}</TableCell>
                    <TableCell>{i.matiere}</TableCell>
                    <TableCell>{effectifs[`${i.ecole}-${i.classe}`] ?? "…"}</TableCell>
                    <TableCell>{i.volume_horaire_hebdo}h</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <DialogueSaisirNotes intervention={i} />
                        <DialogueFaireAppel intervention={i} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Demande de mutation/transfert disponible avec le circuit de validation (prochain sprint).
      </p>
    </div>
  );
}

const TRIMESTRES = [
  { valeur: "T1", label: "1er trimestre" },
  { valeur: "T2", label: "2e trimestre" },
  { valeur: "T3", label: "3e trimestre" },
];

type EleveLeger = { id: string; nom: string; prenoms: string };
type NoteExistante = { id: string; eleve: string; type_evaluation: string; valeur: string; verrouille: boolean };

function DialogueSaisirNotes({ intervention }: { intervention: Intervention }) {
  const bareme = baremeIntervention(intervention);
  const [ouvert, setOuvert] = useState(false);
  const [trimestre, setTrimestre] = useState("T1");
  const [typeEvaluation, setTypeEvaluation] = useState("Devoir 1");
  const [anneeAcademique] = useState("2026-2027");
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [transmis, setTransmis] = useState<string | null>(null);

  const { items: eleves } = useRessource<EleveLeger>(
    `/pedagogie/eleves/?ecole=${intervention.ecole}&classe=${intervention.classe}`
  );
  const { items: notesExistantes, recharger: rechargerNotes } = useRessource<NoteExistante>(
    `/pedagogie/notes/?matiere=${encodeURIComponent(intervention.matiere)}&trimestre=${trimestre}&annee_academique=${anneeAcademique}`
  );

  const noteParEleve = new Map(
    notesExistantes.filter((n) => n.type_evaluation === typeEvaluation).map((n) => [n.eleve, n])
  );

  useEffect(() => {
    const initial: Record<string, string> = {};
    eleves.forEach((e) => {
      const existante = noteParEleve.get(e.id);
      if (existante) initial[e.id] = existante.valeur;
    });
    setValeurs(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eleves, notesExistantes, typeEvaluation]);

  async function enregistrer() {
    setEnCours(true);
    setErreur(null);
    setTransmis(null);
    try {
      for (const e of eleves) {
        const valeur = valeurs[e.id];
        if (valeur === undefined || valeur === "") continue;
        const existante = noteParEleve.get(e.id);
        const payload = {
          eleve: e.id,
          matiere: intervention.matiere,
          trimestre,
          type_evaluation: typeEvaluation,
          valeur,
          annee_academique: anneeAcademique,
        };
        const reponse = existante
          ? await apiFetch(`/pedagogie/notes/${existante.id}/`, { method: "PATCH", body: JSON.stringify(payload) })
          : await apiFetch("/pedagogie/notes/", { method: "POST", body: JSON.stringify(payload) });
        if (!reponse.ok) throw new Error(extraireErreurApi(await reponse.json()));
      }
      await rechargerNotes();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally {
      setEnCours(false);
    }
  }

  async function transmettre() {
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await apiFetch("/pedagogie/notes/transmettre/", {
        method: "POST",
        body: JSON.stringify({
          classe: intervention.classe,
          matiere: intervention.matiere,
          trimestre,
          annee_academique: anneeAcademique,
        }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) throw new Error(extraireErreurApi(donnees));
      setTransmis(donnees.detail);
      await rechargerNotes();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally {
      setEnCours(false);
    }
  }

  const uneNoteVerrouillee = notesExistantes.some((n) => n.verrouille);

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <NotebookPen className="mr-1.5 h-4 w-4" />
          Notes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Notes — {intervention.matiere} ({intervention.classe_libelle}, /{bareme})
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="notes-trimestre">Trimestre</Label>
              <SelectNatif id="notes-trimestre" value={trimestre} onChange={(e) => setTrimestre(e.target.value)}>
                {TRIMESTRES.map((t) => (
                  <option key={t.valeur} value={t.valeur}>
                    {t.label}
                  </option>
                ))}
              </SelectNatif>
            </div>
            <div>
              <Label htmlFor="notes-evaluation">Évaluation</Label>
              <Input
                id="notes-evaluation"
                value={typeEvaluation}
                onChange={(e) => setTypeEvaluation(e.target.value)}
                placeholder="Devoir 1, Composition..."
              />
            </div>
          </div>

          {eleves.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun élève dans cette classe pour l&apos;instant.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead className="w-24">Note /{bareme}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eleves.map((e) => {
                    const existante = noteParEleve.get(e.id);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          {e.prenoms} {e.nom}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={bareme}
                            step="0.5"
                            className="h-8 w-20"
                            value={valeurs[e.id] ?? ""}
                            disabled={existante?.verrouille}
                            onChange={(ev) => setValeurs((v) => ({ ...v, [e.id]: ev.target.value }))}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {uneNoteVerrouillee && (
            <p className="text-xs text-accent">
              Certaines notes de cette évaluation sont déjà transmises (verrouillées) — non modifiables ici.
            </p>
          )}
          {transmis && <p className="text-sm text-succes">{transmis}</p>}
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <div className="flex gap-2">
            <Button onClick={enregistrer} disabled={enCours} className="flex-1">
              {enCours ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button onClick={transmettre} disabled={enCours} variant="secondary" className="flex-1">
              Transmettre
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogueFaireAppel({ intervention }: { intervention: Intervention }) {
  const [ouvert, setOuvert] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [presences, setPresences] = useState<Record<string, boolean>>({});
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  const { items: eleves } = useRessource<EleveLeger>(
    `/pedagogie/eleves/?ecole=${intervention.ecole}&classe=${intervention.classe}`
  );
  const { items: presencesExistantes, recharger: rechargerPresences } = useRessource<{
    id: string;
    eleve: string;
    present: boolean;
  }>(`/pedagogie/presences/?classe=${intervention.classe}&matiere=${encodeURIComponent(intervention.matiere)}&date=${date}`);

  const presenceParEleve = new Map(presencesExistantes.map((p) => [p.eleve, p]));

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    eleves.forEach((e) => {
      const existante = presenceParEleve.get(e.id);
      initial[e.id] = existante ? existante.present : true;
    });
    setPresences(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eleves, presencesExistantes]);

  async function enregistrer() {
    setEnCours(true);
    setErreur(null);
    setSucces(null);
    try {
      for (const e of eleves) {
        const existante = presenceParEleve.get(e.id);
        const present = presences[e.id] ?? true;
        const payload = { eleve: e.id, classe: intervention.classe, matiere: intervention.matiere, date, present };
        const reponse = existante
          ? await apiFetch(`/pedagogie/presences/${existante.id}/`, { method: "PATCH", body: JSON.stringify(payload) })
          : await apiFetch("/pedagogie/presences/", { method: "POST", body: JSON.stringify(payload) });
        if (!reponse.ok) throw new Error(extraireErreurApi(await reponse.json()));
      }
      setSucces("Appel enregistré.");
      await rechargerPresences();
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
          <CalendarCheck className="mr-1.5 h-4 w-4" />
          Appel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Appel — {intervention.matiere} ({intervention.classe_libelle})
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="appel-date">Date</Label>
            <Input id="appel-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {eleves.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun élève dans cette classe pour l&apos;instant.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead className="w-24">Présent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eleves.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        {e.prenoms} {e.nom}
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={presences[e.id] ?? true}
                          onChange={(ev) => setPresences((p) => ({ ...p, [e.id]: ev.target.checked }))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {succes && <p className="text-sm text-succes">{succes}</p>}
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <Button onClick={enregistrer} disabled={enCours}>
            {enCours ? "Enregistrement..." : "Enregistrer l'appel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type CompteursPerimetre = { ecoles?: number; enseignants?: number; eleves?: number; equipements?: number };

function libellePerimetre(utilisateur: Utilisateur, nomEcole: string | null): string {
  if (PROFILS_NATIONAUX.has(utilisateur.profil)) {
    return "Vue nationale — toutes les écoles du pays";
  }
  if (utilisateur.profil === "directeur_ecole") {
    return nomEcole ? `École ${nomEcole}` : "Aucune école assignée pour l'instant";
  }
  const aff = utilisateur.affectation_active;
  if (utilisateur.profil === "dse") return aff?.sous_prefecture ? `Sous-préfecture de ${aff.sous_prefecture}` : "Aucun périmètre affecté";
  if (utilisateur.profil === "dce") return aff?.commune ? `Commune de ${aff.commune}` : "Aucun périmètre affecté";
  if (utilisateur.profil === "dpe") return aff?.prefecture ? `Préfecture de ${aff.prefecture}` : "Aucun périmètre affecté";
  if (utilisateur.profil === "ir") return aff?.region ? `Région de ${aff.region}` : "Aucun périmètre affecté";
  return "Aucun périmètre affecté";
}

function EspacePerimetre({ utilisateur }: { utilisateur: Utilisateur }) {
  const [stats, setStats] = useState<CompteursPerimetre>({});
  const [nomEcole, setNomEcole] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function charger() {
      const [ecoles, enseignants, eleves, equipements] = await Promise.all([
        apiFetch("/etablissements/ecoles/").then((r) => r.json()),
        apiFetch("/comptes/enseignants/").then((r) => r.json()),
        apiFetch("/pedagogie/eleves/").then((r) => r.json()),
        apiFetch("/etablissements/equipements/").then((r) => r.json()),
      ]);
      setStats({
        ecoles: ecoles.count,
        enseignants: enseignants.count,
        eleves: eleves.count,
        equipements: equipements.count,
      });
      if (utilisateur.profil === "directeur_ecole" && ecoles.results?.[0]) {
        setNomEcole(ecoles.results[0].nom);
      }
      setChargement(false);
    }
    charger();
  }, [utilisateur.profil]);

  const cartes = [
    { label: "Écoles", valeur: stats.ecoles, icone: School, accent: "bg-primary" },
    { label: "Enseignants", valeur: stats.enseignants, icone: GraduationCap, accent: "bg-accent" },
    { label: "Élèves", valeur: stats.eleves, icone: Users, accent: "bg-succes" },
    { label: "Équipements", valeur: stats.equipements, icone: Wrench, accent: "bg-primary" },
  ];

  const aucunPerimetre =
    !PROFILS_NATIONAUX.has(utilisateur.profil) &&
    utilisateur.profil !== "directeur_ecole" &&
    !utilisateur.affectation_active;

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-primary p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-primary-foreground/70">{libellePerimetre(utilisateur, nomEcole)}</p>
      </div>

      {aucunPerimetre && (
        <Card className="border-accent">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Aucune affectation active n&apos;est rattachée à ce compte — le Super Admin doit vous affecter
            à une zone territoriale pour que les données correspondantes s&apos;affichent ici.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cartes.map((c) => {
          const Icone = c.icone;
          return (
            <Card key={c.label} className="overflow-hidden">
              <div className={cn("h-1", c.accent)} />
              <CardContent className="p-4">
                <Icone className="mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-2xl font-bold text-primary">{chargement ? "…" : c.valeur ?? 0}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accès rapide</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="secondary" asChild>
            <a href="/espace/ecoles">Voir les écoles</a>
          </Button>
          <Button variant="secondary" asChild>
            <a href="/espace/enseignants">Voir les enseignants</a>
          </Button>
          <Button variant="secondary" asChild>
            <a href="/espace/eleves">Voir les élèves</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
