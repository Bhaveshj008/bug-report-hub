import type { DynamicAggregations, RawRow, AIProvider } from "@/types/bug";
import { callAI } from "./aiProviders";

/**
 * Generates AI insights — sends column distributions with context about data meaning.
 */
export async function generateInsights(
  apiKey: string,
  provider: AIProvider,
  model: string,
  agg: DynamicAggregations,
  bugs: RawRow[]
): Promise<string | null> {
  const headers = bugs.length > 0 ? Object.keys(bugs[0]) : [];

  // Build rich column summaries
  const columnSummaries = Object.entries(agg.columnCounts)
    .map(([col, counts]) => {
      const top = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 12);
      const total = Object.values(counts).reduce((s, v) => s + v, 0);
      return `${col} (${Object.keys(counts).length} unique, ${total} filled): ${top.map(([k, v]) => `"${k}"(${v}, ${Math.round((v / total) * 100)}%)`).join(", ")}`;
    })
    .join("\n");

  // Get sample rows with ALL columns for context
  const sampleRows = bugs.slice(0, 5).map(r => {
    const compact: Record<string, string> = {};
    for (const h of headers) compact[h] = (r[h] || "").slice(0, 100);
    return compact;
  });

  // Detect data domain from column names
  const headerStr = headers.join(", ").toLowerCase();
  let domainHint = "";
  if (headerStr.includes("bug") || headerStr.includes("defect") || headerStr.includes("severity")) {
    domainHint = "This appears to be BUG/DEFECT TRACKING data.";
  } else if (headerStr.includes("test") || headerStr.includes("pass") || headerStr.includes("fail")) {
    domainHint = "This appears to be TEST CASE/QA data.";
  } else if (headerStr.includes("sale") || headerStr.includes("revenue") || headerStr.includes("price")) {
    domainHint = "This appears to be SALES/REVENUE data.";
  } else if (headerStr.includes("employee") || headerStr.includes("department") || headerStr.includes("salary")) {
    domainHint = "This appears to be HR/EMPLOYEE data.";
  } else if (headerStr.includes("customer") || headerStr.includes("order")) {
    domainHint = "This appears to be CUSTOMER/ORDER data.";
  }

  const prompt = `You are a senior data analyst. Analyze this dataset deeply and provide SPECIFIC, ACTIONABLE insights. Do NOT give generic advice.

${domainHint}

DATASET: ${agg.total} rows, ${headers.length} columns
COLUMNS: ${headers.join(", ")}

DETAILED VALUE DISTRIBUTIONS:
${columnSummaries}

SAMPLE ROWS (for understanding data context):
${JSON.stringify(sampleRows, null, 1)}

IMPORTANT INSTRUCTIONS:
- Reference ACTUAL column names, values, and percentages from the data
- Identify concerning patterns (e.g., if 80% of bugs are "Critical", that's alarming)
- Compare category ratios and highlight imbalances
- Look for correlations between columns (e.g., which module has most critical bugs)
- Give SPECIFIC numbers, not vague statements
- If this is bug data, focus on severity distribution, module hotspots, assignment bottlenecks
- If this is test data, focus on pass/fail rates, coverage gaps
- If this is business data, focus on revenue patterns, top performers, risk areas

Format as markdown:
## 📊 Executive Summary
(2-3 sentences with the most critical finding, using actual numbers)

## 🔥 Critical Findings
(Top 3-4 specific data-backed findings with actual values and percentages)

## 📈 Pattern Analysis
(Cross-column patterns, correlations, trends spotted in distributions)

## ⚠️ Risk Areas
(What needs immediate attention based on the data)

## 🎯 Actionable Recommendations
(3-4 specific next steps based on the data patterns)

## 📋 Data Quality Score: X/10
(Based on fill rates, consistency, completeness)`;

  return callAI(apiKey, provider, model, [{ role: "user", content: prompt }], { maxTokens: 1500 });
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
      const total = Object.values(counts).reduce((s, v) => s + v, 0);
      return `${col} (${Object.keys(counts).length} unique): ${top.map(([k, v]) => `"${k}"(${v}, ${Math.round((v / total) * 100)}%)`).join(", ")}`;
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

  // Include all columns for context
  const sampleRows = relevantRows.slice(0, 30).map(r => {
    const compact: Record<string, string> = {};
    for (const h of headers.slice(0, 8)) compact[h] = (r[h] || "").slice(0, 80);
    return compact;
  });

  const prompt = `You are a data analyst. Answer SPECIFICALLY using this data. Reference actual values and numbers.

COLUMNS: ${headers.join(", ")}

STATS (${agg.total} rows):
${columnSummaries}

RELEVANT ROWS (${relevantRows.length} of ${bugs.length} matched):
${JSON.stringify(sampleRows)}

QUESTION: ${question}

Answer concisely in markdown. Use ACTUAL data values and percentages. Be specific, not generic.`;

  return callAI(apiKey, provider, model, [{ role: "user", content: prompt }], { maxTokens: 800 });
}
