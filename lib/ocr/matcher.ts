// lib/ocr/matcher.ts
import { PublicStudent, OcrCandidate, OcrResultSummary, ZoomAlias, AttendanceValue } from "@/types";
import { parseZoomOcrText, ParsedZoomName } from "./zoom-parser";
import { calculateNameMatchScore } from "@/lib/vietnamese/fuzzy";
import { normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";

export interface MatchOptions {
  highThreshold?: number; // default 90
  reviewThreshold?: number; // default 75
  aliases?: ZoomAlias[];
  currentAttendanceValues?: Record<string, AttendanceValue>; // studentId -> current cell value (e.g. "P")
}

/**
 * Match parsed Zoom participants against the student roster
 */
export function matchZoomParticipants(
  parsedNames: ParsedZoomName[],
  students: PublicStudent[],
  options?: MatchOptions
): OcrResultSummary {
  const highThreshold = options?.highThreshold ?? 85;
  const reviewThreshold = options?.reviewThreshold ?? 65;
  const aliases = options?.aliases || [];
  const currentAttendance = options?.currentAttendanceValues || {};

  const candidates: OcrCandidate[] = [];
  const matchedStudentIds = new Set<string>();

  for (const item of parsedNames) {
    let bestScore = 0;
    let bestStudent: PublicStudent | undefined = undefined;
    let matchedByAlias = false;

    // 1. First check saved Aliases
    const itemNorm = normalizeVietnameseNameWithoutAccent(item.original);
    const matchedAlias = aliases.find(
      (a) =>
        a.normalizedAlias === itemNorm ||
        a.normalizedAlias === item.normalizedNoAccent ||
        itemNorm.includes(a.normalizedAlias)
    );

    if (matchedAlias) {
      const stu = students.find((s) => s.id === matchedAlias.studentId);
      if (stu) {
        bestScore = 100;
        bestStudent = stu;
        matchedByAlias = true;
      }
    }

    // 2. If no direct alias, perform fuzzy matching against roster
    if (!bestStudent) {
      for (const student of students) {
        // Match using cleaned name
        let score = calculateNameMatchScore(
          student.fullName,
          item.cleanedName,
          student.dateOfBirth,
          item.extractedDob
        );

        // Also evaluate against raw original text if score isn't already high
        if (score < 90 && item.original !== item.cleanedName) {
          const rawScore = calculateNameMatchScore(
            student.fullName,
            item.original,
            student.dateOfBirth,
            item.extractedDob
          );
          if (rawScore > score) {
            score = rawScore;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestStudent = student;
        }
      }
    }

    let status: "MATCHED" | "NEEDS_REVIEW" | "UNMATCHED" = "UNMATCHED";
    let matchedStudentToAssign: PublicStudent | undefined = undefined;

    if (bestScore >= highThreshold) {
      status = "MATCHED";
      matchedStudentToAssign = bestStudent;
    } else if (bestScore >= reviewThreshold) {
      status = "NEEDS_REVIEW";
      matchedStudentToAssign = bestStudent;
    } else {
      status = "UNMATCHED";
      matchedStudentToAssign = undefined;
    }

    // Check conflict with existing cell value
    let hasConflict = false;
    let currentValue: AttendanceValue = "";
    if (matchedStudentToAssign && currentAttendance[matchedStudentToAssign.id]) {
      currentValue = currentAttendance[matchedStudentToAssign.id];
      // Conflict if current value is already set (e.g. "P", "M") and not empty or "X"
      if (currentValue && currentValue !== "X") {
        hasConflict = true;
      }
    }

    if (matchedStudentToAssign && (status === "MATCHED" || status === "NEEDS_REVIEW")) {
      matchedStudentIds.add(matchedStudentToAssign.id);
    }

    candidates.push({
      rawText: item.original,
      cleanedName: item.cleanedName,
      extractedDob: item.extractedDob,
      matchedStudent: matchedStudentToAssign,
      confidenceScore: bestScore,
      status,
      matchedByAlias,
      currentValue,
      hasConflict,
      resolvedValue: "X",
      confirmed: status === "MATCHED" && !hasConflict,
    });
  }

  // 3. Detect duplicate student matches across candidates
  // Group candidates matching the same student ID
  const studentMatchMap = new Map<string, number[]>(); // studentId -> candidate indices
  candidates.forEach((c, idx) => {
    if (c.matchedStudent?.id) {
      const sId = c.matchedStudent.id;
      if (!studentMatchMap.has(sId)) {
        studentMatchMap.set(sId, []);
      }
      studentMatchMap.get(sId)!.push(idx);
    }
  });

  let duplicateCount = 0;
  studentMatchMap.forEach((indices) => {
    if (indices.length > 1) {
      // Find candidate with the highest confidence score
      let bestIdx = indices[0];
      let maxScore = candidates[indices[0]].confidenceScore;
      for (const idx of indices) {
        if (candidates[idx].confidenceScore > maxScore) {
          maxScore = candidates[idx].confidenceScore;
          bestIdx = idx;
        }
      }

      // Mark all other indices as duplicates with warnings
      for (const idx of indices) {
        if (idx !== bestIdx) {
          candidates[idx].isDuplicate = true;
          candidates[idx].duplicateWarning = `Trùng học viên "${candidates[idx].matchedStudent?.fullName}" (dòng khác có độ khớp cao hơn: ${maxScore}%)`;
          candidates[idx].status = "NEEDS_REVIEW";
          candidates[idx].confirmed = false; // Never auto-confirm duplicate candidates!
          duplicateCount++;
        } else {
          candidates[idx].isDuplicate = true;
          candidates[idx].duplicateWarning = `Có ${indices.length - 1} dòng khác cùng khớp với học viên này`;
        }
      }
    }
  });

  // Find all students in class not present in the Zoom OCR list
  const unmatchedStudents = students.filter((s) => !matchedStudentIds.has(s.id));

  const matchedCount = candidates.filter((c) => c.status === "MATCHED").length;
  const reviewCount = candidates.filter((c) => c.status === "NEEDS_REVIEW").length;
  const unmatchedCount = candidates.filter((c) => c.status === "UNMATCHED").length;

  return {
    totalExtracted: candidates.length,
    matchedCount,
    reviewCount,
    unmatchedCount,
    duplicateCount,
    candidates,
    unmatchedStudents,
  };
}

/**
 * Process multiple OCR text outputs (from multiple Zoom screenshots) and combine
 */
export function processMultipleOcrOutputs(
  ocrTexts: string[],
  students: PublicStudent[],
  options?: MatchOptions
): OcrResultSummary {
  const allParsed: ParsedZoomName[] = [];
  const seenNames = new Set<string>();

  for (const text of ocrTexts) {
    const parsedList = parseZoomOcrText(text);
    for (const p of parsedList) {
      if (!seenNames.has(p.normalizedNoAccent)) {
        seenNames.add(p.normalizedNoAccent);
        allParsed.push(p);
      }
    }
  }

  return matchZoomParticipants(allParsed, students, options);
}
