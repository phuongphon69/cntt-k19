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

  // 1. Extract Date of Birth if present (formats: dd/mm/yyyy, dd.mm.yyyy, dd-mm-yyyy, /dd.m.yyyy, or dd.mm/dd/mm)
  let extractedDob: string | undefined = undefined;
  const dobRegex = /(?:sn|ns|sinh\s*ngày)?\s*[:.]?\s*(?:\/)?(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)/i;
  const dobMatch = text.match(dobRegex);
  if (dobMatch) {
    extractedDob = dobMatch[1].replace(/[.-]/g, "/");
    // Remove the DOB from name text
    text = text.replace(dobMatch[0], " ");
  }

  // 2. Remove ellipsis and OCR noise symbols / punctuation
  text = text.replace(/\.{2,}/g, " ");
  text = text.replace(/[©®™•ØÏöÖòỏỎ*#_+~^!@$%&=:;<>\"'\\\/|\[\]\(\)\{\}\-.,?]/g, " ");

  // 2b. Correct typical OCR character confusions within words (0 -> o, 1 -> l)
  text = text.replace(/([a-zA-ZÀ-ỹ])0([a-zA-ZÀ-ỹ])/g, "$1o$2");
  text = text.replace(/([a-zA-ZÀ-ỹ])1([a-zA-ZÀ-ỹ])/g, "$1l$2");

  // 3. Remove common Zoom labels / tags / device names / noise tokens
  const noisePatterns = [
    /\b(tôi|me|host|co-host|chủ trì|đồng chủ trì|guest|you|chủ tọa|thầy|cô)\b/gi,
    /\b(k\s*19\w*|cntt\w*|cnt|cđ|cd|lt|cq|vb2|khoa|lớp|lop)\b/gi,
    /\b(iphone\w*|samsung\w*|galaxy\w*|redmi\w*|xiaomi\w*|oppo\w*|ipad\w*|laptop\w*|pc|desktop)\b/gi,
    /\b(ch\s*\d+|z\s*\d+|zf|z4|z1|cam|mic)\b/gi,
    /\bk\d+\w*\b/gi,
    /\b(sn|ns|sinh\s*năm|năm\s*sinh)\b/gi,
  ];

  for (const pat of noisePatterns) {
    text = text.replace(pat, " ");
  }

  // 4. Remove leading numbers / brackets (STT e.g. "1 ", "(1 ", "[1 ", "01 ", "2 ")
  text = text.replace(/^\s*[(\[]?\s*\d+\s*[)\].,]?\s*/, " ");

  // 5. Clean whitespace before token check
  text = text.replace(/\s+/g, " ").trim();

  // 6. Repeatedly remove trailing noise codes/single letters/numbers (e.g. ' 5 A', ' Z4', ' Zf', ' Ö', ' x', ' 2', ' Zá')
  while (true) {
    const words = text.split(" ");
    if (words.length <= 2) break;
    const lastWord = words[words.length - 1];
    if (
      /^[a-zA-Z0-9]{1,2}$/.test(lastWord) ||
      /^\d+$/.test(lastWord) ||
      /^(z\d*|zf|zá|za|z4|cam|mic|x|a)$/i.test(lastWord)
    ) {
      words.pop();
      text = words.join(" ");
    } else {
      break;
    }
  }

  // 7. Strip leading Zoom avatar circle initials (1-3 letters) before real name
  // E.g. 'Po Pham Đinh Diện' -> 'Pham Đinh Diện', 'Mà Võ Trọng Tường' -> 'Võ Trọng Tường',
  // 'Dạ Đào Xuân Quế' -> 'Đào Xuân Quế', 'Lại Trình Đức Thịnh' -> 'Trình Đức Thịnh', 'BH Bùi Hong Quân' -> 'Bùi Hong Quân'
  const words = text.split(" ");
  if (words.length >= 3) {
    const familyNames = [
      "nguyen", "bui", "le", "hoang", "huynh", "tran", "pham", "trinh", "vo", "mai",
      "dao", "phan", "duong", "phung", "truong", "ngo", "vu", "dang", "dinh", "ha", "do", "doan", "ho", "ly", "luong", "ta", "thai"
    ];
    const secondWordNorm = removeVietnameseAccents(words[1]).toLowerCase();
    // If first word is short (<= 3 chars) and second word is a known Vietnamese family name
    if (words[0].length <= 3 && familyNames.includes(secondWordNorm)) {
      words.shift();
      text = words.join(" ");
    }
  }

  // 8. Normalize whitespace and name
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

    // Filter out common Zoom UI header/footer lines and non-name phrases
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
      lower.includes("phòng chờ") ||
      lower.includes("ảnh chụp") ||
      lower.includes("ảnh được cung cấp") ||
      lower.includes("giao diện trang web") ||
      lower.includes("vui lòng tải lên") ||
      lower.includes("không tìm thấy") ||
      lower.startsWith("we es") ||
      lower === "we es x"
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
