import fs from "fs";
import path from "path";
import { Subject, AttendanceValue } from "@/types";

export interface RecordedAttendanceRound {
  sheetName: string;
  sessionDate: string;
  roundNumber: 1 | 2 | 3;
  updates: { studentId: string; value: AttendanceValue }[];
  recordedAt: string;
}

interface SyncState {
  subjectSessionOverrides: Record<string, number>;
  customSubjects: Subject[];
  createdSheets: string[]; // List of sheet names created via TKB
  recordedAttendanceRounds: RecordedAttendanceRound[];
  lastSyncedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "synced-subjects.json");
const TMP_STORE_FILE = path.join(process.platform === "win32" ? (process.env.TEMP || "C:\\temp") : "/tmp", "synced-subjects.json");

let globalMemorySyncState: SyncState | null = null;

function ensureStoreFile(): SyncState {
  if (globalMemorySyncState) {
    return globalMemorySyncState;
  }

  try {
    let raw = "";
    if (fs.existsSync(STORE_FILE)) {
      raw = fs.readFileSync(STORE_FILE, "utf-8");
    } else if (fs.existsSync(TMP_STORE_FILE)) {
      raw = fs.readFileSync(TMP_STORE_FILE, "utf-8");
    }

    if (raw) {
      const data = JSON.parse(raw);
      globalMemorySyncState = {
        subjectSessionOverrides: data.subjectSessionOverrides || {},
        customSubjects: data.customSubjects || [],
        createdSheets: data.createdSheets || [],
        recordedAttendanceRounds: data.recordedAttendanceRounds || [],
        lastSyncedAt: data.lastSyncedAt,
      };
      return globalMemorySyncState;
    }

    const defaultState: SyncState = {
      subjectSessionOverrides: {},
      customSubjects: [],
      createdSheets: [],
      recordedAttendanceRounds: [],
    };
    globalMemorySyncState = defaultState;
    return defaultState;
  } catch (err) {
    console.warn("[sync-store] Failed to read store file, using in-memory state:", err);
    globalMemorySyncState = {
      subjectSessionOverrides: {},
      customSubjects: [],
      createdSheets: [],
      recordedAttendanceRounds: [],
    };
    return globalMemorySyncState;
  }
}

