import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIGEP",
  description: "Système Intégré de Gestion de l'Enseignement Préuniversitaire",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0d3b2e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
