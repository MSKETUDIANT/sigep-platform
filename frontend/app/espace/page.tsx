"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Clock,
  GraduationCap,
  Landmark,
  MapPin,
  Navigation,
  Map as MapIcon,
  School,
  Users,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { LIBELLES_PROFIL, useUtilisateurCourant, type Utilisateur } from "@/lib/contexte-utilisateur";
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
  matiere: string;
  volume_horaire_hebdo: string;
};

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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Saisie des notes, appel et demande de mutation seront disponibles dans les prochains sprints
        (Pédagogie, puis circuit de validation).
      </p>
    </div>
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
