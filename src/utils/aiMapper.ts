import type { CanonicalField, ColumnMapping, AIProvider } from "@/types/bug";
import { callAI } from "./aiProviders";
import { z } from "zod";

const AIMappingSchema = z.object({
  defectSheetName: z.string().optional(),
  headerRowIndex: z.number().optional(),
  columnMap: z.record(z.string(), z.string().nullable()),
});

/**
 * Sends ONLY minimal metadata to AI — never full rows.
 * Sends: headers + 5 unique sample values per column (max 80 chars each).
 */
export async function aiMapColumns(
  apiKey: string,
  provider: AIProvider,
  model: string,
  sheetName: string,
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<ColumnMapping | null> {
  const columnSamples: Record<string, string[]> = {};
  for (const h of headers) {
    const uniqueVals = new Set<string>();
    for (const row of sampleRows) {
      const val = (row[h] || "").trim();
      if (val && uniqueVals.size < 5) uniqueVals.add(val.slice(0, 80));
    }
    columnSamples[h] = Array.from(uniqueVals);
  }

  const canonicalFields: CanonicalField[] = [
    "app", "jiraId", "summary", "severity", "component", "userRole",
    "testData", "platform", "osVersion", "category", "reproducibility",
    "steps", "expected", "actual", "artifactsLink", "qaComments", "comments",
  ];

  const prompt = `You are a data mapping assistant. Map Excel column headers to these canonical fields:
${canonicalFields.join(", ")}

Sheet: "${sheetName}"
Columns with samples:
${Object.entries(columnSamples).map(([h, vals]) => `- "${h}": [${vals.map((v) => `"${v}"`).join(", ")}]`).join("\n")}

Return ONLY valid JSON:
{"columnMap":{"canonicalField":"Excel Header" or null}}
Map each field to best match or null. Use exact header names.`;

  try {
    const content = await callAI(apiKey, provider, model, [{ role: "user", content: prompt }], {
      temperature: 0,
      maxTokens: 500,
      jsonMode: true,
    });
    if (!content) return null;

    const parsed = JSON.parse(content);
    const validated = AIMappingSchema.parse(parsed);

    const mapping: ColumnMapping = {} as ColumnMapping;
    for (const field of canonicalFields) {
      const mapped = validated.columnMap[field];
      mapping[field] = mapped && headers.includes(mapped) ? mapped : null;
    }
    return mapping;
  } catch (e) {
    console.error("AI mapping failed:", e);
    return null;
  }
}
