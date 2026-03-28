import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Currency conversion: backend stores amounts in cents (integers)
export function centsToEur(cents: bigint | number): number {
  const n = typeof cents === "bigint" ? Number(cents) : cents;
  return n / 100;
}

export function eurToCents(eur: number): number {
  return Math.round(eur * 100);
}

export function eurToCentsBigInt(eur: number): bigint {
  return BigInt(Math.round(eur * 100));
}

export function formatCurrency(eur: number | bigint): string {
  const n = typeof eur === "bigint" ? Number(eur) : eur;
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export const CROATIAN_MONTHS = [
  "Siječanj",
  "Veljača",
  "Ožujak",
  "Travanj",
  "Svibanj",
  "Lipanj",
  "Srpanj",
  "Kolovoz",
  "Rujan",
  "Listopad",
  "Studeni",
  "Prosinac",
];

export function getMonthName(monthIndex: number): string {
  return CROATIAN_MONTHS[monthIndex] ?? `Mjesec ${monthIndex + 1}`;
}

// Alias for backward compatibility
export const MONTH_NAMES = CROATIAN_MONTHS;
