"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiFetch, clearSession, getToken } from "@/lib/api";
import { LIBELLES_PROFIL, UtilisateurContext, type Utilisateur } from "@/lib/contexte-utilisateur";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/espace", label: "Tableau de bord" },
  { href: "/espace/territoire", label: "Territoire" },
  { href: "/espace/comptes", label: "Comptes" },
  { href: "/espace/systeme", label: "Système" },
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

  return (
    <UtilisateurContext.Provider value={utilisateur}>
      <div className="min-h-screen bg-muted/30">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Espace</p>
            <h1 className="text-lg font-semibold text-primary">
              {utilisateur.prenoms} {utilisateur.nom} — {libelleProfil}
            </h1>
          </div>
          <Button variant="outline" onClick={seDeconnecter}>
            Déconnexion
          </Button>
        </header>

        {estSuperAdmin && (
          <nav className="flex gap-1 border-b border-border bg-card px-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="p-6">{children}</div>
      </div>
    </UtilisateurContext.Provider>
  );
}
