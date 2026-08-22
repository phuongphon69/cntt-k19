// lib/google-sheets/writer.ts
import { getGoogleSheetsClient, getSpreadsheetId } from "./client";
import { invalidateCache, updateSyncTimestamp } from "./cache";
import { fetchSheetMatrix, getStudents, getAttendanceSheetData } from "./reader";
import { AttendanceValue, Student } from "@/types";
import { normalizeVietnameseNameWithoutAccent } from "@/lib/vietnamese/normalize";

function columnIndexToLetter(index: number): string {
  let temp = index;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Write attendance values for a specific round of a subject session into Google Sheets
 */
export async function writeAttendanceRound(
  sheetName: string,
  sessionDate: string,
  roundNumber: 1 | 2 | 3,
  updates: { studentId: string; value: AttendanceValue }[],
  adminUser = "admin"
): Promise<{ success: boolean; updatedCount: number; message: string }> {
  const spreadsheetId = getSpreadsheetId();
  const client = getGoogleSheetsClient();

  const parsed = await getAttendanceSheetData(sheetName);
  if (!parsed) {
    throw new Error(`Sheet ${sheetName} not found or unreadable`);
  }

  // Find the session matching date
  const session = parsed.sessions.find(
    (s) => s.date === sessionDate || s.date.includes(sessionDate) || sessionDate.includes(s.date)
  );

  if (!session) {
    throw new Error(`Session date ${sessionDate} not found in sheet ${sheetName}`);
  }

  // Calculate target column index (0-based)
  // session.colStart = LẦN 1 (0 offset), LẦN 2 (offset +1), LẦN 3 (offset +2)
  const targetColIdx = session.colStart + (roundNumber - 1);
  const targetColLetter = columnIndexToLetter(targetColIdx);

  // Read current sheet matrix to find exact row for each student
  const rawMatrix = await fetchSheetMatrix(sheetName);

  const valueRanges: { range: string; values: any[][] }[] = [];
  let updatedCount = 0;

  for (const update of updates) {
    // Find row index (1-based for A1 notation)
    let foundRow = -1;
    for (let r = 3; r < rawMatrix.length; r++) {
      const row = rawMatrix[r];
      if (!row || !row[1]) continue;
      const rowStudentId = normalizeVietnameseNameWithoutAccent(String(row[1])).replace(/\s+/g, "_");
      if (rowStudentId === update.studentId) {
        foundRow = r + 1; // 1-based index
        break;
      }
    }

    if (foundRow !== -1) {
      const cellRange = `'${sheetName}'!${targetColLetter}${foundRow}`;
      valueRanges.push({
        range: cellRange,
        values: [[update.value]],
      });
      updatedCount++;
    }
  }

  if (valueRanges.length > 0 && client) {
    await client.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: valueRanges,
      },
    });
  }

  // Invalidate cache
  invalidateCache();
  updateSyncTimestamp();

  // Log audit
  await logAuditEvent("WRITE_ATTENDANCE", sheetName, sessionDate, {
    roundNumber,
    updatedCount,
    adminUser,
  });

  return {
    success: true,
    updatedCount,
    message: `Đã cập nhật ${updatedCount} học viên cho Lần ${roundNumber} (${sessionDate}) môn ${sheetName}`,
  };
}

/**
 * Create a new subject sheet from template "MẪU MÔN HỌC" and populate active roster
 */
export async function createNewSubjectSheet(
  subjectName: string,
  teacherName = "",
  totalSessions = 12,
  adminUser = "admin"
): Promise<{ success: boolean; sheetName: string }> {
  const spreadsheetId = getSpreadsheetId();
  const client = getGoogleSheetsClient();
  const newSheetName = `DD ${subjectName.toUpperCase().trim()}`;

  const activeStudents = await getStudents();

  if (client) {
    // 1. Check if sheet exists or duplicate template
    const meta = await client.spreadsheets.get({ spreadsheetId });
    const templateSheet = meta.data.sheets?.find(
      (s) => s.properties?.title?.trim().toUpperCase() === "MẪU MÔN HỌC"
    );

    let newSheetId: number | undefined;

    if (templateSheet && typeof templateSheet.properties?.sheetId === "number") {
      const templateSheetId: number = templateSheet.properties.sheetId;
      // Duplicate template
      const duplicateRes = await client.spreadsheets.sheets.copyTo({
        spreadsheetId,
        sheetId: templateSheetId,
        requestBody: {
          destinationSpreadsheetId: spreadsheetId,
        },
      });
      newSheetId = typeof duplicateRes.data.sheetId === "number" ? duplicateRes.data.sheetId : undefined;

      if (newSheetId !== undefined) {
        // Rename duplicated sheet
        await client.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: newSheetId,
                    title: newSheetName,
                  },
                  fields: "title",
                },
              },
            ],
          },
        });
      }
    } else {
      // Add blank sheet
      await client.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: newSheetName,
                },
              },
            },
          ],
        },
      });
    }

    // Populate metadata & students into the new sheet
    const studentRows = activeStudents.map((s, idx) => [
      idx + 1,
      s.fullName,
      s.dateOfBirth || "",
      s.studySystem || "",
      s.dateJoinedGroup || "",
    ]);

    await client.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          {
            range: `'${newSheetName}'!B1:F1`,
            values: [[subjectName, "Giảng viên", teacherName, "Số buổi", totalSessions]],
          },
          {
            range: `'${newSheetName}'!A4:E${3 + studentRows.length}`,
            values: studentRows,
          },
        ],
      },
    });
  }

  invalidateCache();
  updateSyncTimestamp();

  await logAuditEvent("CREATE_SUBJECT", "SUBJECT", newSheetName, {
    subjectName,
    teacherName,
    totalSessions,
    adminUser,
  });

  return { success: true, sheetName: newSheetName };
}

/**
 * Save new Zoom Alias mapping
 */
export async function saveZoomAlias(studentId: string, zoomAlias: string, adminUser = "admin") {
  const spreadsheetId = getSpreadsheetId();
  const client = getGoogleSheetsClient();

  if (client) {
    try {
      const aliasNorm = normalizeVietnameseNameWithoutAccent(zoomAlias);
      const row = [
        `alias-${Date.now()}`,
        studentId,
        zoomAlias,
        aliasNorm,
        new Date().toISOString(),
        new Date().toISOString(),
      ];

      await client.spreadsheets.values.append({
        spreadsheetId,
        range: "'_SYS_ZOOM_ALIAS'!A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [row],
        },
      });
    } catch (e) {
      console.warn("Failed to append to _SYS_ZOOM_ALIAS:", e);
    }
  }

  invalidateCache("zoom_aliases");
}

/**
 * Log audit events
 */
export async function logAuditEvent(
  action: string,
  entity: string,
  entityId: string,
  details: any = {},
  adminUser = "admin"
) {
  const spreadsheetId = getSpreadsheetId();
  const client = getGoogleSheetsClient();

  if (client) {
    try {
      const row = [
        new Date().toISOString(),
        adminUser,
        action,
        entity,
        entityId,
        JSON.stringify(details),
      ];

      await client.spreadsheets.values.append({
        spreadsheetId,
        range: "'_SYS_AUDIT_LOG'!A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [row],
        },
      });
    } catch (e) {
      // Ignored if system sheet not yet present
    }
  }
}
