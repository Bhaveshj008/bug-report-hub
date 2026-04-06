/**
 * Vectorless RAG Engine — browser-side retrieval without embeddings or vector DB.
 *
 * Strategy:
 * 1. At data load: chunk dataset into semantic units (distributions, cross-column, summaries)
 * 2. At query time: score chunks using keyword + phrase matching, return top-K as LLM context
 */
import type {
  RawRow, DataAnalysis, DynamicAggregations, RAGChunk, AISchema,
} from "@/types/bug";

const INTERNAL_COLUMNS = ["__sheet"];

// ─── Build RAG Index ────────────────────────────────────────────────────────

export function buildRAGIndex(
  rows: RawRow[],
  analysis: DataAnalysis,
  agg: DynamicAggregations,
  aiSchema?: AISchema | null
): RAGChunk[] {
  const chunks: RAGChunk[] = [];
  let id = 0;
  const mkId = () => `chunk-${id++}`;

  const cols = analysis.columns.filter(c => !INTERNAL_COLUMNS.includes(c.name));

  // ── 1. Summary chunk ──
  const dataType = aiSchema?.dataType || "data";
  chunks.push({
    id: mkId(),
    type: "summary",
    text: `Dataset has ${agg.total} total rows and ${cols.length} columns. Data type: ${dataType}. Columns: ${cols.map(c => c.name).join(", ")}.`,
    keywords: ["total", "rows", "columns", "dataset", "overview", "summary", "how many", "count"],
    weight: 1.5,
  });

  // ── 2. Column distribution chunks ──
  for (const col of cols) {
    if (col.type !== "categorical" || col.uniqueCount < 2) continue;

    const counts = agg.columnCounts[col.name];
    if (!counts) continue;

    const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);
    const total = entries.reduce((s, [, v]) => s + v, 0);

    const distribution = entries.slice(0, 15).map(([val, cnt]) => {
      const pct = total > 0 ? ((cnt / total) * 100).toFixed(1) : "0";
      return `${val}: ${cnt} (${pct}%)`;
    }).join(", ");

    const text = `Column "${col.name}" has ${col.uniqueCount} unique values across ${total} rows. Distribution: ${distribution}.`;

    chunks.push({
      id: mkId(),
      type: "column_distribution",
      text,
      keywords: [
        col.name.toLowerCase(),
        ...col.name.toLowerCase().split(/[\s_-]+/),
        "distribution",
        "breakdown",
        ...entries.slice(0, 10).map(([v]) => v.toLowerCase()),
      ],
      weight: 2.0,
    });
  }

  // ── 3. Value detail chunks — one per significant value in important columns ──
  const importantCols = getImportantColumns(cols, aiSchema);
  for (const colName of importantCols) {
    const counts = agg.columnCounts[colName];
    if (!counts) continue;
    const total = Object.values(counts).reduce((s, v) => s + v, 0);

    for (const [val, cnt] of Object.entries(counts)) {
      if (cnt < 2) continue; // Skip very rare values
      const pct = total > 0 ? ((cnt / total) * 100).toFixed(1) : "0";
      chunks.push({
        id: mkId(),
        type: "value_detail",
        text: `There are ${cnt} records with "${colName}" = "${val}", which is ${pct}% of all ${total} records in this column.`,
        keywords: [
          val.toLowerCase(),
          colName.toLowerCase(),
          ...colName.toLowerCase().split(/[\s_-]+/),
          ...val.toLowerCase().split(/[\s_-]+/),
          "count", "how many",
        ],
        weight: 1.5,
      });
    }
  }

  // ── 4. Cross-column chunks — analyze pairs of important columns ──
  const crossCols = importantCols.slice(0, 4); // Limit to avoid explosion
  for (let i = 0; i < crossCols.length; i++) {
    for (let j = i + 1; j < crossCols.length; j++) {
      const col1 = crossCols[i];
      const col2 = crossCols[j];
      const crossData = buildCrossFrequency(rows, col1, col2);
      if (Object.keys(crossData).length === 0) continue;

      // Build text for each value of col1
      for (const [v1, inner] of Object.entries(crossData)) {
        const innerEntries = Object.entries(inner).sort(([, a], [, b]) => b - a);
        const total = innerEntries.reduce((s, [, v]) => s + v, 0);
        const breakdown = innerEntries.slice(0, 8).map(([v2, cnt]) => `${v2}: ${cnt}`).join(", ");

        chunks.push({
          id: mkId(),
          type: "cross_column",
          text: `${col1} "${v1}" has ${total} records. ${col2} breakdown: ${breakdown}.`,
          keywords: [
            v1.toLowerCase(),
            col1.toLowerCase(),
            col2.toLowerCase(),
            ...col1.toLowerCase().split(/[\s_-]+/),
            ...col2.toLowerCase().split(/[\s_-]+/),
            ...v1.toLowerCase().split(/[\s_-]+/),
            "which", "module", "most", "breakdown",
          ],
          weight: 3.0, // Cross-column chunks are highest value
        });
      }
    }
  }

  // ── 5. Metadata chunks ──
  for (const col of cols) {
    chunks.push({
      id: mkId(),
      type: "metadata",
      text: `Column "${col.name}" is of type ${col.type} with ${col.uniqueCount} unique values and ${Math.round(col.fillRate)}% fill rate.`,
      keywords: [col.name.toLowerCase(), col.type, "column", "type", "fill rate"],
      weight: 0.5,
    });
  }

  return chunks;
}

// ─── Retrieve relevant chunks for a query ───────────────────────────────────

