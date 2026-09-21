import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const LONGUEUR_NUMERO = 9;

/** Champ téléphone avec indicatif Guinée (+224) fixe — la valeur remontée par
 * onChange est le numéro local (9 chiffres, ex. 620000000), à préfixer par
 * "+224" au moment de l'envoi à l'API. La saisie est bornée à 9 chiffres
 * (longueur d'un numéro mobile guinéen) : impossible de saisir un numéro
 * plus long, ni un caractère non numérique. */
export function InputTelephone({
  id,
  value,
  onChange,
  required,
  className,
}: {
  id: string;
  value: string;
  onChange: (valeur: string) => void;
  required?: boolean;
  className?: string;
}) {
  const incomplet = value.length > 0 && value.length < LONGUEUR_NUMERO;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">
          +224
        </span>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, "").slice(0, LONGUEUR_NUMERO))}
          required={required}
          placeholder="6XX XX XX XX"
          maxLength={LONGUEUR_NUMERO}
          pattern={`[0-9]{${LONGUEUR_NUMERO}}`}
          title={`Numéro guinéen à ${LONGUEUR_NUMERO} chiffres, sans le +224`}
          className={cn("pl-12", incomplet && "border-accent", className)}
        />
      </div>
      {incomplet && (
        <p className="text-xs text-accent-foreground">
          {value.length}/{LONGUEUR_NUMERO} chiffres — un numéro guinéen en compte {LONGUEUR_NUMERO}.
        </p>
      )}
    </div>
  );
}

export function formaterTelephoneGuinee(local: string): string {
  return local ? `+224${local}` : "";
}
