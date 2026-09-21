"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Landmark, Lock, Map, School, ShieldCheck, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReponseConnexion = {
  access: string;
  refresh: string;
  profil: string;
  identifiant: string;
  nom_complet: string;
  mot_de_passe_provisoire: boolean;
};

const ATOUTS = [
  { icone: Map, label: "Territoire national" },
  { icone: School, label: "Établissements" },
  { icone: Users2, label: "Profils & périmètres" },
];

export default function LoginPage() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [resultat, setResultat] = useState<ReponseConnexion | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setResultat(null);
    setEnCours(true);
    try {
      const reponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/comptes/connexion/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiant, password: motDePasse }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) {
        setErreur(donnees.detail || "Identifiant ou mot de passe incorrect.");
        return;
      }
      setResultat(donnees);
      window.localStorage.setItem("sigep_access_token", donnees.access);
      window.localStorage.setItem("sigep_refresh_token", donnees.refresh);
      router.push("/espace");
    } catch {
      setErreur("Impossible de contacter le serveur SIGEP.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main className="flex min-h-screen">
      {/* Panneau institutionnel — masqué sur mobile, la connexion reste utilisable en plein écran */}
      <div className="relative hidden w-1/2 flex-col overflow-hidden bg-primary px-14 py-14 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-guinee-rouge" />
            <span className="h-2.5 w-2.5 rounded-full bg-guinee-jaune" />
            <span className="h-2.5 w-2.5 rounded-full bg-guinee-vert" />
          </div>
          <div className="h-4 w-px bg-primary-foreground/20" />
          <span className="text-sm font-medium text-primary-foreground/70">
            Ministère de l&apos;Éducation Nationale et de l&apos;Alphabétisation
          </span>
        </div>

        <div className="relative flex flex-1 flex-col justify-center gap-8 py-12">
          <div className="flex flex-col gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
              <Landmark className="h-8 w-8" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-4xl font-bold tracking-tight">SIGEP</span>
              <span className="text-sm text-primary-foreground/60">
                Système Intégré de Gestion de l&apos;Enseignement Préuniversitaire
              </span>
            </div>
          </div>

          <div className="h-px w-16 bg-primary-foreground/25" />

          <div className="flex flex-col gap-3">
            <h1 className="max-w-md text-2xl font-semibold leading-snug">
              La gestion de l&apos;enseignement préuniversitaire.
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-primary-foreground/70">
              Une plateforme unique reliant le Ministère, les directions régionales, préfectorales et
              communales, les écoles et les familles — sur l&apos;ensemble du territoire de la République de
              Guinée.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {ATOUTS.map((a) => {
              const Icone = a.icone;
              return (
                <div
                  key={a.label}
                  className="flex items-center gap-2.5 rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.06] px-4 py-2.5 backdrop-blur-sm"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/10">
                    <Icone className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium">{a.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-xs text-primary-foreground/45">
          © 2026 République de Guinée — Tous droits réservés
        </p>
      </div>

      {/* Panneau de connexion */}
      <div className="flex w-full flex-1 items-center justify-center bg-muted/40 p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="h-2 w-2 rounded-full bg-guinee-rouge" />
            <span className="h-2 w-2 rounded-full bg-guinee-jaune" />
            <span className="h-2 w-2 rounded-full bg-guinee-vert" />
            <span className="text-lg font-bold text-primary">SIGEP</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-primary/5">
            <div className="p-8">
              <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground">
                <Lock className="h-3 w-3" />
                Accès sécurisé
              </div>
              <h2 className="text-2xl font-bold text-primary">Connexion</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Accès réservé aux agents du Ministère et des directions territoriales de l&apos;éducation.
              </p>

              <form onSubmit={seConnecter} className="mt-7 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="identifiant">Identifiant</Label>
                  <Input
                    id="identifiant"
                    type="text"
                    value={identifiant}
                    onChange={(e) => setIdentifiant(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mot-de-passe">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="mot-de-passe"
                      type={motDePasseVisible ? "text" : "password"}
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setMotDePasseVisible((v) => !v)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                      aria-label={motDePasseVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {motDePasseVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {erreur && <p className="text-sm text-destructive">{erreur}</p>}

                {resultat && (
                  <div className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
                    <p>
                      Connecté en tant que <strong>{resultat.nom_complet}</strong> ({resultat.profil})
                    </p>
                    {resultat.mot_de_passe_provisoire && (
                      <p className="mt-1 text-accent-foreground">Mot de passe provisoire — à changer.</p>
                    )}
                  </div>
                )}

                <Button type="submit" disabled={enCours} className="mt-2 w-full">
                  {enCours ? "Connexion..." : "Se connecter"}
                  {!enCours && <ArrowRight className="ml-1.5 h-4 w-4" />}
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-1.5 border-t border-border pt-5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                Connexion chiffrée. L&apos;accès à ce système est réservé au personnel autorisé.
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © 2026 SIGEP — République de Guinée
          </p>
        </div>
      </div>
    </main>
  );
}