export function retrieveChunks(
  query: string,
  chunks: RAGChunk[],
  topK: number = 10
): RAGChunk[] {
  const queryLower = query.toLowerCase();
  const queryTokens = tokenize(queryLower);
  const queryPhrases = extractPhrases(queryLower);

  const scored = chunks.map(chunk => {
    let score = 0;

    // Keyword matching
    for (const token of queryTokens) {
      if (chunk.keywords.some(kw => kw.includes(token) || token.includes(kw))) {
        score += chunk.weight;
      }
      // Direct text match bonus
      if (chunk.text.toLowerCase().includes(token)) {
        score += chunk.weight * 0.5;
      }
    }

    // Phrase matching (consecutive keywords match) — 3x bonus
    for (const phrase of queryPhrases) {
      if (chunk.text.toLowerCase().includes(phrase)) {
        score += chunk.weight * 3;
      }
      if (chunk.keywords.some(kw => kw.includes(phrase))) {
        score += chunk.weight * 2;
      }
    }

    // Type-based bonuses for common question patterns
    if (queryLower.includes("which module") || queryLower.includes("what module") || queryLower.includes("module")) {
      if (chunk.type === "cross_column") score += 2;
    }
    if (queryLower.includes("total") || queryLower.includes("how many") || queryLower.includes("count")) {
      if (chunk.type === "column_distribution" || chunk.type === "summary") score += 1.5;
    }
    if (queryLower.includes("top") || queryLower.includes("most") || queryLower.includes("highest")) {
      if (chunk.type === "column_distribution" || chunk.type === "cross_column") score += 1.5;
    }
    if (queryLower.includes("compare") || queryLower.includes("between") || queryLower.includes("versus")) {
      if (chunk.type === "cross_column") score += 2;
    }

    return { chunk, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.chunk);
}

// ─── Format chunks for LLM context ─────────────────────────────────────────

export function formatRAGContext(chunks: RAGChunk[]): string {
  if (chunks.length === 0) return "No relevant data found for this query.";

  const sections: Record<string, string[]> = {
    summary: [],
    column_distribution: [],
    value_detail: [],
    cross_column: [],
    metadata: [],
  };

  for (const chunk of chunks) {
    sections[chunk.type].push(chunk.text);
  }

  const parts: string[] = [];
  if (sections.summary.length) parts.push("DATASET OVERVIEW:\n" + sections.summary.join("\n"));
  if (sections.column_distribution.length) parts.push("COLUMN DISTRIBUTIONS:\n" + sections.column_distribution.join("\n"));
  if (sections.cross_column.length) parts.push("CROSS-COLUMN ANALYSIS:\n" + sections.cross_column.join("\n"));
  if (sections.value_detail.length) parts.push("VALUE DETAILS:\n" + sections.value_detail.join("\n"));
  if (sections.metadata.length) parts.push("METADATA:\n" + sections.metadata.join("\n"));

  return parts.join("\n\n");
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .split(/[\s,?.!;:'"()\[\]{}]+/)
    .filter(t => t.length > 2)
    .filter(t => !["the", "and", "for", "are", "was", "were", "with", "this", "that", "from", "have", "has", "what", "does"].includes(t));
}

function extractPhrases(text: string): string[] {
  const phrases: string[] = [];
  const words = text.split(/\s+/).filter(w => w.length > 1);
  // Extract 2-word and 3-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }
  return phrases;
}

function getImportantColumns(
  cols: { name: string; type: string; uniqueCount: number; fillRate: number }[],
  aiSchema?: AISchema | null
): string[] {
  const important: string[] = [];

  // Use AI schema column map if available
  if (aiSchema?.columnMap) {
    const { moduleColumn, severityColumn, priorityColumn, statusColumn, resultColumn, typeColumn, assigneeColumn } = aiSchema.columnMap;
    if (moduleColumn) important.push(moduleColumn);
    if (severityColumn) important.push(severityColumn);
    if (priorityColumn) important.push(priorityColumn);
    if (statusColumn) important.push(statusColumn);
    if (resultColumn) important.push(resultColumn);
    if (typeColumn) important.push(typeColumn);
    if (assigneeColumn) important.push(assigneeColumn);
  }

  // Add any categorical columns not yet included
  for (const col of cols) {
    if (col.type === "categorical" && !important.includes(col.name) && col.uniqueCount >= 2 && col.uniqueCount <= 50 && col.fillRate > 30) {
      important.push(col.name);
    }
  }

  return important.slice(0, 8);
}

function buildCrossFrequency(
  rows: RawRow[],
  col1: string,
  col2: string
): Record<string, Record<string, number>> {
  const canonical1: Record<string, string> = {};
  const canonical2: Record<string, string> = {};
  const cross: Record<string, Record<string, number>> = {};
  const col1Freq: Record<string, number> = {};

  for (const row of rows) {
    const v1 = (row[col1] || "").trim();
    const v2 = (row[col2] || "").trim();
    if (!v1 || !v2) continue;

    const v1Lower = v1.toLowerCase();
    const v2Lower = v2.toLowerCase();
    if (!canonical1[v1Lower]) canonical1[v1Lower] = v1;
    if (!canonical2[v2Lower]) canonical2[v2Lower] = v2;

    col1Freq[v1Lower] = (col1Freq[v1Lower] || 0) + 1;

    if (!cross[v1]) cross[v1] = {};
    const key2 = canonical2[v2Lower];
    cross[v1][key2] = (cross[v1][key2] || 0) + 1;
  }

  // Keep only top 12 values of col1 by frequency
  const topV1 = Object.entries(col1Freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([k]) => canonical1[k]);

  const result: Record<string, Record<string, number>> = {};
  for (const v1 of topV1) {
    if (cross[v1]) result[v1] = cross[v1];
  }
  return result;
}
