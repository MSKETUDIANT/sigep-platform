"use client";

import { useState } from "react";
import { BookOpen, Pencil, Plus, UserPlus, Users } from "lucide-react";

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

type Filiation = { id: string; lien: string; lien_display: string; nom_complet: string; telephone: string; urgence: boolean };
type Eleve = {
  id: string;
  matricule: string;
  nom: string;
  prenoms: string;
  sexe: string;
  sexe_display: string;
  date_naissance: string | null;
  lieu_naissance: string;
  photo_url: string;
  ecole_nom: string;
  classe_libelle: string;
  cycle_code: string;
  statut: string;
  statut_display: string;
  filiations: Filiation[];
};
type Ecole = { id: string; nom: string };
type Classe = { id: string; libelle: string; cycle_libelle: string };

// §7.1 : barème 1re-6e (Primaire) = /10, 7e-Terminale (Collège/Lycée) = /20.
function baremeEleve(eleve: Eleve): number {
  return eleve.cycle_code === "primaire" ? 10 : 20;
}

const STATUTS_ELEVE = [
  { valeur: "actif", label: "Actif" },
  { valeur: "transfere", label: "Transféré" },
  { valeur: "diplome", label: "Diplômé" },
  { valeur: "abandon", label: "Abandon" },
];

const LIENS = [
  { valeur: "pere", label: "Père" },
  { valeur: "mere", label: "Mère" },
  { valeur: "tuteur", label: "Tuteur" },
  { valeur: "frere_soeur", label: "Frère / Sœur" },
];

export default function ElevesPage() {
  const utilisateur = useUtilisateurCourant();
  const peutEcrire = !!utilisateur && PROFILS_ECRITURE_ETABLISSEMENT.includes(utilisateur.profil);
  const [recherche, setRecherche] = useState("");
  const { items, count, page, setPage, pageSize, setPageSize, totalPages, chargement, erreur, creer, recharger, mettreAJour } =
    useRessourcePaginee<Eleve>("/pedagogie/eleves/", { recherche });
  const { items: ecoles } = useRessource<Ecole>("/etablissements/ecoles/");
  const { items: classes } = useRessource<Classe>("/territoire/classes/");

  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [sexe, setSexe] = useState("F");
  const [dateNaissance, setDateNaissance] = useState("");
  const [ecoleId, setEcoleId] = useState("");
  const [classeId, setClasseId] = useState("");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre={`Élèves (${count})`}
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
        <Input
          placeholder="Rechercher un élève..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="max-w-xs"
        />
      }
      colonnes={[
        { label: "Matricule", rendu: (e) => <span className="font-mono text-xs">{e.matricule}</span> },
        {
          label: "Élève",
          rendu: (e) => (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Users className="h-4 w-4" />
              </div>
              <span className="font-medium">
                {e.prenoms} {e.nom}
              </span>
            </div>
          ),
        },
        { label: "Sexe", rendu: (e) => e.sexe_display },
        { label: "École", rendu: (e) => e.ecole_nom },
        { label: "Classe", rendu: (e) => e.classe_libelle },
        {
          label: "Filiation",
          rendu: (e) => <DialogueFiliation eleve={e} onChange={recharger} peutEcrire={peutEcrire} />,
        },
        {
          label: "Actions",
          rendu: (e) => (
            <div className="flex gap-2">
              <DialogueLivret eleve={e} />
              {peutEcrire && (
                <>
                  <DialogueModifierEleve eleve={e} onModifie={(payload) => mettreAJour(e.id, payload)} />
                  <DialogueExamenDeliberation eleve={e} />
                </>
              )}
            </div>
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
              <DialogTitle>Nouvel élève</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                dialogue.soumettre(
                  { nom, prenoms, sexe, date_naissance: dateNaissance || undefined, ecole: ecoleId, classe: classeId },
                  () => {
                    setNom("");
                    setPrenoms("");
                    setDateNaissance("");
                    setEcoleId("");
                    setClasseId("");
                  }
                );
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ele-nom">Nom</Label>
                  <Input id="ele-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="ele-prenoms">Prénoms</Label>
                  <Input id="ele-prenoms" value={prenoms} onChange={(e) => setPrenoms(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ele-sexe">Sexe</Label>
                  <SelectNatif id="ele-sexe" value={sexe} onChange={(e) => setSexe(e.target.value)}>
                    <option value="F">Féminin</option>
                    <option value="M">Masculin</option>
                  </SelectNatif>
                </div>
                <div>
                  <Label htmlFor="ele-naissance">Date de naissance</Label>
                  <Input
                    id="ele-naissance"
                    type="date"
                    value={dateNaissance}
                    onChange={(e) => setDateNaissance(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="ele-ecole">École</Label>
                <SelectNatif id="ele-ecole" value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} required>
                  <option value="">— choisir —</option>
                  {ecoles.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom}
                    </option>
                  ))}
                </SelectNatif>
              </div>
              <div>
                <Label htmlFor="ele-classe">Classe</Label>
                <SelectNatif id="ele-classe" value={classeId} onChange={(e) => setClasseId(e.target.value)} required>
                  <option value="">— choisir —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.libelle} ({c.cycle_libelle})
                    </option>
                  ))}
                </SelectNatif>
              </div>
              <p className="text-xs text-muted-foreground">Le matricule est généré automatiquement.</p>
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

