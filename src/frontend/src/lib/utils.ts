import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Currency conversion: backend stores amounts in cents (integer)
export function centsToEur(cents: bigint | number | undefined | null): number {
  if (cents === undefined || cents === null) return 0;
  const c = typeof cents === "bigint" ? Number(cents) : cents;
  return c / 100;
}

export function eurToCents(eur: number): bigint {
  return BigInt(Math.round(eur * 100));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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

export function getMonthName(monthIndex: number): string {
  return MONTH_NAMES[monthIndex] ?? "";
}

// Returns start-of-month timestamp in nanoseconds (ICP uses nanoseconds)
export function getMonthStartTimestamp(month: number, year: number): bigint {
  const date = new Date(year, month - 1, 1, 0, 0, 0, 0);
  return BigInt(date.getTime()) * BigInt(1_000_000);
}

// Returns end-of-month timestamp in nanoseconds (last millisecond of last day)
export function getMonthEndTimestamp(month: number, year: number): bigint {
  const date = new Date(year, month, 0, 23, 59, 59, 999);
  return BigInt(date.getTime()) * BigInt(1_000_000);
}

export function formatDate(timestampNs: bigint | number): string {
  const ms =
    typeof timestampNs === "bigint"
      ? Number(timestampNs) / 1_000_000
      : timestampNs / 1_000_000;
  return new Date(ms).toLocaleDateString("hr-HR");
}
