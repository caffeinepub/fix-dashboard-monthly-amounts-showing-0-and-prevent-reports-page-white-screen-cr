import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const MONTH_NAMES = [
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

export const CROATIAN_MONTHS = MONTH_NAMES;

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? `Mjesec ${month}`;
}

export function centsToEur(cents: bigint | number): number {
  const n = typeof cents === "bigint" ? Number(cents) : cents;
  return n / 100;
}

export function eurToCents(eur: number): bigint {
  return BigInt(Math.round(eur * 100));
}

export function formatCurrency(cents: bigint | number): string {
  const eur = centsToEur(cents);
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
  }).format(eur);
}

export function getMonthStartTimestamp(year: number, month: number): bigint {
  const date = new Date(year, month - 1, 1, 0, 0, 0, 0);
  return BigInt(date.getTime()) * BigInt(1_000_000);
}

export function getMonthEndTimestamp(year: number, month: number): bigint {
  const date = new Date(year, month, 0, 23, 59, 59, 999);
  return BigInt(date.getTime()) * BigInt(1_000_000);
}
