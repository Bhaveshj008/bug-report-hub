import type { DynamicAggregations, RawRow, AIProvider, ModuleRiskData, DataAnalysis, AISchema } from "@/types/bug";
import { callAI } from "./aiProviders";
import type { ChatEntry } from "./store";
import { buildRAGIndex, retrieveChunks, formatRAGContext } from "./ragEngine";

/**
 * Generates AI insights — sends column distributions with context about data meaning.
 */
export async function generateInsights(
  apiKey: string,
  provider: AIProvider,
  model: string,
  agg: DynamicAggregations,
  bugs: RawRow[],
  moduleRisks?: ModuleRiskData[],
  analysis?: DataAnalysis,
  aiSchema?: AISchema | null
): Promise<string | null> {
  const headers = bugs.length > 0 ? Object.keys(bugs[0]) : [];

  // Build RAG context if analysis is available
  let ragContextStr = "";
  if (analysis) {
    const chunks = buildRAGIndex(bugs, analysis, agg, aiSchema);
    // Ask for broad insights so it grabs everything relevant
    const relevantChunks = retrieveChunks("actionable insights patterns critical finding anomalies risk areas module breakdown", chunks, 30);
    ragContextStr = formatRAGContext(relevantChunks);
  } else {
    // Fallback if no analysis available
    ragContextStr = Object.entries(agg.columnCounts)
      .map(([col, counts]) => {
        const top = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 12);
        const total = Object.values(counts).reduce((s, v) => s + v, 0);
        return `${col} (${Object.keys(counts).length} unique, ${total} filled): ${top.map(([k, v]) => `"${k}"(${v}, ${Math.round((v / total) * 100)}%)`).join(", ")}`;
      })
      .join("\n");
  }

  // Get sample rows with up to 15 columns for context!
  const topHeaders = headers.slice(0, 15);
  const sampleRows = bugs.slice(0, 8).map(r => {
    const compact: Record<string, string> = {};
    for (const h of topHeaders) {
      if (r[h]) compact[h] = String(r[h]).slice(0, 120);
    }
    return compact;
  });

  // Extract text snippets from likely descriptive columns (e.g. Comments, Bug Description)
  // This restores the AI's ability to see ACTUAL bug details that were previously lost when we filtered out text data.
  const textCols = headers.filter(h => {
    // If a column's name sounds like a descriptive field:
    if (/description|comment|actual|expected|step|title|summary/i.test(h)) return true;
    // Or if the content is long
    const textLength = bugs.slice(0, 8).reduce((sum, r) => sum + String(r[h] || "").length, 0);
    return (textLength / 8) > 25; // average > 25 chars
  }).slice(0, 3);

  let textContextStr = "";
  if (textCols.length > 0) {
    const snippets = textCols.map(col => {
      const texts = bugs
        .map(r => String(r[col] || "").trim().replace(/\n/g, " "))
        .filter(v => v.length > 15)
        .slice(0, 15); // Show 15 examples per text column
      if (texts.length === 0) return null;
      return `${col}:\n- ${texts.join("\n- ")}`;
    }).filter(Boolean);
    
    if (snippets.length > 0) {
      textContextStr = `\nQUALITATIVE TEXT EXAMPLES (Actual user input):\n` + snippets.join("\n\n") + `\n`;
    }
  }

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
  let moduleContext = "";
  if (moduleRisks && moduleRisks.length > 0) {
    const riskiest = moduleRisks.slice(0, 5).map(m => 
      `${m.module} (Score: ${m.riskScore}/100, Level: ${m.riskLevel}, ${m.total} items)`
    ).join("\n- ");
    moduleContext = `\nMODULE HEATMAP (Riskiest Components):\n- ${riskiest}\n`;
  }

  const prompt = `You are a Principal Engineer / CTO. Your job is to make HARD, DECISIVE engineering and resource allocation calls based on the provided dataset. Do NOT write a story. Do NOT be conversational or passive. Be assertive, direct, and actionable.

${domainHint}

DATASET: ${agg.total} rows, ${headers.length} columns
COLUMNS: ${headers.join(", ")}

DEEP SEMANTIC CONTEXT (RAG Generated):
${ragContextStr}

${textContextStr}
${moduleContext}
SAMPLE ROWS (for understanding data context):
${JSON.stringify(sampleRows, null, 1)}

IMPORTANT INSTRUCTIONS:
- You must make definitive decisions (e.g., "Halt feature development in the Auth module and allocate 3 engineers to address the 45 Critical bugs.").
- Reference ACTUAL data points (numbers, percentages, module names, specific categories) to justify every decision.
- Avoid vague advice like "monitor closely" or "improve quality". Name the exactly module, the exact issue, and the concrete action to take.
- If it's a bug/issue dataset, pinpoint exactly where the systemic failure is happening and how to patch it.
- Never write paragraphs of text. Use terse, punchy bullet points.

Format STRICTLY as markdown:
## 🎯 Strategic Directives
(Top 2-3 immediate, hard decisions that must be executed right now. Include the data that forced this decision.)

## 🔴 Systemic Failures
(Pinpoint the root causes or worst performing areas. E.g., "Module X accounts for 80% of all P1s — architecture review required.")

## ⚠️ Risk & Resource Reallocation
(Where are we exposed? What needs immediate staffing/attention based on the data?)

## 🛠️ Prescriptive Next Steps
(A checklist of exact, concrete actions to take in the next sprint based on the data anomalies)

## 📋 Data Confidence Score: X/10
(Based on completeness and fill rates — state explicitly how reliable this data is for making decisions)`;

  return callAI(apiKey, provider, model, [{ role: "user", content: prompt }], { maxTokens: 1500 });
}

