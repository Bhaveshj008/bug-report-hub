import * as XLSX from "xlsx";
import type { SheetInfo } from "./excelParser";

export type GoogleSheetMeta = {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
};

export function extractSheetId(
  url: string
): { sheetId: string; gid?: string } | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const sheetId = match[1];
  const gidMatch = url.match(/gid=(\d+)/);
  return { sheetId, gid: gidMatch?.[1] };
}

/**
 * Fetch list of sheets (tabs) in a Google Spreadsheet
 */
export async function fetchGoogleSheetList(
  spreadsheetId: string,
  apiKey?: string
): Promise<GoogleSheetMeta[]> {
  if (apiKey) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&fields=sheets.properties`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch sheet list. Check API key and sheet ID.");
    const data = await res.json();
    return (data.sheets || []).map((s: any) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
      rowCount: s.properties.gridProperties?.rowCount || 0,
      columnCount: s.properties.gridProperties?.columnCount || 0,
    }));
  }
  
  // For public sheets, try fetching metadata via HTML page
  // We can only reliably get sheet names from the page
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`;
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=0`, { method: 'HEAD' });
    if (!res.ok) throw new Error("Sheet not accessible");
  } catch {
    // Fallback: can't list sheets for public without API key
  }
  
  // For public sheets without API key, return empty — we'll fetch single sheet
  return [];
}

export async function fetchGoogleSheet(
  sheetId: string,
  gid?: string,
  apiKey?: string,
  sheetTitle?: string
): Promise<SheetInfo> {
  if (apiKey) {
    return fetchWithApiKey(sheetId, apiKey, gid, sheetTitle);
  }
  return fetchPublicSheet(sheetId, gid);
}

/**
 * Fetch all sheets from a Google Spreadsheet (API key required)
 */
export async function fetchAllGoogleSheets(
  spreadsheetId: string,
  apiKey: string
): Promise<SheetInfo[]> {
  const sheetList = await fetchGoogleSheetList(spreadsheetId, apiKey);
  const results: SheetInfo[] = [];
  
  for (const meta of sheetList) {
    try {
      const sheet = await fetchWithApiKey(spreadsheetId, apiKey, String(meta.sheetId), meta.title);
      if (sheet.rowCount > 0) results.push(sheet);
    } catch {
      // Skip sheets that fail to load
    }
  }
  
  return results;
}

async function fetchPublicSheet(
  sheetId: string,
  gid?: string
): Promise<SheetInfo> {
  const gidParam = gid ? `&gid=${gid}` : "";
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      "Failed to fetch sheet. Make sure it's shared as 'Anyone with the link'."
    );
  }

  const csvText = await response.text();
  const wb = XLSX.read(csvText, { type: "string" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  return parseSheetToInfo(sheet, sheetName);
}

async function fetchWithApiKey(
  sheetId: string,
  apiKey: string,
  gid?: string,
  sheetTitle?: string
): Promise<SheetInfo> {
  let targetSheetName = sheetTitle;

  if (!targetSheetName) {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}&fields=sheets.properties`;
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) throw new Error("Invalid API key or sheet ID.");

    const meta = await metaRes.json();
    const sheets = meta.sheets || [];
    let targetSheet = sheets[0];
    if (gid) {
      targetSheet = sheets.find((s: any) => String(s.properties.sheetId) === gid) || sheets[0];
    }
    targetSheetName = targetSheet?.properties?.title || "Sheet1";
  }

  const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(targetSheetName)}?key=${apiKey}`;
  const dataRes = await fetch(dataUrl);
  if (!dataRes.ok) throw new Error("Failed to fetch sheet data.");

  const data = await dataRes.json();
  const values: string[][] = data.values || [];
  if (values.length < 2) throw new Error("Sheet has no data rows.");

  const headers = values[0].map((h: string, i: number) => String(h).trim() || `Column_${i}`);
  const sampleRows: Record<string, string>[] = [];

  for (let i = 1; i < values.length; i++) {
    const row: Record<string, string> = {};
    let hasValue = false;
    for (let j = 0; j < headers.length; j++) {
      const val = values[i]?.[j] ? String(values[i][j]).trim() : "";
      row[headers[j]] = val;
      if (val) hasValue = true;
    }
    if (hasValue) sampleRows.push(row);
  }

  return {
    name: targetSheetName,
    rowCount: sampleRows.length,
    headers,
    headerRowIndex: 0,
    sampleRows,
  };
}

function parseSheetToInfo(sheet: XLSX.WorkSheet, name: string): SheetInfo {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const headers: string[] = [];

  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
    headers.push(cell ? String(cell.v).trim() : `Column_${c}`);
  }

  const sampleRows: Record<string, string>[] = [];
  for (let r = 1; r <= range.e.r; r++) {
    const row: Record<string, string> = {};
    let hasValue = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      const val = cell ? String(cell.v).trim() : "";
      row[headers[c - range.s.c]] = val;
      if (val) hasValue = true;
    }
    if (hasValue) sampleRows.push(row);
  }

  return { name, rowCount: sampleRows.length, headers, headerRowIndex: 0, sampleRows };
}
