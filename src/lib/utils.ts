import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format large numbers with K/M/B suffixes
 * @param value - Number to format
 * @param decimals - Number of decimal places (default 1)
 * @returns Formatted string (e.g., "1.2K", "3.4M")
 */
export function formatNumber(value: number, decimals: number = 1): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(decimals)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(decimals)}K`;
  return Math.round(value).toString();
}

/**
 * Format percentage with optional decimal places
 * @param value - Number to format as percentage
 * @param decimals - Number of decimal places (default 1)
 * @returns Formatted percentage string (e.g., "42.5%")
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date string for display
 * @param dateStr - Date string or null
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string or "—" if invalid
 */
export function formatDate(
  dateStr: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }
): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", options);
  } catch {
    return "—";
  }
}

/**
 * Calculate days between two dates
 * @param date1 - First date string
 * @param date2 - Second date string
 * @returns Number of days between dates, or null if invalid
 */
export function daysBetween(date1: string | null, date2: string | null): number | null {
  if (!date1 || !date2) return null;
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    return Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
