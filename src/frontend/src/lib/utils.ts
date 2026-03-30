import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── Currency helpers ─────────────────────────────────────────────────────────
// Backend stores amounts as integer cents (bigint). 1 EUR = 100 cents.

export function centsToEur(cents: bigint | number): number {
  const n = typeof cents === "bigint" ? Number(cents) : cents;
  return n / 100;
}

export function eurToCents(eur: number): bigint {
  return BigInt(Math.round(eur * 100));
}

export function formatCurrency(eur: number): string {
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(eur);
}

// ── Month helpers ─────────────────────────────────────────────────────────────

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

/** @deprecated Use MONTH_NAMES directly */
export const CROATIAN_MONTHS = MONTH_NAMES;

export function getMonthName(month: number): string {
  return MONTH_NAMES[(month - 1) % 12];
}

// ── Timestamp helpers (nanoseconds, as used by ICP backend) ──────────────────

export function getMonthStartTimestamp(month: number, year: number): bigint {
  const d = new Date(year, month - 1, 1, 0, 0, 0, 0);
  return BigInt(d.getTime()) * BigInt(1_000_000);
}

export function getMonthEndTimestamp(month: number, year: number): bigint {
  const d = new Date(year, month, 0, 23, 59, 59, 999);
  return BigInt(d.getTime()) * BigInt(1_000_000);
}
