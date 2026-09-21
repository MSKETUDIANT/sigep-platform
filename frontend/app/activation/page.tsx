"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, KeyRound, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ActivationPage() {
  return (
    <Suspense fallback={null}>
      <ActivationFormulaire />
    </Suspense>
  );
}

function ActivationFormulaire() {
  const searchParams = useSearchParams();
  const [identifiant, setIdentifiant] = useState(searchParams.get("identifiant") ?? "");
  const [code, setCode] = useState("");
  const [etape, setEtape] = useState<"identifiant" | "code" | "termine">("identifiant");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function demanderCode(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch(`${API_URL}/comptes/otp/envoyer/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiant }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) throw new Error(donnees.identifiant?.[0] || donnees.detail || "Impossible d'envoyer le code.");
      setEtape("code");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally {
      setEnCours(false);
    }
  }

  async function verifierCode(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch(`${API_URL}/comptes/otp/verifier/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiant, code }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) {
        throw new Error(donnees.non_field_errors?.[0] || donnees.code?.[0] || donnees.detail || "Code invalide.");
      }
      setEtape("termine");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-guinee-rouge" />
            <span className="h-2 w-2 rounded-full bg-guinee-jaune" />
            <span className="h-2 w-2 rounded-full bg-guinee-vert" />
          </div>
          <CardTitle className="text-primary">Activer mon compte</CardTitle>
          <p className="text-sm text-muted-foreground">
            Un code d&apos;activation vous sera envoyé par email pour confirmer votre compte SIGEP.
          </p>
        </CardHeader>
        <CardContent>
          {etape === "identifiant" && (
            <form onSubmit={demanderCode} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="act-identifiant">Identifiant</Label>
                <Input
                  id="act-identifiant"
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {erreur && <p className="text-sm text-destructive">{erreur}</p>}
              <Button type="submit" disabled={enCours} className="w-full">
                <Mail className="mr-1.5 h-4 w-4" />
                {enCours ? "Envoi..." : "Recevoir le code par email"}
              </Button>
            </form>
          )}

          {etape === "code" && (
            <form onSubmit={verifierCode} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Un code à 6 chiffres a été envoyé à l&apos;adresse email associée au compte{" "}
                <strong>{identifiant}</strong>. Il est valable 10 minutes.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="act-code">Code reçu</Label>
                <Input
                  id="act-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  className="text-center text-lg tracking-[0.5em]"
                />
              </div>
              {erreur && <p className="text-sm text-destructive">{erreur}</p>}
              <Button type="submit" disabled={enCours || code.length !== 6} className="w-full">
                <KeyRound className="mr-1.5 h-4 w-4" />
                {enCours ? "Vérification..." : "Activer mon compte"}
              </Button>
              <button
                type="button"
                onClick={() => setEtape("identifiant")}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Changer d&apos;identifiant
              </button>
            </form>
          )}

          {etape === "termine" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-succes" />
              <p className="text-sm text-muted-foreground">
                Compte activé avec succès. Vous pouvez maintenant vous connecter.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Se connecter</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