/**
 * Context-aware Q&A: sends aggregated stats + chat history + module risks
 */
export async function askAboutBugs(
  apiKey: string,
  provider: AIProvider,
  model: string,
  question: string,
  bugs: RawRow[],
  history: ChatEntry[],
  agg: DynamicAggregations,
  moduleRisks?: ModuleRiskData[],
  analysis?: DataAnalysis,
  aiSchema?: AISchema | null
): Promise<string | null> {
  const headers = bugs.length > 0 ? Object.keys(bugs[0]) : [];

  // Use specific RAG context focused on the user's question
  let ragContextStr = "";
  if (analysis) {
    const chunks = buildRAGIndex(bugs, analysis, agg, aiSchema);
    // Request specifically on user query
    const relevantChunks = retrieveChunks(question, chunks, 20);
    ragContextStr = formatRAGContext(relevantChunks);
  } else {
    // Fallback to simple subset
    ragContextStr = Object.entries(agg.columnCounts)
      .slice(0, 10)
      .map(([col, counts]) => {
        const top = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10);
        const total = Object.values(counts).reduce((s, v) => s + v, 0);
        return `${col} (${Object.keys(counts).length} unique): ${top.map(([k, v]) => `"${k}"(${v}, ${Math.round((v / total) * 100)}%)`).join(", ")}`;
      })
      .join("\n");
  }

  // Smart filtering: find rows relevant to the question
  const qLower = question.toLowerCase();
  const keywords = qLower.split(/\s+/).filter(w => w.length > 2);

  let relevantRows = bugs.filter(row => {
    const text = Object.values(row).join(" ").toLowerCase();
    return keywords.some(kw => text.includes(kw));
  });

  if (relevantRows.length === 0) relevantRows = bugs.slice(0, 20);

  // Include most columns for context, prioritize text columns over IDs
  const sampleRows = relevantRows.slice(0, 25).map(r => {
    const compact: Record<string, string> = {};
    // Sort headers: text-like fields first, IDs last
    const sortedHeaders = [...headers].sort((a, b) => {
      const aIsId = /id|key|no|#/.test(a.toLowerCase());
      const bIsId = /id|key|no|#/.test(b.toLowerCase());
      if (aIsId && !bIsId) return 1;
      if (!aIsId && bIsId) return -1;
      return 0;
    }).slice(0, 15);

    for (const h of sortedHeaders) {
      if (r[h]) compact[h] = String(r[h]).slice(0, 150);
    }
    return compact;
  });

  let moduleContext = "";
  if (moduleRisks && moduleRisks.length > 0) {
    const riskiest = moduleRisks.slice(0, 8).map(m => 
      `${m.module} (Score: ${m.riskScore}, ${m.riskLevel}, ${m.total} items)`
    ).join("\n");
    moduleContext = `\nHIGHEST RISK MODULES:\n${riskiest}\n`;
  }

  const historyContext = history.length > 0 
    ? `\nPREVIOUS CHAT HISTORY:\n${history.slice(-4).map(h => `User: ${h.q}\nAssistant: ${h.a}`).join("\n")}\n` 
    : "";

  const prompt = `You are a data analyst answering questions about this dataset.

COLUMNS: ${headers.join(", ")}

STATS CONTEXT (${agg.total} rows, retrieved using RAG search for "${question}"):
${ragContextStr}
${moduleContext}
RELEVANT ROWS (${relevantRows.length} of ${bugs.length} matched the question keywords):
${JSON.stringify(sampleRows)}
${historyContext}
USER QUESTION: ${question}

Answer concisely. Use ACTUAL data values and percentages. Be specific, not generic. Do not mention the provided JSON structure, just answer the question in markdown.`;

  return callAI(apiKey, provider, model, [{ role: "user", content: prompt }], { maxTokens: 800 });
}
