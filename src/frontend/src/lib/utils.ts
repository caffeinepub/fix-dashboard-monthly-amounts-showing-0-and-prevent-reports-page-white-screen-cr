import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Croatian month names (0-indexed array, use month-1 as index)
// ---------------------------------------------------------------------------
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

/** Alias kept for backwards compatibility with DataAnalysis.tsx */
export const CROATIAN_MONTHS = MONTH_NAMES;

/**
 * Returns the Croatian month name for a given 1-indexed month (1–12).
 */
export function getMonthName(month: number): string {
  if (month < 1 || month > 12) return "";
  return MONTH_NAMES[month - 1];
}

// ---------------------------------------------------------------------------
// Currency helpers
// Amounts in the backend are stored as BigInt cents (1 EUR = 100 cents).
// ---------------------------------------------------------------------------

/**
 * Converts cents (BigInt or number) to a plain EUR number.
 */
export function centsToEur(cents: bigint | number): number {
  if (typeof cents === "bigint") {
    return Number(cents) / 100;
  }
  return cents / 100;
}

/**
 * Converts a EUR number to cents as BigInt.
 */
export function eurToCents(eur: number): bigint {
  return BigInt(Math.round(eur * 100));
}

/**
 * Formats a number as a Croatian EUR currency string.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Timestamp helpers
// ICP stores timestamps in nanoseconds (BigInt).
// ---------------------------------------------------------------------------

/**
 * Returns the start of a month as a nanosecond BigInt timestamp.
 * @param month - 1-indexed (1 = January, 12 = December)
 * @param year  - full year e.g. 2024
 */
export function getMonthStartTimestamp(month: number, year: number): bigint {
  const d = new Date(year, month - 1, 1, 0, 0, 0, 0);
  return BigInt(d.getTime()) * BigInt(1_000_000);
}

/**
 * Returns the end of a month (last millisecond) as a nanosecond BigInt timestamp.
 * @param month - 1-indexed (1 = January, 12 = December)
 * @param year  - full year e.g. 2024
 */
export function getMonthEndTimestamp(month: number, year: number): bigint {
  // new Date(year, month, 0) gives the last day of `month`
  const d = new Date(year, month, 0, 23, 59, 59, 999);
  return BigInt(d.getTime()) * BigInt(1_000_000);
}
