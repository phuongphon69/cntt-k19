// lib/google-sheets/fund.ts
// Đọc dữ liệu Quỹ lớp từ Google Sheet (các tab: TỔNG QUAN, THÀNH VIÊN, THU, CHI, BÁO CÁO THÁNG)
import { fetchSheetMatrix } from "./reader";
import { getCached, setCached } from "./cache";

export const DEFAULT_FUND_SPREADSHEET_ID = "1X7gwQQpiZWxugwmde6WNLAiWWZ7nWwCRXraHNXvTlGg";

export function getFundSpreadsheetId(): string {
  return process.env.GOOGLE_FUND_SHEET_ID || DEFAULT_FUND_SPREADSHEET_ID;
}

export interface FundSummary {
  memberCount: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  completionRate: number; // %
  totalDue: number;
  collected: number;
  remaining: number;
  paidCount: number;
  unpaidCount: number;
}

export interface FundMember {
  stt: number;
  name: string;
  required: number;
  paid: number;
  missing: number;
  status: string; // "Đã đủ" | "Chưa nộp" | ...
  note: string;
}

export interface FundIncome {
  date: string; // dd/mm/yyyy
  code: string;
  payer: string;
  content: string;
  type: string;
  amount: number;
  method: string;
  note: string;
}

export interface FundExpense {
  date: string; // dd/mm/yyyy
  code: string;
  content: string;
  group: string;
  amount: number;
  receiver: string;
  method: string;
  link: string;
  note: string;
}

export interface FundMonth {
  month: string;
  income: number;
  expense: number;
  diff: number;
  cumulative: number;
}

export interface FundData {
  summary: FundSummary;
  members: FundMember[];
  incomes: FundIncome[];
  expenses: FundExpense[];
  months: FundMonth[];
  spreadsheetUrl: string;
  fetchedAt: string;
}

/** "21.500.000 đ" / "-784.000 đ" / "93,0%" -> số */
export function parseMoney(value: unknown): number {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const negative = /^[-−(]/.test(raw);
  const digits = raw.replace(/[^\d,]/g, "");
  if (!digits) return 0;
  // Dấu chấm là phân cách nghìn, dấu phẩy là thập phân (chỉ dùng cho %)
  const num = Number(digits.replace(",", "."));
  if (Number.isNaN(num)) return 0;
  return negative ? -num : num;
}

/** Chuẩn hóa ngày về dd/mm/yyyy (sheet có thể để dạng d/m/yyyy hoặc m/d/yyyy) */
export function normalizeFundDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return raw;
  let a = Number(m[1]);
  let b = Number(m[2]);
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  // Nếu số thứ hai > 12 thì chắc chắn là định dạng tháng/ngày
  if (b > 12 && a <= 12) [a, b] = [b, a];
  return `${String(a).padStart(2, "0")}/${String(b).padStart(2, "0")}/${year}`;
}

function cell(row: any[] | undefined, idx: number): string {
  return String(row?.[idx] ?? "").trim();
}

function findHeaderIndex(matrix: any[][], firstCell: string): number {
  return matrix.findIndex((row) => cell(row, 0).toUpperCase() === firstCell.toUpperCase());
}

export function parseOverview(matrix: any[][]): FundSummary {
  const left = new Map<string, string>();
  const right = new Map<string, string>();
  for (const row of matrix) {
    if (cell(row, 0)) left.set(cell(row, 0).toLowerCase(), cell(row, 1));
    if (cell(row, 3)) right.set(cell(row, 3).toLowerCase(), cell(row, 4));
  }
  const num = (m: Map<string, string>, key: string) => parseMoney(m.get(key));
  return {
    memberCount: num(left, "số thành viên"),
    totalIncome: num(left, "tổng thu"),
    totalExpense: num(left, "tổng chi"),
    balance: num(left, "số dư hiện tại"),
    completionRate: num(left, "tỷ lệ hoàn thành quỹ"),
    totalDue: num(right, "tổng phải thu"),
    collected: num(right, "đã thu từ thành viên"),
    remaining: num(right, "còn phải thu"),
    paidCount: num(right, "số người đã đủ"),
    unpaidCount: num(right, "số người chưa đủ"),
  };
}

export function parseMembers(matrix: any[][]): FundMember[] {
  const h = findHeaderIndex(matrix, "STT");
  const members: FundMember[] = [];
  for (let r = h + 1; r < matrix.length; r++) {
    const row = matrix[r];
    const name = cell(row, 1);
    if (!name) continue;
    members.push({
      stt: Number(cell(row, 0)) || members.length + 1,
      name,
      note: cell(row, 3),
      required: parseMoney(cell(row, 4)),
      paid: parseMoney(cell(row, 5)),
      missing: parseMoney(cell(row, 6)),
      status: cell(row, 7),
    });
  }
  return members;
}

export function parseIncomes(matrix: any[][]): FundIncome[] {
  const h = findHeaderIndex(matrix, "Ngày");
  const list: FundIncome[] = [];
  for (let r = h + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!cell(row, 0) && !cell(row, 5)) continue;
    list.push({
      date: normalizeFundDate(cell(row, 0)),
      code: cell(row, 1),
      payer: cell(row, 2),
      content: cell(row, 3),
      type: cell(row, 4),
      amount: parseMoney(cell(row, 5)),
      method: cell(row, 6),
      note: cell(row, 7),
    });
  }
  return list;
}

export function parseExpenses(matrix: any[][]): FundExpense[] {
  const h = findHeaderIndex(matrix, "Ngày");
  const list: FundExpense[] = [];
  for (let r = h + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!cell(row, 0) && !cell(row, 4)) continue;
    list.push({
      date: normalizeFundDate(cell(row, 0)),
      code: cell(row, 1),
      content: cell(row, 2),
      group: cell(row, 3),
      amount: parseMoney(cell(row, 4)),
      receiver: cell(row, 5),
      method: cell(row, 6),
      link: cell(row, 7),
      note: cell(row, 8),
    });
  }
  return list;
}

export function parseMonths(matrix: any[][]): FundMonth[] {
  const h = findHeaderIndex(matrix, "Tháng");
  const list: FundMonth[] = [];
  for (let r = h + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!cell(row, 0)) continue;
    list.push({
      month: cell(row, 0),
      income: parseMoney(cell(row, 1)),
      expense: parseMoney(cell(row, 2)),
      diff: parseMoney(cell(row, 3)),
      cumulative: parseMoney(cell(row, 4)),
    });
  }
  return list;
}

export async function getFundData(forceFresh = false): Promise<FundData> {
  const cacheKey = "fund_all_data";
  if (!forceFresh) {
    const cached = getCached<FundData>(cacheKey);
    if (cached) return cached;
  }

  const id = getFundSpreadsheetId();
  const [overview, members, incomes, expenses, months] = await Promise.all([
    fetchSheetMatrix("TỔNG QUAN", forceFresh, id),
    fetchSheetMatrix("THÀNH VIÊN", forceFresh, id),
    fetchSheetMatrix("THU", forceFresh, id),
    fetchSheetMatrix("CHI", forceFresh, id),
    fetchSheetMatrix("BÁO CÁO THÁNG", forceFresh, id),
  ]);

  const data: FundData = {
    summary: parseOverview(overview),
    members: parseMembers(members),
    incomes: parseIncomes(incomes),
    expenses: parseExpenses(expenses),
    months: parseMonths(months),
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
    fetchedAt: new Date().toISOString(),
  };
  setCached(cacheKey, data);
  return data;
}
