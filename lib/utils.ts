import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateVN(dateStr?: string | Date): string {
  if (!dateStr) return "";
  if (typeof dateStr === "string") {
    // If dd/mm/yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  }
  const day = String(dateStr.getDate()).padStart(2, "0");
  const month = String(dateStr.getMonth() + 1).padStart(2, "0");
  const year = dateStr.getFullYear();
  return `${day}/${month}/${year}`;
}

export function parseVNDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();

  // 1. Match dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy (e.g. from "11/05/2026" or "02/02/2026 và 27/03/2026")
  const match = str.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    const date = new Date(year, month, day, 0, 0, 0, 0);
    if (!isNaN(date.getTime())) return date;
  }

  // 2. Match ISO yyyy-mm-dd
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const date = new Date(year, month, day, 0, 0, 0, 0);
    if (!isNaN(date.getTime())) return date;
  }

  // DO NOT fallback to new Date(str) because "12" or "Buổi 2" will be incorrectly parsed as month in 2001
  return null;
}
