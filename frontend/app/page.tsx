import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-primary px-6 text-center text-primary-foreground">
      <div className="flex gap-2">
        <span className="h-3 w-3 rounded-full bg-guinee-rouge" />
        <span className="h-3 w-3 rounded-full bg-guinee-jaune" />
        <span className="h-3 w-3 rounded-full bg-guinee-vert" />
      </div>
      <h1 className="text-4xl font-bold">SIGEP</h1>
      <p className="max-w-md text-primary-foreground/80">
        Système Intégré de Gestion de l&apos;Enseignement Préuniversitaire
      </p>
      <p className="max-w-md text-sm text-primary-foreground/60">
        République de Guinée — Ministère de l&apos;Éducation Nationale et de l&apos;Alphabétisation
      </p>
      <Button asChild variant="secondary" size="lg">
        <a href="/login">Se connecter</a>
      </Button>
    </main>
  );
}
