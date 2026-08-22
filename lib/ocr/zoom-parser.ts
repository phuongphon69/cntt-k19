// lib/ocr/zoom-parser.ts
import { normalizeVietnameseName, removeVietnameseAccents } from "@/lib/vietnamese/normalize";

export interface ParsedZoomName {
  original: string;
  cleanedName: string;
  normalizedNoAccent: string;
  extractedDob?: string;
}

/**
 * Clean Zoom participant display string, extracting student name and any embedded date of birth.
 */
export function parseZoomDisplayName(rawLine: string): ParsedZoomName {
  if (!rawLine) {
    return {
      original: "",
      cleanedName: "",
      normalizedNoAccent: "",
    };
  }

  let text = rawLine.trim();

  // 1. Extract Date of Birth if present (formats: dd.mm.yyyy, dd/mm/yyyy, dd-mm-yyyy, d/m/yyyy)
  let extractedDob: string | undefined = undefined;
  const dobRegex = /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/;
  const dobMatch = text.match(dobRegex);
  if (dobMatch) {
    extractedDob = dobMatch[1].replace(/[.-]/g, "/");
    // Remove the DOB from name text
    text = text.replace(dobMatch[0], " ");
  }

  // 2. Replace separators and punctuation: -, _, |, :, ;, (, ), [, ] with spaces
  text = text.replace(/[-_|:;()\[\]{}+*#]/g, " ");

  // 3. Remove common Zoom labels / tags / noise tokens
  const noisePatterns = [
    /\bK\s*19\b/gi,
    /\bCNTT\b/gi,
    /\bCĐ\b/gi,
    /\bCD\b/gi,
    /\bLT\b/gi,
    /\bCQ\b/gi,
    /\bHOST\b/gi,
    /\bCO-HOST\b/gi,
    /\bME\b/gi,
    /\bYOU\b/gi,
  ];

  for (const pat of noisePatterns) {
    text = text.replace(pat, " ");
  }

  // 4. Remove leading/trailing numbers (e.g. STT like "1.", "01", etc.)
  text = text.replace(/^\s*\d+[\s.]*/, " ");

  // 5. Remove any trailing dangling numbers
  text = text.replace(/\s+\d+\s*$/, " ");

  // 6. Normalize whitespace and name
  const cleanedName = normalizeVietnameseName(text);
  const normalizedNoAccent = removeVietnameseAccents(cleanedName).toLowerCase().trim();

  return {
    original: rawLine,
    cleanedName,
    normalizedNoAccent,
    extractedDob,
  };
}

/**
 * Parse an entire block of text from OCR (multiple lines / participant list)
 */
export function parseZoomOcrText(ocrText: string): ParsedZoomName[] {
  if (!ocrText) return [];

  const lines = ocrText.split(/\r?\n/);
  const results: ParsedZoomName[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 2) continue;

    // Filter out common Zoom UI header/footer lines
    const lower = trimmed.toLowerCase();
    if (
      lower.includes("participants") ||
      lower.includes("người tham gia") ||
      lower.includes("invite") ||
      lower.includes("mute all") ||
      lower.includes("tắt tiếng tất cả") ||
      lower.includes("search") ||
      lower.includes("tìm kiếm") ||
      lower.includes("waiting room") ||
      lower.includes("phòng chờ")
    ) {
      continue;
    }

    const parsed = parseZoomDisplayName(trimmed);
    if (parsed.cleanedName.length >= 2 && !seen.has(parsed.normalizedNoAccent)) {
      seen.add(parsed.normalizedNoAccent);
      results.push(parsed);
    }
  }

  return results;
}
