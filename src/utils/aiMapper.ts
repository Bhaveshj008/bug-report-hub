import type { CanonicalField, ColumnMapping } from "@/types/bug";
import { z } from "zod";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

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
  sheetName: string,
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<ColumnMapping | null> {
  // Build compact column summaries — max 5 unique values, 80 chars each
  const columnSamples: Record<string, string[]> = {};
  for (const h of headers) {
    const uniqueVals = new Set<string>();
    for (const row of sampleRows) {
      const val = (row[h] || "").trim();
      if (val && uniqueVals.size < 5) {
        uniqueVals.add(val.slice(0, 80));
      }
    }
    columnSamples[h] = Array.from(uniqueVals);
  }

  const canonicalFields: CanonicalField[] = [
    "app", "jiraId", "summary", "severity", "component", "userRole",
    "testData", "platform", "osVersion", "category", "reproducibility",
    "steps", "expected", "actual", "artifactsLink", "qaComments", "comments",
  ];

  const prompt = `You are a data mapping assistant. Given an Excel sheet's column headers and sample values, map them to these canonical bug report fields:

${canonicalFields.join(", ")}

Sheet: "${sheetName}"
Columns with samples:
${Object.entries(columnSamples)
  .map(([h, vals]) => `- "${h}": [${vals.map((v) => `"${v}"`).join(", ")}]`)
  .join("\n")}

Return ONLY valid JSON:
{
  "columnMap": {
    "canonicalField": "Excel Header" or null
  }
}

Rules:
- Map each canonical field to the best matching Excel header, or null if no match
- Use exact Excel header names from the list above
- Do NOT invent headers`;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Groq API error:", res.status, err);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const validated = AIMappingSchema.parse(parsed);

    // Convert to ColumnMapping
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
