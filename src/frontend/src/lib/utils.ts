import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── Currency helpers ─────────────────────────────────────────────────────

/** Convert cents (bigint) to EUR (number) */
export function centsToEur(cents: bigint): number {
  return Number(cents) / 100;
}

/** Convert EUR (number) to cents (bigint) */
export function eurToCents(eur: number): bigint {
  return BigInt(Math.round(eur * 100));
}

/** Format a number as EUR currency string */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Date / timestamp helpers ─────────────────────────────────────────────

/** Nanoseconds timestamp for the first millisecond of the given month */
export function getMonthStartTimestamp(month: number, year: number): bigint {
  const date = new Date(year, month - 1, 1, 0, 0, 0, 0);
  return BigInt(date.getTime()) * BigInt(1_000_000);
}

/** Nanoseconds timestamp for the last millisecond of the given month */
export function getMonthEndTimestamp(month: number, year: number): bigint {
  // Day 0 of next month = last day of current month
  const date = new Date(year, month, 0, 23, 59, 59, 999);
  return BigInt(date.getTime()) * BigInt(1_000_000);
}

// ── Month names (Croatian) ────────────────────────────────────────────────

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

/** Get Croatian month name by 0-indexed month number */
export function getMonthName(index: number): string {
  return MONTH_NAMES[index] ?? "";
}

/** Croatian month names for short labels */
export const CROATIAN_MONTHS = MONTH_NAMES;
