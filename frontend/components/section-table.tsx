import { ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectNatif } from "@/components/ui/select-natif";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Colonne<T> = { label: string; rendu: (item: T) => React.ReactNode };

const TAILLES_PAGE = [10, 25, 50, 100];

/** Numéros de page à afficher, avec des "…" pour les longues listes (ex. 14
 * pages de sous-préfectures) — toujours la 1ère, la dernière, et une fenêtre
 * autour de la page courante. */
function pagesAffichees(page: number, totalPages: number): (number | "…")[] {
  const pages: (number | "…")[] = [1];
  const gauche = Math.max(2, page - 1);
  const droite = Math.min(totalPages - 1, page + 1);

  if (gauche > 2) pages.push("…");
  for (let p = gauche; p <= droite; p++) pages.push(p);
  if (droite < totalPages - 1) pages.push("…");
  if (totalPages > 1) pages.push(totalPages);

  return pages;
}

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
  pageSize,
  onPageSizeChange,
  total,
}: {
  titre: string;
  items: T[];
  chargement: boolean;
  erreur?: string | null;
  colonnes: Colonne<T>[];
  actionsEnTete?: React.ReactNode;
  /** Barre de recherche/pastilles de filtre, affichée sous le titre. */
  filtres?: React.ReactNode;
  /** Pagination côté serveur (useRessourcePaginee) — fournir page/totalPages/onPageChange pour l'activer. */
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  /** Sélecteur "Afficher N par page" — fournir avec onPageSizeChange et total pour l'activer. */
  pageSize?: number;
  onPageSizeChange?: (taille: number) => void;
  total?: number;
}) {
  const paginationActive = onPageChange && page !== undefined && totalPages !== undefined;

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

        {paginationActive && (page as number) >= 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {onPageSizeChange && pageSize !== undefined && (
                <>
                  <span>Afficher</span>
                  <SelectNatif
                    value={String(pageSize)}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="h-8 w-16 py-0 text-xs"
                  >
                    {TAILLES_PAGE.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </SelectNatif>
                  <span>par page</span>
                </>
              )}
            </div>

            {total !== undefined && pageSize !== undefined && (
              <p className="text-xs text-muted-foreground">
                {total === 0
                  ? "0 résultat"
                  : `${(page! - 1) * pageSize + 1}–${Math.min(page! * pageSize, total)} sur ${total}`}
              </p>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange!(page! - 1)}
                disabled={page! <= 1}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Préc.
              </button>
              {pagesAffichees(page!, totalPages as number).map((p, i) =>
                p === "…" ? (
                  <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => onPageChange!(p)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors",
                      p === page
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => onPageChange!(page! + 1)}
                disabled={page! >= (totalPages as number)}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                Suiv.
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
