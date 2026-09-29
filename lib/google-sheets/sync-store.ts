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

function ensureStoreFile(): SyncState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      const defaultState: SyncState = {
        subjectSessionOverrides: {},
        customSubjects: [],
        createdSheets: [],
        recordedAttendanceRounds: [],
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(defaultState, null, 2), "utf-8");
      return defaultState;
    }
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const data = JSON.parse(raw);
    return {
      subjectSessionOverrides: data.subjectSessionOverrides || {},
      customSubjects: data.customSubjects || [],
      createdSheets: data.createdSheets || [],
      recordedAttendanceRounds: data.recordedAttendanceRounds || [],
      lastSyncedAt: data.lastSyncedAt,
    };
  } catch (err) {
    console.warn("[sync-store] Failed to read store file:", err);
    return {
      subjectSessionOverrides: {},
      customSubjects: [],
      createdSheets: [],
      recordedAttendanceRounds: [],
    };
  }
}

function writeStoreFile(state: SyncState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.warn("[sync-store] Failed to write store file:", err);
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

