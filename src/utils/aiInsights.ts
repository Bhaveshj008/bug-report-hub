import type { DynamicAggregations, RawRow, AIProvider } from "@/types/bug";
import { callAI } from "./aiProviders";

/**
 * Generates AI insights from data — sends column distributions, never all raw rows.
 */
export async function generateInsights(
  apiKey: string,
  provider: AIProvider,
  model: string,
  agg: DynamicAggregations,
  bugs: RawRow[]
): Promise<string | null> {
  const headers = bugs.length > 0 ? Object.keys(bugs[0]) : [];
  
  // Build column summaries
  const columnSummaries = Object.entries(agg.columnCounts)
    .map(([col, counts]) => {
      const top = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 8);
      return `${col}: ${top.map(([k, v]) => `${k}(${v})`).join(", ")}`;
    })
    .join("\n");

  const prompt = `You are a data analytics expert. Analyze this spreadsheet data and provide actionable insights.

DATA SUMMARY (${agg.total} total rows, ${headers.length} columns):
Columns: ${headers.join(", ")}

VALUE DISTRIBUTIONS:
${columnSummaries}

Provide analysis in markdown:
## 📊 Executive Summary
## 🔥 Key Findings
## 📈 Pattern Analysis
## 🎯 Recommendations
## 📋 Data Quality Score (1-10)
Be concise, data-driven, professional. Use actual numbers.`;

  return callAI(apiKey, provider, model, [{ role: "user", content: prompt }], { maxTokens: 1200 });
}

/**
 * RAG-like Q&A: sends aggregated stats + keyword-filtered rows
 */
export async function askAboutBugs(
  apiKey: string,
  provider: AIProvider,
  model: string,
  question: string,
  agg: DynamicAggregations,
  bugs: RawRow[]
): Promise<string | null> {
  const headers = bugs.length > 0 ? Object.keys(bugs[0]) : [];
  
  const columnSummaries = Object.entries(agg.columnCounts)
    .slice(0, 10)
    .map(([col, counts]) => {
      const top = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10);
      return `${col}: ${top.map(([k, v]) => `${k}(${v})`).join(", ")}`;
    })
    .join("\n");

  // Smart filtering: find rows relevant to the question
  const qLower = question.toLowerCase();
  const keywords = qLower.split(/\s+/).filter(w => w.length > 2);

  let relevantRows = bugs.filter(row => {
    const text = Object.values(row).join(" ").toLowerCase();
    return keywords.some(kw => text.includes(kw));
  });

  if (relevantRows.length === 0) relevantRows = bugs.slice(0, 20);

  // Compact format: only include first 5 columns per row
  const compactHeaders = headers.slice(0, 6);
  const sampleRows = relevantRows.slice(0, 30).map(r => {
    const compact: Record<string, string> = {};
    for (const h of compactHeaders) compact[h] = (r[h] || "").slice(0, 80);
    return compact;
  });

  const prompt = `You are a data analyst. Answer using this data.

STATS (${agg.total} rows):
${columnSummaries}

RELEVANT ROWS (${relevantRows.length} of ${bugs.length} matched):
${JSON.stringify(sampleRows)}

QUESTION: ${question}

Answer concisely in markdown. Use actual data.`;

  return callAI(apiKey, provider, model, [{ role: "user", content: prompt }], { maxTokens: 800 });
}
