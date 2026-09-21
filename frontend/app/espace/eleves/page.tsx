"use client";

import { useState } from "react";
import { Plus, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import { SectionTable } from "@/components/section-table";
import { apiFetch } from "@/lib/api";
import { useFormulaireDialogue } from "@/lib/hooks/use-formulaire-dialogue";
import { useRessource, useRessourcePaginee } from "@/lib/hooks/use-ressource";

type Filiation = { id: string; lien: string; lien_display: string; nom_complet: string; telephone: string; urgence: boolean };
type Eleve = {
  id: string;
  matricule: string;
  nom: string;
  prenoms: string;
  sexe_display: string;
  ecole_nom: string;
  classe_libelle: string;
  statut_display: string;
  filiations: Filiation[];
};
type Ecole = { id: string; nom: string };
type Classe = { id: string; libelle: string; cycle_libelle: string };

const LIENS = [
  { valeur: "pere", label: "Père" },
  { valeur: "mere", label: "Mère" },
  { valeur: "tuteur", label: "Tuteur" },
  { valeur: "frere_soeur", label: "Frère / Sœur" },
];

export default function ElevesPage() {
  const [recherche, setRecherche] = useState("");
  const { items, count, page, setPage, pageSize, setPageSize, totalPages, chargement, erreur, creer, recharger } =
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
        { label: "Filiation", rendu: (e) => <DialogueFiliation eleve={e} onChange={recharger} /> },
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
      }
    />
  );
}

function DialogueFiliation({ eleve, onChange }: { eleve: Eleve; onChange: () => void }) {
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
        body: JSON.stringify({ eleve: eleve.id, lien, nom_complet: nomComplet, telephone, urgence }),
      });
      if (!reponse.ok) throw new Error(JSON.stringify(await reponse.json()));
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
            <Input id="fil-telephone" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
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
      </DialogContent>
    </Dialog>
  );
}
