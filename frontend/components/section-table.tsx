import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  page,
  totalPages,
  onPageChange,
}: {
  titre: string;
  items: T[];
  chargement: boolean;
  erreur?: string | null;
  colonnes: Colonne<T>[];
  actionsEnTete?: React.ReactNode;
  /** Barre de recherche/pastilles de filtre, affichée sous le titre. */
  filtres?: React.ReactNode;
  /** Pagination côté serveur (useRessourcePaginee) — fournir les trois pour afficher les contrôles. */
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
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

        {onPageChange && page !== undefined && totalPages !== undefined && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Page {page} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Précédent
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Suivant
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
