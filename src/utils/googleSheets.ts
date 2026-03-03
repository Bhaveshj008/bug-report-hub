import * as XLSX from "xlsx";
import type { SheetInfo } from "./excelParser";

export function extractSheetId(
  url: string
): { sheetId: string; gid?: string } | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const sheetId = match[1];
  const gidMatch = url.match(/gid=(\d+)/);
  return { sheetId, gid: gidMatch?.[1] };
}

export async function fetchGoogleSheet(
  sheetId: string,
  gid?: string,
  apiKey?: string
): Promise<SheetInfo> {
  if (apiKey) {
    return fetchWithApiKey(sheetId, apiKey, gid);
  }
  return fetchPublicSheet(sheetId, gid);
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
  gid?: string
): Promise<SheetInfo> {
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}&fields=sheets.properties`;
  const metaRes = await fetch(metaUrl);
  if (!metaRes.ok)
    throw new Error(
      "Invalid API key or sheet ID. Check your Google Sheets API key."
    );

  const meta = await metaRes.json();
  const sheets = meta.sheets || [];

  let targetSheet = sheets[0];
  if (gid) {
    targetSheet =
      sheets.find(
        (s: any) => String(s.properties.sheetId) === gid
      ) || sheets[0];
  }
  const sheetName = targetSheet?.properties?.title || "Sheet1";

  const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    sheetName
  )}?key=${apiKey}`;
  const dataRes = await fetch(dataUrl);
  if (!dataRes.ok) throw new Error("Failed to fetch sheet data.");

  const data = await dataRes.json();
  const values: string[][] = data.values || [];
  if (values.length < 2) throw new Error("Sheet has no data rows.");

  const headers = values[0].map(
    (h: string, i: number) => String(h).trim() || `Column_${i}`
  );
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
    name: sheetName,
    rowCount: sampleRows.length,
    headers,
    headerRowIndex: 0,
    sampleRows,
  };
}

function parseSheetToInfo(
  sheet: XLSX.WorkSheet,
  name: string
): SheetInfo {
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

  return {
    name,
    rowCount: sampleRows.length,
    headers,
    headerRowIndex: 0,
    sampleRows,
  };
}
