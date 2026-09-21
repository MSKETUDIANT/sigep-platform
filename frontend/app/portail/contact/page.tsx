"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputTelephone, formaterTelephoneGuinee } from "@/components/ui/input-telephone";
import { Label } from "@/components/ui/label";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type EcoleOption = { id: string; nom: string; code_ecole: string };

export default function ContactPortailPage() {
  const [ecoles, setEcoles] = useState<EcoleOption[]>([]);
  const [rechercheEcole, setRechercheEcole] = useState("");
  const [ecoleId, setEcoleId] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
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
      const reponse = await fetch(`${API_URL}/public/messages-contact/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ecole: ecoleId || null,
          nom,
          email,
          telephone: formaterTelephoneGuinee(telephone),
          sujet,
          message,
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
          <h2 className="text-lg font-semibold text-primary">Message envoyé</h2>
          <p className="text-sm text-muted-foreground">
            Votre message a bien été reçu. Accusé de réception :
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
        <div className="mb-1 flex items-center gap-2 text-primary">
          <MessageSquare className="h-5 w-5" />
          <CardTitle>Contacter une école ou l&apos;administration</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Laissez un message à une école précise, ou à l&apos;administration centrale si aucune école n&apos;est
          concernée.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={soumettre} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ctc-ecole-recherche">École concernée (facultatif)</Label>
            <Input
              id="ctc-ecole-recherche"
              placeholder="Laisser vide pour contacter l'administration centrale"
              value={rechercheEcole}
              onChange={(e) => {
                setRechercheEcole(e.target.value);
                setEcoleId("");
              }}
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
            <Label htmlFor="ctc-nom">Votre nom</Label>
            <Input id="ctc-nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ctc-email">Email</Label>
              <Input id="ctc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ctc-telephone">Téléphone</Label>
              <InputTelephone id="ctc-telephone" value={telephone} onChange={setTelephone} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">Indiquez au moins l&apos;un des deux, pour qu&apos;on puisse vous répondre.</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ctc-sujet">Sujet</Label>
            <Input id="ctc-sujet" value={sujet} onChange={(e) => setSujet(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ctc-message">Message</Label>
            <textarea
              id="ctc-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {erreur && <p className="text-sm text-destructive">{erreur}</p>}

          <Button type="submit" disabled={enCours} className="w-full">
            {enCours ? "Envoi..." : "Envoyer le message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
