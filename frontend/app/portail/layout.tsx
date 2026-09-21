"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, MessageSquare, Search, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portail", label: "Rechercher une école", icone: Search },
  { href: "/portail/carte", label: "Carte", icone: MapPin },
  { href: "/portail/signaler", label: "Signaler un problème", icone: ShieldAlert },
  { href: "/portail/contact", label: "Contact", icone: MessageSquare },
];

export default function PortailLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5">
          <div className="flex items-center justify-between">
            <Link href="/portail" className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-guinee-rouge" />
                <span className="h-2 w-2 rounded-full bg-guinee-jaune" />
                <span className="h-2 w-2 rounded-full bg-guinee-vert" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold">SIGEP — Portail citoyen</span>
                <span className="text-xs text-primary-foreground/60">
                  Ministère de l&apos;Éducation Nationale et de l&apos;Alphabétisation
                </span>
              </div>
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-primary-foreground/20 px-3 py-1.5 text-sm font-medium hover:bg-primary-foreground/10"
            >
              Espace agents
            </Link>
          </div>
          <nav className="flex flex-wrap gap-1.5">
            {NAV.map((item) => {
              const Icone = item.icone;
              const actif = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    actif
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "text-primary-foreground/70 hover:bg-primary-foreground/10"
                  )}
                >
                  <Icone className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
