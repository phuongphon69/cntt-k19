// lib/vietnamese/fuzzy.ts
import { normalizeVietnameseNameWithoutAccent, getVietnameseNameTokens } from "./normalize";

/**
 * Standard Levenshtein distance between two strings
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity between 0 and 1 using Levenshtein distance
 */
export function stringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Compare two Vietnamese names and calculate a confidence score (0 to 100).
 * Handles:
 * - Exact full name (with or without accents)
 * - Last name + First name variations
 * - Extra tokens / noise
 * - Date of Birth match bonus
 */
export function calculateNameMatchScore(
  studentName: string,
  queryName: string,
  studentDob?: string,
  extractedDob?: string
): number {
  const sNorm = normalizeVietnameseNameWithoutAccent(studentName);
  const qNorm = normalizeVietnameseNameWithoutAccent(queryName);

  if (!sNorm || !qNorm) return 0;

  // 1. Exact match without accents
  if (sNorm === qNorm) {
    return 100;
  }

  const sTokens = getVietnameseNameTokens(studentName);
  const qTokens = getVietnameseNameTokens(queryName);

  // 2. All student tokens contained in query or vice versa
  const sInQ = sTokens.every((t) => qTokens.includes(t));
  const qInS = qTokens.every((t) => sTokens.includes(t));

  if (sInQ || qInS) {
    let score = 95;
    // If DOB matches, solid 99
    if (studentDob && extractedDob && isSameDob(studentDob, extractedDob)) {
      score = 99;
    }
    return score;
  }

  // 3. Check First Name (last token in Vietnamese) match + partial other tokens
  const sFirstName = sTokens[sTokens.length - 1];
  const qFirstName = qTokens[qTokens.length - 1];

  let tokenMatchCount = 0;
  for (const t of sTokens) {
    if (qTokens.includes(t)) {
      tokenMatchCount++;
    }
  }

  const tokenRatio = tokenMatchCount / Math.max(sTokens.length, qTokens.length);

  // Levenshtein similarity on normalized strings
  const stringSim = stringSimilarity(sNorm, qNorm);

  // Weighted score
  let score = (tokenRatio * 0.6 + stringSim * 0.4) * 100;

  // If first name doesn't match at all, penalize
  if (sFirstName && qFirstName && sFirstName !== qFirstName && stringSimilarity(sFirstName, qFirstName) < 0.7) {
    score = Math.min(score, 60);
  }

  // If DOB matches, boost score significantly
  if (studentDob && extractedDob && isSameDob(studentDob, extractedDob)) {
    score = Math.min(100, score + 25);
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Check if two date strings represent the same date (e.g. 02/12/1985 vs 02.12.1985 or 2/12/1985)
 */
export function isSameDob(dob1?: string, dob2?: string): boolean {
  if (!dob1 || !dob2) return false;
  const clean1 = dob1.replace(/[^0-9]/g, "");
  const clean2 = dob2.replace(/[^0-9]/g, "");
  if (!clean1 || !clean2) return false;

  if (clean1 === clean2) return true;

  // Parse day, month, year
  const p1 = dob1.split(/[/.-]/).map((x) => parseInt(x, 10));
  const p2 = dob2.split(/[/.-]/).map((x) => parseInt(x, 10));

  if (p1.length >= 3 && p2.length >= 3) {
    return p1[0] === p2[0] && p1[1] === p2[1] && p1[2] === p2[2];
  }
  return false;
}