function DialogueFiliation({
  eleve,
  onChange,
  peutEcrire,
}: {
  eleve: Eleve;
  onChange: () => void;
  peutEcrire: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [lien, setLien] = useState("pere");
  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [urgence, setUrgence] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await apiFetch("/pedagogie/filiations/", {
        method: "POST",
        body: JSON.stringify({
          eleve: eleve.id,
          lien,
          nom_complet: nomComplet,
          telephone: formaterTelephoneGuinee(telephone),
          urgence,
        }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) throw new Error(extraireErreurApi(donnees));
      setNomComplet("");
      setTelephone("");
      setUrgence(false);
      onChange();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally {
      setEnCours(false);
    }
  }

  if (eleve.filiations.length === 0 && !peutEcrire) return null;

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="mr-1.5 h-4 w-4" />
          {eleve.filiations.length > 0 ? `${eleve.filiations.length} contact(s)` : "Ajouter"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Filiation — {eleve.prenoms} {eleve.nom}
          </DialogTitle>
        </DialogHeader>

        {eleve.filiations.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {eleve.filiations.map((f) => (
              <li key={f.id} className="rounded-md bg-muted p-2 text-sm">
                <strong>{f.lien_display}</strong> — {f.nom_complet}
                {f.telephone && ` — ${f.telephone}`}
                {f.urgence && <span className="ml-2 text-destructive">(urgence)</span>}
              </li>
            ))}
          </ul>
        )}

        {peutEcrire && (
        <form className="flex flex-col gap-3" onSubmit={ajouter}>
          <div>
            <Label htmlFor="fil-lien">Lien</Label>
            <SelectNatif id="fil-lien" value={lien} onChange={(e) => setLien(e.target.value)}>
              {LIENS.map((l) => (
                <option key={l.valeur} value={l.valeur}>
                  {l.label}
                </option>
              ))}
            </SelectNatif>
          </div>
          <div>
            <Label htmlFor="fil-nom">Nom complet</Label>
            <Input id="fil-nom" value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="fil-telephone">Téléphone</Label>
            <InputTelephone id="fil-telephone" value={telephone} onChange={setTelephone} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={urgence} onChange={(e) => setUrgence(e.target.checked)} />
            Contact d&apos;urgence
          </label>
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <Button type="submit" disabled={enCours}>
            {enCours ? "Ajout..." : "Ajouter ce contact"}
          </Button>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DialogueModifierEleve({
  eleve,
  onModifie,
}: {
  eleve: Eleve;
  onModifie: (payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState(eleve.nom);
  const [prenoms, setPrenoms] = useState(eleve.prenoms);
  const [sexe, setSexe] = useState(eleve.sexe);
  const [dateNaissance, setDateNaissance] = useState(eleve.date_naissance ?? "");
  const [lieuNaissance, setLieuNaissance] = useState(eleve.lieu_naissance);
  const [photoUrl, setPhotoUrl] = useState(eleve.photo_url);
  const [statut, setStatut] = useState(eleve.statut);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      await onModifie({
        nom,
        prenoms,
        sexe,
        date_naissance: dateNaissance || null,
        lieu_naissance: lieuNaissance,
        photo_url: photoUrl,
        statut,
      });
      setOuvert(false);
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
        setOuvert(v);
        if (v) {
          setNom(eleve.nom);
          setPrenoms(eleve.prenoms);
          setSexe(eleve.sexe);
          setDateNaissance(eleve.date_naissance ?? "");
          setLieuNaissance(eleve.lieu_naissance);
          setPhotoUrl(eleve.photo_url);
          setStatut(eleve.statut);
          setErreur(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Pencil className="mr-1.5 h-4 w-4" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Modifier {eleve.prenoms} {eleve.nom}
          </DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={soumettre}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ele-mod-nom">Nom</Label>
              <Input id="ele-mod-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="ele-mod-prenoms">Prénoms</Label>
              <Input id="ele-mod-prenoms" value={prenoms} onChange={(e) => setPrenoms(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ele-mod-sexe">Sexe</Label>
              <SelectNatif id="ele-mod-sexe" value={sexe} onChange={(e) => setSexe(e.target.value)}>
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
              </SelectNatif>
            </div>
            <div>
              <Label htmlFor="ele-mod-naissance">Date de naissance</Label>
              <Input
                id="ele-mod-naissance"
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ele-mod-lieu">Lieu de naissance</Label>
            <Input id="ele-mod-lieu" value={lieuNaissance} onChange={(e) => setLieuNaissance(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ele-mod-photo">Photo (URL)</Label>
            <Input
              id="ele-mod-photo"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="ele-mod-statut">Statut</Label>
            <SelectNatif id="ele-mod-statut" value={statut} onChange={(e) => setStatut(e.target.value)}>
              {STATUTS_ELEVE.map((s) => (
                <option key={s.valeur} value={s.valeur}>
                  {s.label}
                </option>
              ))}
            </SelectNatif>
          </div>
          <p className="text-xs text-muted-foreground">
            L&apos;école et la classe ne peuvent pas être modifiées ici.
          </p>
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <Button type="submit" disabled={enCours}>
            {enCours ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type BulletinAgrege = { trimestre: string; matieres: { matiere: string; moyenne: number }[]; moyenne_generale: number | null };
type DeliberationAgregee = {
  annee_academique: string;
  moyenne_generale: string | null;
  statut: string;
  motif: string;
  date_deliberation: string;
};
type ExamenAgrege = {
  annee_academique: string;
  type_examen: string;
  numero_candidat: string;
  resultat: string;
  moyenne_examen: string | null;
};
type Livret = {
  eleve_nom: string;
  bareme: number;
  bulletins: BulletinAgrege[];
  deliberations: DeliberationAgregee[];
  examens: ExamenAgrege[];
};

const LIBELLES_STATUT_DELIBERATION: Record<string, string> = {
  admis: "Admis",
  redoublant: "Redoublant",
  examen_national_requis: "Examen national requis",
  exclu: "Exclu",
};

function DialogueLivret({ eleve }: { eleve: Eleve }) {
  const [ouvert, setOuvert] = useState(false);
  const [livret, setLivret] = useState<Livret | null>(null);
  const [chargement, setChargement] = useState(false);

  async function ouvrir() {
    setOuvert(true);
    setChargement(true);
    const reponse = await apiFetch(`/pedagogie/eleves/${eleve.id}/livret/`);
    setLivret(await reponse.json());
    setChargement(false);
  }

  return (
    <Dialog open={ouvert} onOpenChange={(v) => (v ? ouvrir() : setOuvert(false))}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <BookOpen className="mr-1.5 h-4 w-4" />
          Livret
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Livret scolaire — {eleve.prenoms} {eleve.nom}
          </DialogTitle>
        </DialogHeader>
        {chargement || !livret ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : (
          <div className="flex max-h-96 flex-col gap-4 overflow-y-auto">
            <div>
              <h4 className="mb-2 text-sm font-semibold">Bulletins</h4>
              {livret.bulletins.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune note saisie pour l&apos;instant.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {livret.bulletins.map((b, i) => (
                    <div key={i} className="rounded-md bg-muted p-2 text-sm">
                      <p className="font-medium">
                        {b.trimestre} — moyenne générale : {b.moyenne_generale ?? "—"}/{livret.bareme}
                      </p>
                      <ul className="mt-1 text-xs text-muted-foreground">
                        {b.matieres.map((m) => (
                          <li key={m.matiere}>
                            {m.matiere} : {m.moyenne}/{livret.bareme}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Délibérations</h4>
              {livret.deliberations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune délibération enregistrée.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {livret.deliberations.map((d, i) => (
                    <li key={i} className="rounded-md bg-muted p-2 text-sm">
                      <p className="font-medium">
                        {d.annee_academique} —{" "}
                        <Badge variant={d.statut === "admis" ? "succes" : "accent"}>
                          {LIBELLES_STATUT_DELIBERATION[d.statut] ?? d.statut}
                        </Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Moyenne : {d.moyenne_generale ?? "—"}/{livret.bareme}{d.motif && ` — ${d.motif}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Examens nationaux</h4>
              {livret.examens.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune inscription à un examen.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {livret.examens.map((ex, i) => (
                    <li key={i} className="rounded-md bg-muted p-2 text-sm">
                      <p className="font-medium">
                        {ex.type_examen} {ex.annee_academique} — {ex.numero_candidat}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Résultat : {ex.resultat === "en_attente" ? "En attente" : ex.resultat}
                        {ex.moyenne_examen && ` — ${ex.moyenne_examen}/20`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const TYPES_EXAMEN = ["CEP", "BEPC", "BAC"];
const STATUTS_DELIBERATION = [
  { valeur: "admis", label: "Admis" },
  { valeur: "redoublant", label: "Redoublant" },
  { valeur: "examen_national_requis", label: "Examen national requis" },
  { valeur: "exclu", label: "Exclu" },
];
const ANNEE_PAR_DEFAUT = "2026-2027";

type InscriptionExamen = {
  id: string;
  type_examen: string;
  annee_academique: string;
  numero_candidat: string;
  resultat: string;
  resultat_display: string;
  moyenne_examen: string | null;
};
type DeliberationDetail = {
  id: string;
  annee_academique: string;
  moyenne_generale: string | null;
  statut: string;
  motif: string;
};

function DialogueExamenDeliberation({ eleve }: { eleve: Eleve }) {
  const [ouvert, setOuvert] = useState(false);
  const {
    items: inscriptions,
    creer: creerInscription,
    mettreAJour: mettreAJourInscription,
    recharger: rechargerInscriptions,
  } = useRessource<InscriptionExamen>(`/pedagogie/inscriptions-examens/?eleve=${eleve.id}`);
  const {
    items: deliberations,
    creer: creerDeliberation,
    mettreAJour: mettreAJourDeliberation,
    recharger: rechargerDeliberations,
  } = useRessource<DeliberationDetail>(`/pedagogie/deliberations/?eleve=${eleve.id}`);

  const [typeExamen, setTypeExamen] = useState("BEPC");
  const [erreurExamen, setErreurExamen] = useState<string | null>(null);
  const [enCoursExamen, setEnCoursExamen] = useState(false);

  const deliberationCourante = deliberations.find((d) => d.annee_academique === ANNEE_PAR_DEFAUT);
  const [statutDeliberation, setStatutDeliberation] = useState(deliberationCourante?.statut ?? "admis");
  const [motifDeliberation, setMotifDeliberation] = useState(deliberationCourante?.motif ?? "");
  const [erreurDeliberation, setErreurDeliberation] = useState<string | null>(null);
  const [enCoursDeliberation, setEnCoursDeliberation] = useState(false);

  async function inscrire(e: React.FormEvent) {
    e.preventDefault();
    setEnCoursExamen(true);
    setErreurExamen(null);
    try {
      await creerInscription({ eleve: eleve.id, type_examen: typeExamen, annee_academique: ANNEE_PAR_DEFAUT });
    } catch (err) {
      setErreurExamen(err instanceof Error ? err.message : String(err));
    } finally {
      setEnCoursExamen(false);
    }
  }

  async function changerResultat(inscription: InscriptionExamen, resultat: string) {
    await mettreAJourInscription(inscription.id, { resultat });
    await rechargerInscriptions();
  }

  async function enregistrerDeliberation(e: React.FormEvent) {
    e.preventDefault();
    setEnCoursDeliberation(true);
    setErreurDeliberation(null);
    try {
      const payload = {
        eleve: eleve.id,
        annee_academique: ANNEE_PAR_DEFAUT,
        statut: statutDeliberation,
        motif: motifDeliberation,
      };
      if (deliberationCourante) {
        await mettreAJourDeliberation(deliberationCourante.id, payload);
      } else {
        await creerDeliberation(payload);
      }
      await rechargerDeliberations();
    } catch (err) {
      setErreurDeliberation(err instanceof Error ? err.message : String(err));
    } finally {
      setEnCoursDeliberation(false);
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Examens
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Examens & délibération — {eleve.prenoms} {eleve.nom}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold">Inscriptions aux examens</h4>
            {inscriptions.length > 0 && (
              <ul className="mb-2 flex flex-col gap-2">
                {inscriptions.map((ins) => (
                  <li key={ins.id} className="flex items-center justify-between rounded-md bg-muted p-2 text-sm">
                    <span>
                      {ins.type_examen} {ins.annee_academique} — {ins.numero_candidat}
                    </span>
                    <SelectNatif
                      className="h-8 w-36 text-xs"
                      value={ins.resultat}
                      onChange={(e) => changerResultat(ins, e.target.value)}
                    >
                      <option value="en_attente">En attente</option>
                      <option value="admis">Admis</option>
                      <option value="echec">Échec</option>
                    </SelectNatif>
                  </li>
                ))}
              </ul>
            )}
            <form className="flex items-end gap-2" onSubmit={inscrire}>
              <div className="flex-1">
                <Label htmlFor="exam-type">Nouvel examen</Label>
                <SelectNatif id="exam-type" value={typeExamen} onChange={(e) => setTypeExamen(e.target.value)}>
                  {TYPES_EXAMEN.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </SelectNatif>
              </div>
              <Button type="submit" size="sm" disabled={enCoursExamen}>
                Inscrire
              </Button>
            </form>
            {erreurExamen && <p className="text-sm text-destructive">{erreurExamen}</p>}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Délibération {ANNEE_PAR_DEFAUT}</h4>
            <form className="flex flex-col gap-3" onSubmit={enregistrerDeliberation}>
              <div>
                <Label htmlFor="delib-statut">Statut</Label>
                <SelectNatif
                  id="delib-statut"
                  value={statutDeliberation}
                  onChange={(e) => setStatutDeliberation(e.target.value)}
                >
                  {STATUTS_DELIBERATION.map((s) => (
                    <option key={s.valeur} value={s.valeur}>
                      {s.label}
                    </option>
                  ))}
                </SelectNatif>
              </div>
              <div>
                <Label htmlFor="delib-motif">Motif</Label>
                <Input
                  id="delib-motif"
                  value={motifDeliberation}
                  onChange={(e) => setMotifDeliberation(e.target.value)}
                />
              </div>
              {deliberationCourante?.moyenne_generale && (
                <p className="text-xs text-muted-foreground">
                  Moyenne générale calculée : {deliberationCourante.moyenne_generale}/{baremeEleve(eleve)}
                </p>
              )}
              {erreurDeliberation && <p className="text-sm text-destructive">{erreurDeliberation}</p>}
              <Button type="submit" disabled={enCoursDeliberation}>
                {enCoursDeliberation ? "Enregistrement..." : deliberationCourante ? "Mettre à jour" : "Délibérer"}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
