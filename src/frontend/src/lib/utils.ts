import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Currency utilities
export function eurToCents(eur: number): bigint {
  return BigInt(Math.round(eur * 100));
}

export function centsToEur(cents: bigint | number): number {
  const c = typeof cents === "bigint" ? Number(cents) : cents;
  return c / 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Month utilities
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

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

// Timestamp utilities (nanoseconds for ICP)
export function getMonthStartTimestamp(month: number, year: number): bigint {
  const date = new Date(year, month - 1, 1, 0, 0, 0, 0);
  return BigInt(date.getTime()) * BigInt(1_000_000);
}

export function getMonthEndTimestamp(month: number, year: number): bigint {
  const date = new Date(year, month, 0, 23, 59, 59, 999);
  return BigInt(date.getTime()) * BigInt(1_000_000);
}
