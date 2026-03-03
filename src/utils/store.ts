import { openDB, type DBSchema } from "idb";
import type { BugRow, TemplateFingerprint, UserPreferences, GoogleSheetsConfig, DataFormat } from "@/types/bug";

interface BugDashDB extends DBSchema {
  bugs: { key: string; value: { id: string; rows: BugRow[]; fileName: string; timestamp: number; dataFormat?: DataFormat; googleConfig?: GoogleSheetsConfig } };
  templates: { key: string; value: TemplateFingerprint };
  preferences: { key: string; value: UserPreferences };
}

const DB_NAME = "bug-dashboard";
const DB_VERSION = 1;

function getDB() {
  return openDB<BugDashDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("bugs")) db.createObjectStore("bugs");
      if (!db.objectStoreNames.contains("templates")) db.createObjectStore("templates");
      if (!db.objectStoreNames.contains("preferences")) db.createObjectStore("preferences");
    },
  });
}

export async function saveBugData(rows: BugRow[], fileName: string, dataFormat?: DataFormat, googleConfig?: GoogleSheetsConfig) {
  const db = await getDB();
  await db.put("bugs", { id: "latest", rows, fileName, timestamp: Date.now(), dataFormat, googleConfig }, "latest");
}

export async function loadBugData(): Promise<{ rows: BugRow[]; fileName: string; timestamp: number; dataFormat?: DataFormat; googleConfig?: GoogleSheetsConfig } | undefined> {
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
