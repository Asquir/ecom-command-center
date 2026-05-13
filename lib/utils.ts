export function eur(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + " €";
}

export function pct(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(decimals) + "%";
}

export function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function cx(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
