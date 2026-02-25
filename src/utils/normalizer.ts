import type { BugRow, ColumnMapping } from "@/types/bug";

export function normalizeRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): BugRow[] {
  return rows.map((row) => {
    const bug: Record<string, string> = {};
    for (const [field, header] of Object.entries(mapping)) {
      bug[field] = header && row[header] ? row[header].trim() : "Unknown";
    }
    return bug as unknown as BugRow;
  });
}
