"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputTelephone, formaterTelephoneGuinee } from "@/components/ui/input-telephone";
import { Label } from "@/components/ui/label";
import { SelectNatif } from "@/components/ui/select-natif";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type EcoleOption = { id: string; nom: string; code_ecole: string };

const CATEGORIES = [
  { valeur: "infrastructure", label: "Infrastructure (bâtiment, toiture, sanitaires...)" },
  { valeur: "pedagogique", label: "Pédagogique" },
  { valeur: "securite", label: "Sécurité" },
  { valeur: "administratif", label: "Administratif" },
  { valeur: "autre", label: "Autre" },
];

export default function SignalerPortailPage() {
  const [ecoles, setEcoles] = useState<EcoleOption[]>([]);
  const [rechercheEcole, setRechercheEcole] = useState("");
  const [ecoleId, setEcoleId] = useState("");
  const [categorie, setCategorie] = useState("infrastructure");
  const [description, setDescription] = useState("");
  const [nomDeclarant, setNomDeclarant] = useState("");
  const [telephoneDeclarant, setTelephoneDeclarant] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    const delai = setTimeout(async () => {
      if (rechercheEcole.length < 2) {
        setEcoles([]);
        return;
      }
      const reponse = await fetch(`${API_URL}/public/ecoles/?search=${encodeURIComponent(rechercheEcole)}`);
      const donnees = await reponse.json();
      setEcoles(donnees.results ?? []);
    }, 300);
    return () => clearTimeout(delai);
  }, [rechercheEcole]);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch(`${API_URL}/public/signalements/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ecole: ecoleId,
          categorie,
          description,
          nom_declarant: nomDeclarant,
          telephone_declarant: formaterTelephoneGuinee(telephoneDeclarant),
        }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) throw new Error(JSON.stringify(donnees));
      setConfirmation(donnees.id);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally {
      setEnCours(false);
    }
  }

  if (confirmation) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-succes" />
          <h2 className="text-lg font-semibold text-primary">Signalement enregistré</h2>
          <p className="text-sm text-muted-foreground">
            Votre signalement a été transmis à la direction concernée. Référence :
          </p>
          <p className="rounded-md bg-secondary px-3 py-1.5 font-mono text-xs text-secondary-foreground">
            {confirmation}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <div className="mb-1 flex items-center gap-2 text-accent-foreground">
          <ShieldAlert className="h-5 w-5" />
          <CardTitle>Faire un signalement</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Signalez un problème lié à une école (infrastructure, sécurité...). Aucun compte requis — votre
          signalement est transmis directement au périmètre concerné.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={soumettre} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sig-ecole-recherche">École concernée</Label>
            <Input
              id="sig-ecole-recherche"
              placeholder="Rechercher par nom..."
              value={rechercheEcole}
              onChange={(e) => {
                setRechercheEcole(e.target.value);
                setEcoleId("");
              }}
              required={!ecoleId}
            />
            {ecoles.length > 0 && !ecoleId && (
              <div className="flex flex-col overflow-hidden rounded-md border border-border">
                {ecoles.map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => {
                      setEcoleId(e.id);
                      setRechercheEcole(e.nom);
                      setEcoles([]);
                    }}
                    className="px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {e.nom} <span className="text-xs text-muted-foreground">({e.code_ecole})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sig-categorie">Catégorie</Label>
            <SelectNatif id="sig-categorie" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.valeur} value={c.valeur}>
                  {c.label}
                </option>
              ))}
            </SelectNatif>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sig-description">Description</Label>
            <textarea
              id="sig-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Décrivez le problème constaté..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sig-nom">Votre nom</Label>
              <Input id="sig-nom" value={nomDeclarant} onChange={(e) => setNomDeclarant(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sig-telephone">Votre téléphone</Label>
              <InputTelephone id="sig-telephone" value={telephoneDeclarant} onChange={setTelephoneDeclarant} required />
            </div>
          </div>

          {erreur && <p className="text-sm text-destructive">{erreur}</p>}

          <Button type="submit" disabled={enCours || !ecoleId} className="w-full">
            {enCours ? "Envoi..." : "Envoyer le signalement"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
