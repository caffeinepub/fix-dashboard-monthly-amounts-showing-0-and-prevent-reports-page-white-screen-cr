import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Financial utility functions
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
  return MONTH_NAMES[month] ?? "";
}

/** Convert cents (bigint or number) to EUR as a float */
export function centsToEur(cents: bigint | number): number {
  return Number(cents) / 100;
}

/** Convert EUR float to cents as bigint */
export function eurToCents(eur: number): bigint {
  return BigInt(Math.round(eur * 100));
}

/** Format a number as Croatian currency string */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Get timestamp (nanoseconds) for start of month */
export function getMonthStartTimestamp(year: number, month: number): bigint {
  const date = new Date(year, month, 1, 0, 0, 0, 0);
  return BigInt(date.getTime()) * BigInt(1_000_000);
}

/** Get timestamp (nanoseconds) for end of month */
export function getMonthEndTimestamp(year: number, month: number): bigint {
  const date = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return BigInt(date.getTime()) * BigInt(1_000_000);
}

/** Get timestamp (nanoseconds) for start of year */
export function getYearStartTimestamp(year: number): bigint {
  return getMonthStartTimestamp(year, 0);
}

/** Get timestamp (nanoseconds) for end of year */
export function getYearEndTimestamp(year: number): bigint {
  return getMonthEndTimestamp(year, 11);
}
