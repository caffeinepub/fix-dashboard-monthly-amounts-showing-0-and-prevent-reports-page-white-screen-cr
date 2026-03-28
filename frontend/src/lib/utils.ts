import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Centralized currency conversion: Backend cents to EUR
 * Single source of truth for all amount conversions
 * @param amountInCents - Amount in cents (bigint or number)
 * @returns Amount in EUR as a number
 */
export function centsToEur(amountInCents: bigint | number): number {
  return Number(amountInCents) / 100;
}

/**
 * Centralized currency conversion: EUR to backend cents
 * Single source of truth for all amount conversions
 * @param amountInEur - Amount in EUR
 * @returns Amount in cents as a bigint
 */
export function eurToCents(amountInEur: number): bigint {
  return BigInt(Math.round(amountInEur * 100));
}

/**
 * Formats a number as Croatian currency (EUR)
 * Used ONLY for display, never for calculations
 * @param amount - The amount in EUR to format
 * @returns Formatted currency string with exactly 2 decimal places
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate month start timestamp aligned with backend logic
 * Backend: getTotalDaysFromEpoch(year, month, 1) * 24 * 60 * 60 * 1_000_000_000
 * @param month - Month (1-12)
 * @param year - Year
 * @returns Timestamp in nanoseconds (bigint)
 */
export function getMonthStartTimestamp(month: number, year: number): bigint {
  // Create date at start of month: day 1, 00:00:00.000 UTC
  const date = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  // Convert milliseconds to nanoseconds
  return BigInt(date.getTime() * 1000000);
}

/**
 * Calculate month end timestamp aligned with backend logic
 * Backend: (getTotalDaysFromEpoch(year, month, daysInMonth) + 1) * 24 * 60 * 60 * 1_000_000_000 - 1
 * @param month - Month (1-12)
 * @param year - Year
 * @returns Timestamp in nanoseconds (bigint)
 */
export function getMonthEndTimestamp(month: number, year: number): bigint {
  // Create date at start of next month, then subtract 1 millisecond to get end of current month
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const date = new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0, 0));
  // Subtract 1 millisecond and convert to nanoseconds, then add remaining nanoseconds to reach end of day
  return BigInt(date.getTime() * 1000000 - 1);
}

/**
 * Calculate year start timestamp
 * @param year - Year
 * @returns Timestamp in nanoseconds (bigint)
 */
export function getYearStartTimestamp(year: number): bigint {
  return getMonthStartTimestamp(1, year);
}

/**
 * Calculate year end timestamp
 * @param year - Year
 * @returns Timestamp in nanoseconds (bigint)
 */
export function getYearEndTimestamp(year: number): bigint {
  return getMonthEndTimestamp(12, year);
}

/**
 * Extract year from timestamp
 * @param timestamp - Timestamp in nanoseconds
 * @returns Year
 */
export function getYearFromTimestamp(timestamp: bigint): number {
  const dateMs = Number(timestamp) / 1000000;
  return new Date(dateMs).getUTCFullYear();
}

/**
 * Extract month from timestamp
 * @param timestamp - Timestamp in nanoseconds
 * @returns Month (1-12)
 */
export function getMonthFromTimestamp(timestamp: bigint): number {
  const dateMs = Number(timestamp) / 1000000;
  return new Date(dateMs).getUTCMonth() + 1;
}

/**
 * Croatian month names
 */
export const MONTH_NAMES = [
  'Siječanj',
  'Veljača',
  'Ožujak',
  'Travanj',
  'Svibanj',
  'Lipanj',
  'Srpanj',
  'Kolovoz',
  'Rujan',
  'Listopad',
  'Studeni',
  'Prosinac',
] as const;

/**
 * Get month name by index (0-11)
 */
export function getMonthName(monthIndex: number): string {
  return MONTH_NAMES[monthIndex] || '';
}

/**
 * Get month name by month number (1-12)
 */
export function getMonthNameByNumber(month: number): string {
  return MONTH_NAMES[month - 1] || '';
}
