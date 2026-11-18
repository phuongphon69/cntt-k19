// lib/google-sheets/client.ts
import { google } from "googleapis";

export const DEFAULT_SPREADSHEET_ID = "1nXlSGJq9DlsHsf4YFkw4ZiqQpZ2y8b4_h_EiHbhX9ec";

// Sheet dữ liệu: danh sách học viên (tab "danhsach") + kết quả điểm danh theo từng môn (mỗi môn 1 tab)
export const DEFAULT_DATA_SPREADSHEET_ID = "1r_u9nuQKJ-Jgz_xAk7vdrwGcJrNL9eA1nAQv-CUP4L0";

export function getDataSpreadsheetId(): string {
  return process.env.GOOGLE_DATA_SHEET_ID || DEFAULT_DATA_SPREADSHEET_ID;
}

// Sheet chính (TKB + danh sách + điểm danh) = sheet dữ liệu
export function getSpreadsheetId(): string {
  return getDataSpreadsheetId();
}

// Sheet cũ: chỉ còn dùng để đồng bộ số điện thoại học viên
export function getLegacySpreadsheetId(): string {
  return process.env.GOOGLE_SHEET_ID || DEFAULT_SPREADSHEET_ID;
}

export function getGoogleSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    return null;
  }

  // Handle newlines in private key
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  });

  return google.sheets({ version: "v4", auth });
}
