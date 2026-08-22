// lib/vietnamese/normalize.ts

/**
 * Remove Vietnamese tone marks / diacritics and convert to ASCII
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"));
}

/**
 * Normalize Vietnamese name with accents:
 * - Unicode normalization (NFC)
 * - Trim and collapse multiple spaces into single space
 * - Title case words properly
 */
export function normalizeVietnameseName(name: string): string {
  if (!name) return "";
  const cleaned = name
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\s]/gu, ""); // keep only letters and spaces

  return cleaned
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Normalize Vietnamese name without accents (lowercase, single spaced, no accents)
 * Perfect for matching:
 * "Nguyễn   Văn Chung", "NGUYỄN VĂN CHUNG", "nguyen van chung" -> "nguyen van chung"
 */
export function normalizeVietnameseNameWithoutAccent(name: string): string {
  if (!name) return "";
  const noAccent = removeVietnameseAccents(name);
  return noAccent
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract tokens/words from a Vietnamese name
 */
export function getVietnameseNameTokens(name: string): string[] {
  const normalized = normalizeVietnameseNameWithoutAccent(name);
  return normalized.split(" ").filter(Boolean);
}
