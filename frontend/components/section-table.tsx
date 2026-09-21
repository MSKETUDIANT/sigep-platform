import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type Colonne<T> = { label: string; rendu: (item: T) => React.ReactNode };

export function SectionTable<T extends { id: string }>({
  titre,
  items,
  chargement,
  erreur,
  colonnes,
  actionsEnTete,
  filtres,
}: {
  titre: string;
  items: T[];
  chargement: boolean;
  erreur?: string | null;
  colonnes: Colonne<T>[];
  actionsEnTete?: React.ReactNode;
  /** Barre de recherche/pastilles de filtre, affichée sous le titre. */
  filtres?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{titre}</CardTitle>
        {actionsEnTete}
      </CardHeader>
      <CardContent>
        {filtres && <div className="mb-4 flex flex-wrap items-center gap-3">{filtres}</div>}
        {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        {chargement ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun élément pour l&apos;instant.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {colonnes.map((c) => (
                  <TableHead key={c.label}>{c.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  {colonnes.map((c) => (
                    <TableCell key={c.label}>{c.rendu(item)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