function writeStoreFile(state: SyncState): void {
  globalMemorySyncState = state;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    // If process.cwd()/data is read-only (e.g. Vercel Lambda), write to /tmp
    try {
      const tmpDir = path.dirname(TMP_STORE_FILE);
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      fs.writeFileSync(TMP_STORE_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (tmpErr) {
      console.warn("[sync-store] Could not write to disk, preserved in memory:", tmpErr);
    }
  }
}

export function getSessionOverride(sheetNameOrId: string): number | null {
  const state = ensureStoreFile();
  const key = sheetNameOrId.trim().toUpperCase();
  return state.subjectSessionOverrides[key] ?? null;
}

export function setSessionOverride(sheetNameOrId: string, sessions: number): void {
  const state = ensureStoreFile();
  const key = sheetNameOrId.trim().toUpperCase();
  state.subjectSessionOverrides[key] = sessions;
  state.lastSyncedAt = new Date().toISOString();
  writeStoreFile(state);
}

export function getCustomSubjects(): Subject[] {
  const state = ensureStoreFile();
  return state.customSubjects || [];
}

export function saveCustomSubject(subject: Subject): void {
  const state = ensureStoreFile();
  const existingIdx = state.customSubjects.findIndex((s) => s.id === subject.id);
  if (existingIdx !== -1) {
    state.customSubjects[existingIdx] = subject;
  } else {
    state.customSubjects.push(subject);
  }
  state.lastSyncedAt = new Date().toISOString();
  writeStoreFile(state);
}

export function getAllSyncState(): SyncState {
  return ensureStoreFile();
}

export function removeCustomSubject(id: string): void {
  const state = ensureStoreFile();
  state.customSubjects = state.customSubjects.filter((s) => s.id !== id);
  writeStoreFile(state);
}

export function removeSessionOverride(sheetNameOrId: string): void {
  const state = ensureStoreFile();
  const key = sheetNameOrId.trim().toUpperCase();
  delete state.subjectSessionOverrides[key];
  writeStoreFile(state);
}

/**
 * Save a confirmed attendance round into the persistent sync store
 */
export function saveRecordedAttendanceRound(entry: RecordedAttendanceRound): void {
  const state = ensureStoreFile();
  // Check if this round was already recorded; if so, update it, else append
  const idx = state.recordedAttendanceRounds.findIndex(
    (r) =>
      r.sheetName.trim().toUpperCase() === entry.sheetName.trim().toUpperCase() &&
      r.sessionDate === entry.sessionDate &&
      r.roundNumber === entry.roundNumber
  );

  if (idx !== -1) {
    state.recordedAttendanceRounds[idx] = entry;
  } else {
    state.recordedAttendanceRounds.push(entry);
  }

  // Also ensure the sheet is marked as created/active
  const sheetKey = entry.sheetName.trim().toUpperCase();
  if (!state.createdSheets.includes(sheetKey)) {
    state.createdSheets.push(sheetKey);
  }

  state.lastSyncedAt = new Date().toISOString();
  writeStoreFile(state);
}

/**
 * Get all recorded attendance rounds, optionally filtered by sheet name
 */
export function getRecordedAttendanceRounds(sheetName?: string): RecordedAttendanceRound[] {
  const state = ensureStoreFile();
  if (!sheetName) return state.recordedAttendanceRounds;
  const target = sheetName.trim().toUpperCase();
  return state.recordedAttendanceRounds.filter(
    (r) => r.sheetName.trim().toUpperCase() === target
  );
}

/**
 * Mark a sheet as created and available in Google Sheets or local sync
 */
export function markSubjectHasSheet(sheetName: string): void {
  const state = ensureStoreFile();
  const sheetKey = sheetName.trim().toUpperCase();
  if (!state.createdSheets.includes(sheetKey)) {
    state.createdSheets.push(sheetKey);
    state.lastSyncedAt = new Date().toISOString();
    writeStoreFile(state);
  }
}

/**
 * Check if a sheet is marked as created in sync store
 */
export function isSubjectSheetCreated(sheetName: string): boolean {
  const state = ensureStoreFile();
  const sheetKey = sheetName.trim().toUpperCase();
  return state.createdSheets.includes(sheetKey);
}

export function getCreatedSheets(): string[] {
  const state = ensureStoreFile();
  return state.createdSheets || [];
}

/**
 * Update a student's attendance rounds in the sync store
 */
export function updateRecordedStudentAttendance(
  sheetName: string,
  sessionDate: string,
  studentId: string,
  rounds: { round1?: AttendanceValue; round2?: AttendanceValue; round3?: AttendanceValue }
): void {
  const state = ensureStoreFile();
  const targetSheet = sheetName.trim().toUpperCase();

  const roundNums: (1 | 2 | 3)[] = [1, 2, 3];
  roundNums.forEach((rnd) => {
    const valKey = `round${rnd}` as keyof typeof rounds;
    if (rounds[valKey] !== undefined) {
      const val = rounds[valKey] as AttendanceValue;
      let roundEntry = state.recordedAttendanceRounds.find(
        (r) =>
          r.sheetName.trim().toUpperCase() === targetSheet &&
          r.sessionDate === sessionDate &&
          r.roundNumber === rnd
      );

      if (!roundEntry) {
        roundEntry = {
          sheetName,
          sessionDate,
          roundNumber: rnd,
          updates: [],
          recordedAt: new Date().toISOString(),
        };
        state.recordedAttendanceRounds.push(roundEntry);
      }

      const updIdx = roundEntry.updates.findIndex((u) => u.studentId === studentId);
      if (val === "" || val === undefined) {
        if (updIdx !== -1) roundEntry.updates.splice(updIdx, 1);
      } else {
        if (updIdx !== -1) {
          roundEntry.updates[updIdx].value = val;
        } else {
          roundEntry.updates.push({ studentId, value: val });
        }
      }
    }
  });

  state.lastSyncedAt = new Date().toISOString();
  writeStoreFile(state);
}

/**
 * Delete or clear attendance in sync store for a student or whole session
 */
export function deleteRecordedAttendance(
  sheetName: string,
  sessionDate: string,
  studentId?: string
): void {
  const state = ensureStoreFile();
  const targetSheet = sheetName.trim().toUpperCase();
  const roundNums: (1 | 2 | 3)[] = [1, 2, 3];

  if (studentId) {
    // Record explicit empty value for this student in each round to override any stale sheet cache
    roundNums.forEach((rnd) => {
      let roundEntry = state.recordedAttendanceRounds.find(
        (r) =>
          r.sheetName.trim().toUpperCase() === targetSheet &&
          r.sessionDate === sessionDate &&
          r.roundNumber === rnd
      );
      if (!roundEntry) {
        roundEntry = {
          sheetName,
          sessionDate,
          roundNumber: rnd,
          updates: [],
          recordedAt: new Date().toISOString(),
        };
        state.recordedAttendanceRounds.push(roundEntry);
      }
      const updIdx = roundEntry.updates.findIndex((u) => u.studentId === studentId);
      if (updIdx !== -1) {
        roundEntry.updates[updIdx].value = "";
      } else {
        roundEntry.updates.push({ studentId, value: "" });
      }
    });
  } else {
    // Session mode: set all rounds to empty
    roundNums.forEach((rnd) => {
      let roundEntry = state.recordedAttendanceRounds.find(
        (r) =>
          r.sheetName.trim().toUpperCase() === targetSheet &&
          r.sessionDate === sessionDate &&
          r.roundNumber === rnd
      );
      if (roundEntry) {
        roundEntry.updates.forEach((u) => {
          u.value = "";
        });
      }
    });
  }

  state.lastSyncedAt = new Date().toISOString();
  writeStoreFile(state);
}

