"use client";

import dynamic from "next/dynamic";

// Leaflet manipule directement le DOM (window/document) — le composant doit
// être exclu du rendu serveur, sinon le build échoue.
const CarteEcoles = dynamic(() => import("@/components/carte-ecoles"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] w-full items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
      Chargement de la carte...
    </div>
  ),
});

export default function CartePortailPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Carte interactive des écoles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Écoles géolocalisées sur l&apos;ensemble du territoire de la République de Guinée.
        </p>
      </div>
      <CarteEcoles />
    </div>
  );
}
