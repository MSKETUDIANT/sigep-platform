"use client";

import { useState } from "react";
import { Plus, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";
import { SectionTable } from "@/components/section-table";
import { useFormulaireDialogue } from "@/lib/hooks/use-formulaire-dialogue";
import { useRessource } from "@/lib/hooks/use-ressource";

type Equipement = {
  id: string;
  ecole: string;
  ecole_nom: string;
  type_equipement: string;
  total: number;
  fonctionnel: number;
  a_reparer: number;
  hors_service: number;
};
type Ecole = { id: string; nom: string };

export default function EquipementsPage() {
  const { items, chargement, erreur, creer } = useRessource<Equipement>("/etablissements/equipements/");
  const { items: ecoles } = useRessource<Ecole>("/etablissements/ecoles/");

  const [ecoleFiltre, setEcoleFiltre] = useState("Toutes");
  const itemsFiltres = items.filter((e) => ecoleFiltre === "Toutes" || e.ecole === ecoleFiltre);

  const [ecoleId, setEcoleId] = useState("");
  const [type, setType] = useState("");
  const [total, setTotal] = useState("0");
  const [fonctionnel, setFonctionnel] = useState("0");
  const [aReparer, setAReparer] = useState("0");
  const dialogue = useFormulaireDialogue<Record<string, unknown>>((payload) => creer(payload));

  return (
    <SectionTable
      titre={`Équipements (${itemsFiltres.length})`}
      items={itemsFiltres}
      chargement={chargement}
      erreur={erreur}
      filtres={
        <SelectNatif value={ecoleFiltre} onChange={(e) => setEcoleFiltre(e.target.value)} className="max-w-xs">
          <option value="Toutes">Toutes les écoles</option>
          {ecoles.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nom}
            </option>
          ))}
        </SelectNatif>
      }
      colonnes={[
        {
          label: "Équipement",
          rendu: (e) => (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Wrench className="h-4 w-4" />
              </div>
              <span className="font-medium">{e.type_equipement}</span>
            </div>
          ),
        },
        { label: "École", rendu: (e) => e.ecole_nom },
        { label: "Total", rendu: (e) => e.total },
        { label: "Fonctionnel", rendu: (e) => <Badge variant="succes">{e.fonctionnel}</Badge> },
        { label: "À réparer", rendu: (e) => <Badge variant="accent">{e.a_reparer}</Badge> },
        { label: "Hors service", rendu: (e) => (e.hors_service > 0 ? <Badge variant="destructive">{e.hors_service}</Badge> : "0") },
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
              <DialogTitle>Nouvel équipement</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                dialogue.soumettre(
                  {
                    ecole: ecoleId,
                    type_equipement: type,
                    total: Number(total),
                    fonctionnel: Number(fonctionnel),
                    a_reparer: Number(aReparer),
                  },
                  () => {
                    setType("");
                    setTotal("0");
                    setFonctionnel("0");
                    setAReparer("0");
                  }
                );
              }}
            >
              <div>
                <Label htmlFor="eq-ecole">École</Label>
                <SelectNatif id="eq-ecole" value={ecoleId} onChange={(e) => setEcoleId(e.target.value)} required>
                  <option value="">— choisir —</option>
                  {ecoles.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom}
                    </option>
                  ))}
                </SelectNatif>
              </div>
              <div>
                <Label htmlFor="eq-type">Type d&apos;équipement</Label>
                <Input
                  id="eq-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="ex. Tables-bancs, Tableaux noirs..."
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="eq-total">Total</Label>
                  <Input id="eq-total" type="number" min="0" value={total} onChange={(e) => setTotal(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="eq-fonctionnel">Fonctionnel</Label>
                  <Input
                    id="eq-fonctionnel"
                    type="number"
                    min="0"
                    value={fonctionnel}
                    onChange={(e) => setFonctionnel(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="eq-a-reparer">À réparer</Label>
                  <Input
                    id="eq-a-reparer"
                    type="number"
                    min="0"
                    value={aReparer}
                    onChange={(e) => setAReparer(e.target.value)}
                  />
                </div>
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
