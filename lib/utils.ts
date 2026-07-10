import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-devises Awder
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENCIES = {
  XOF: { symbol: 'FCFA', rate: 1, name: 'Franc CFA' },
  GNF: { symbol: 'FG', rate: 14.5, name: 'Franc Guinéen' },
  GHS: { symbol: 'GH₵', rate: 0.025, name: 'Cedi' },
  NGN: { symbol: '₦', rate: 2.5, name: 'Naira' },
  USD: { symbol: '$', rate: 0.0016, name: 'USD' },
  EUR: { symbol: '€', rate: 0.0015, name: 'EUR' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

/**
 * Formate un prix en XOF.
 *  - `formatPrice(1500)` → "1 500"          (juste le nombre, pour usage `} F`)
 *  - `formatPrice(1500, 'XOF')` → "1 500 FCFA"  (avec symbole, pour sélecteur devise)
 *  - `formatPrice(1500, 'EUR')` → "2 €"         (converti + symbole)
 */
export function formatPrice(priceXof: number, code?: CurrencyCode): string {
  if (!code) {
    return priceXof.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  const c = CURRENCIES[code] ?? CURRENCIES.XOF;
  const converted = Math.round(priceXof * c.rate);
  return `${converted.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${c.symbol}`;
}
