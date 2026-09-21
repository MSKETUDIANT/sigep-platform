import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Champ téléphone avec indicatif Guinée (+224) fixe — la valeur remontée par
 * onChange est le numéro local (chiffres uniquement), à préfixer par "+224"
 * au moment de l'envoi à l'API. */
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
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">
        +224
      </span>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        required={required}
        placeholder="6XX XX XX XX"
        className={cn("pl-12", className)}
      />
    </div>
  );
}

export function formaterTelephoneGuinee(local: string): string {
  return local ? `+224${local}` : "";
}
