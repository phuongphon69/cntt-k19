// lib/google-sheets/client.ts
import { google } from "googleapis";

export const DEFAULT_SPREADSHEET_ID = "1nXlSGJq9DlsHsf4YFkw4ZiqQpZ2y8b4_h_EiHbhX9ec";

export function getSpreadsheetId(): string {
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
