"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Map, Settings, Users } from "lucide-react";

import { apiFetch, clearSession, getToken } from "@/lib/api";
import { LIBELLES_PROFIL, UtilisateurContext, type Utilisateur } from "@/lib/contexte-utilisateur";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/espace", label: "Tableau de bord", icone: LayoutDashboard },
  { href: "/espace/territoire", label: "Territoire", icone: Map },
  { href: "/espace/comptes", label: "Comptes", icone: Users },
  { href: "/espace/systeme", label: "Système", icone: Settings },
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

  const estSuperAdmin = utilisateur.profil === "super_admin";
  const libelleProfil = LIBELLES_PROFIL[utilisateur.profil] ?? utilisateur.profil;
  const initiales = `${utilisateur.prenoms[0] ?? ""}${utilisateur.nom[0] ?? ""}`.toUpperCase();

  return (
    <UtilisateurContext.Provider value={utilisateur}>
      <div className="flex min-h-screen bg-muted/30">
        {estSuperAdmin && (
          <aside className="flex w-64 flex-shrink-0 flex-col bg-primary text-primary-foreground">
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
              {NAV.map((item) => {
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
        )}

        <div className="flex-1">
          {!estSuperAdmin && (
            <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <div>
                <p className="text-sm text-muted-foreground">Espace</p>
                <h1 className="text-lg font-semibold text-primary">
                  {utilisateur.prenoms} {utilisateur.nom} — {libelleProfil}
                </h1>
              </div>
              <button
                onClick={seDeconnecter}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Déconnexion
              </button>
            </header>
          )}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </UtilisateurContext.Provider>
  );
}
