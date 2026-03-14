import { openDB, type DBSchema } from "idb";
import type { RawRow, TemplateFingerprint, UserPreferences, GoogleSheetsConfig, DataFormat } from "@/types/bug";

export type AnalysisRecord = {
  id: string;
  fileName: string;
  timestamp: number;
  rowCount: number;
  columnCount: number;
  hasInsights: boolean;
  insights?: string;
};

interface BugDashDB extends DBSchema {
  bugs: { key: string; value: { id: string; rows: RawRow[]; fileName: string; timestamp: number; dataFormat?: DataFormat; googleConfig?: GoogleSheetsConfig } };
  templates: { key: string; value: TemplateFingerprint };
  preferences: { key: string; value: UserPreferences };
  history: { key: string; value: AnalysisRecord };
}

const DB_NAME = "bug-dashboard";
const DB_VERSION = 2;

function getDB() {
  return openDB<BugDashDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("bugs")) db.createObjectStore("bugs");
      if (!db.objectStoreNames.contains("templates")) db.createObjectStore("templates");
      if (!db.objectStoreNames.contains("preferences")) db.createObjectStore("preferences");
      if (!db.objectStoreNames.contains("history")) db.createObjectStore("history");
    },
  });
}

export async function saveBugData(rows: RawRow[], fileName: string, dataFormat?: DataFormat, googleConfig?: GoogleSheetsConfig) {
  const db = await getDB();
  await db.put("bugs", { id: "latest", rows, fileName, timestamp: Date.now(), dataFormat, googleConfig }, "latest");
}

export async function loadBugData(): Promise<{ rows: RawRow[]; fileName: string; timestamp: number; dataFormat?: DataFormat; googleConfig?: GoogleSheetsConfig } | undefined> {
  const db = await getDB();
  return db.get("bugs", "latest");
}

export async function saveTemplate(fp: TemplateFingerprint) {
  const db = await getDB();
  await db.put("templates", fp, fp.id);
}

export async function loadTemplate(id: string): Promise<TemplateFingerprint | undefined> {
  const db = await getDB();
  return db.get("templates", id);
}

export async function savePreferences(prefs: UserPreferences) {
  const db = await getDB();
  await db.put("preferences", prefs, "user");
}

export async function loadPreferences(): Promise<UserPreferences | undefined> {
  const db = await getDB();
  return db.get("preferences", "user");
}

export function createFingerprint(headers: string[], sheetName: string): string {
  const sorted = [...headers].sort().join("|").toLowerCase();
  return `${sheetName.toLowerCase()}::${sorted}`;
}

export async function clearAllData() {
  const db = await getDB();
  await db.clear("bugs");
  await db.clear("templates");
}

// === Analysis History ===
export async function saveAnalysisRecord(record: AnalysisRecord) {
  const db = await getDB();
  await db.put("history", record, record.id);
}

export async function loadAnalysisHistory(): Promise<AnalysisRecord[]> {
  const db = await getDB();
  const all = await db.getAll("history");
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function deleteAnalysisRecord(id: string) {
  const db = await getDB();
  await db.delete("history", id);
}
