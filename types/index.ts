// types/index.ts

export type UserRole = "VIEWER" | "ADMIN";

export type AttendanceValue = "X" | "P" | "M" | "" | string;

export interface AttendanceConfig {
  presentValues: string[];
  excusedValues: string[];
  lateValues: string[];
  absentValues: string[];
  presentScore: number;
  excusedScore: number;
  lateScore: number;
  absentScore: number;
  matchHighThreshold: number;
  matchReviewThreshold: number;
  warningThreshold: number; // e.g. 80%
  timezone: string;
}

export interface Student {
  id: string; // internal UUID / normalized ID
  stt?: number;
  fullName: string;
  hoVa: string;
  ten: string;
  normalizedName: string;
  normalizedNameNoAccent: string;
  dateOfBirth?: string; // dd/mm/yyyy
  placeOfBirth?: string;
  studySystem?: string; // CQ, LT...
  dateJoinedGroup?: string;
  phone?: string; // PRIVATE
  cccd?: string; // PRIVATE
  notes?: string;
  active: boolean;
  sourceSheet: string;
  sourceRow: number;
  totalPresent?: number;
}

export interface PublicStudent {
  id: string;
  fullName: string;
  studySystem?: string;
  dateOfBirth?: string;
  dateJoinedGroup?: string;
  active?: boolean;
}

export type SubjectStatus = "DRAFT" | "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface Subject {
  id: string;
  code: string;
  name: string;
  shortName: string;
  attendanceSheet: string; // e.g. "DD CHÍNH TRỊ"
  teacher: string;
  teacherPhone?: string;
  totalSessions: number;
  status: SubjectStatus;
  isPublic: boolean;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  // Computed summary
  recordedSessionsCount?: number;
  averageAttendanceRate?: number;
}

export interface AttendanceSession {
  id: string;
  subjectId: string;
  sessionIndex: number;
  date: string; // dd/mm/yyyy
  round1: AttendanceValue;
  round2: AttendanceValue;
  round3: AttendanceValue;
  sessionRate?: number; // 0..100
  isRecorded: boolean;
  colStart?: number; // Sheet column index (0-based)
}

export interface StudentAttendanceRecord {
  studentId: string;
  studentName: string;
  dateOfBirth?: string;
  studySystem?: string;
  dateJoinedGroup?: string;
  isApplicable: boolean; // false if student was not in this subject sheet or joined after date
  sessions: {
    [date: string]: {
      round1: AttendanceValue;
      round2: AttendanceValue;
      round3: AttendanceValue;
      rate: number;
      isRecorded: boolean;
      status: "PRESENT" | "EXCUSED" | "LATE" | "ABSENT" | "UNRECORDED" | "NOT_APPLICABLE";
    };
  };
  totalX: number;
  totalP: number;
  totalM: number;
  recordedSessions: number;
  attendanceRate: number; // 0..100
  warning: boolean;
}

export type SessionType = "Học bình thường" | "Học online" | "Học bù" | "Thi" | "Khác";

export type ScheduleStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "MAKEUP" | "RESCHEDULED";

export interface ScheduleItem {
  id: string;
  subjectId: string;
  subjectName: string;
  date: string; // dd/mm/yyyy
  dayOfWeek: string; // Thứ 2, Thứ 3...
  startPeriod: number;
  endPeriod: number;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room?: string;
  teacher?: string;
  teacherPhone?: string;
  classUrl?: string; // Zoom / Meet url
  zoomAccount?: string;
  sessionType: SessionType;
  status: ScheduleStatus;
  note?: string;
  sourceTkbRow?: number;
}

export interface Period {
  id: string;
  periodNumber: number;
  name: string;
  startTime: string; // e.g. "07:00"
  endTime: string; // e.g. "07:45"
  sortOrder: number;
  active: boolean;
}

export interface ZoomAlias {
  id: string;
  studentId: string;
  zoomAlias: string;
  normalizedAlias: string;
  createdAt: string;
  lastUsedAt: string;
}

export type OcrMatchStatus = "MATCHED" | "NEEDS_REVIEW" | "UNMATCHED";

export interface OcrCandidate {
  rawText: string;
  cleanedName: string;
  extractedDob?: string;
  matchedStudent?: PublicStudent;
  confidenceScore: number;
  status: OcrMatchStatus;
  matchedByAlias?: boolean;
  // Conflict detection
  currentValue?: AttendanceValue; // What is currently in the sheet for this round
  hasConflict?: boolean;
  resolvedValue?: AttendanceValue;
  confirmed?: boolean;
}

export interface OcrResultSummary {
  totalExtracted: number;
  matchedCount: number;
  reviewCount: number;
  unmatchedCount: number;
  candidates: OcrCandidate[];
  unmatchedStudents: PublicStudent[]; // Students in class that were NOT recognized in images
}

export interface AuditLog {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, any>;
}

export interface DataHealthIssue {
  type: "ERROR" | "WARNING" | "INFO";
  code: string;
  sheetName?: string;
  row?: number;
  column?: string;
  message: string;
  recommendation?: string;
}

export interface DataHealthReport {
  timestamp: string;
  healthy: boolean;
  totalIssues: number;
  issues: DataHealthIssue[];
}
