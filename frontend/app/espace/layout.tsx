"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Map,
  School,
  Settings,
  ShieldAlert,
  Users,
  Users2,
  Wrench,
} from "lucide-react";

import { apiFetch, clearSession, getToken } from "@/lib/api";
import { LIBELLES_PROFIL, UtilisateurContext, type Utilisateur } from "@/lib/contexte-utilisateur";
import { cn } from "@/lib/utils";

// Profils ayant un périmètre de gestion (national ou territorial) : ils lisent
// Territoire/Écoles/Enseignants/Élèves/Équipements, automatiquement bornés par
// ecoles_visibles() côté backend. Citoyen et Enseignant ont leur propre espace
// dédié et n'ont pas besoin de ces pages de gestion.
const PROFILS_GESTION = [
  "super_admin",
  "dge",
  "ministre",
  "cabinet",
  "ir",
  "dpe",
  "dce",
  "dse",
  "directeur_ecole",
];

const NAV: { href: string; label: string; icone: typeof LayoutDashboard; profils?: string[] }[] = [
  { href: "/espace", label: "Tableau de bord", icone: LayoutDashboard },
  { href: "/espace/territoire", label: "Territoire", icone: Map, profils: PROFILS_GESTION },
  { href: "/espace/ecoles", label: "Écoles", icone: School, profils: PROFILS_GESTION },
  { href: "/espace/enseignants", label: "Enseignants", icone: GraduationCap, profils: PROFILS_GESTION },
  { href: "/espace/eleves", label: "Élèves", icone: Users2, profils: PROFILS_GESTION },
  { href: "/espace/equipements", label: "Équipements", icone: Wrench, profils: PROFILS_GESTION },
  { href: "/espace/signalements", label: "Signalements", icone: ShieldAlert, profils: PROFILS_GESTION },
  { href: "/espace/inspections", label: "Inspections", icone: ClipboardCheck, profils: PROFILS_GESTION },
  { href: "/espace/comptes", label: "Comptes", icone: Users, profils: ["super_admin"] },
  { href: "/espace/systeme", label: "Système", icone: Settings, profils: ["super_admin"] },
];

export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch("/comptes/moi/")
      .then((r) => r.json())
      .then((donnees) => setUtilisateur(donnees))
      .finally(() => setChargement(false));
  }, [router]);

  function seDeconnecter() {
    clearSession();
    router.replace("/login");
  }

  if (chargement) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement...</main>
    );
  }
  if (!utilisateur) return null;

  const libelleProfil = LIBELLES_PROFIL[utilisateur.profil] ?? utilisateur.profil;
  const initiales = `${utilisateur.prenoms[0] ?? ""}${utilisateur.nom[0] ?? ""}`.toUpperCase();
  const navVisible = NAV.filter((item) => !item.profils || item.profils.includes(utilisateur.profil));

  return (
    <UtilisateurContext.Provider value={utilisateur}>
      <div className="flex min-h-screen bg-muted/30">
        <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col overflow-y-auto bg-primary text-primary-foreground">
          <div className="flex flex-col gap-1 px-6 py-6">
            <div className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-guinee-rouge" />
              <span className="h-2 w-2 rounded-full bg-guinee-jaune" />
              <span className="h-2 w-2 rounded-full bg-guinee-vert" />
            </div>
            <span className="mt-2 text-xl font-bold tracking-wide">SIGEP</span>
            <span className="text-xs text-primary-foreground/60">
              Enseignement Préuniversitaire — République de Guinée
            </span>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            {navVisible.map((item) => {
              const Icone = item.icone;
              const actif = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    actif
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  )}
                >
                  <Icone className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 border-t border-primary-foreground/15 px-4 py-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {initiales}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {utilisateur.prenoms} {utilisateur.nom}
              </p>
              <p className="truncate text-xs text-primary-foreground/60">{libelleProfil}</p>
            </div>
            <button
              onClick={seDeconnecter}
              title="Déconnexion"
              className="rounded-md p-2 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <div className="flex-1">
          <div className="p-6">{children}</div>
        </div>
      </div>
    </UtilisateurContext.Provider>
  );
}
