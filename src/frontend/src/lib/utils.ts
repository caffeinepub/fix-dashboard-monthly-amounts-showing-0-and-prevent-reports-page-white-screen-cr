import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function centsToEur(cents: bigint): number {
  return Number(cents) / 100;
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

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || "";
}

export function getMonthStartTimestamp(month: number, year: number): bigint {
  const date = new Date(year, month - 1, 1, 0, 0, 0, 0);
  return BigInt(date.getTime()) * BigInt(1_000_000);
}

export function getMonthEndTimestamp(month: number, year: number): bigint {
  const date = new Date(year, month, 0, 23, 59, 59, 999);
  return BigInt(date.getTime()) * BigInt(1_000_000);
}
