import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Financial utility functions
// NOTE: amounts are stored as raw integer EUR values (not cents)
// centsToEur and eurToCents are kept for API compatibility but do NOT apply /100 or *100
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

export function centsToEur(cents: bigint | number): number {
  // Stored values are raw EUR integers, no division needed
  return typeof cents === "bigint" ? Number(cents) : cents;
}

export function eurToCents(eur: number): bigint {
  // Store as raw EUR integer, no multiplication needed
  return BigInt(Math.round(eur));
}

export function formatCurrency(amount: bigint | number): string {
  const value = typeof amount === "bigint" ? Number(amount) : amount;
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

// Note: getMonthStartTimestamp(month, year) - month first, year second
export function getMonthStartTimestamp(month: number, year: number): bigint {
  return BigInt(new Date(year, month - 1, 1).getTime()) * 1_000_000n;
}

export function getMonthEndTimestamp(month: number, year: number): bigint {
  return (
    BigInt(new Date(year, month, 0, 23, 59, 59, 999).getTime()) * 1_000_000n
  );
}

export function getYearStartTimestamp(year: number): bigint {
  return BigInt(new Date(year, 0, 1).getTime()) * 1_000_000n;
}

export function getYearEndTimestamp(year: number): bigint {
  return BigInt(new Date(year, 11, 31, 23, 59, 59, 999).getTime()) * 1_000_000n;
}

export function timestampToDate(nanos: bigint | number): Date {
  const ms =
    typeof nanos === "bigint" ? Number(nanos) / 1_000_000 : nanos / 1_000_000;
  return new Date(ms);
}

export function dateToTimestamp(date: Date): bigint {
  return BigInt(date.getTime()) * 1_000_000n;
}
