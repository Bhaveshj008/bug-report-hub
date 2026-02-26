import type { Aggregations, BugRow, AIProvider } from "@/types/bug";
import { callAI } from "./aiProviders";

/**
 * Generates AI insights from AGGREGATED data only — never sends raw rows.
 */
export async function generateInsights(
  apiKey: string,
  provider: AIProvider,
  model: string,
  agg: Aggregations,
  bugs: BugRow[]
): Promise<string | null> {
  const topCategories = Object.entries(agg.categoryCounts).sort(([, a], [, b]) => b - a).slice(0, 8);
  const topComponents = Object.entries(agg.componentCounts).sort(([, a], [, b]) => b - a).slice(0, 8);
  const severityDist = Object.entries(agg.severityCounts).sort(([, a], [, b]) => b - a);
  const platformDist = Object.entries(agg.platformCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
  const reproDist = Object.entries(agg.reproducibilityCounts).sort(([, a], [, b]) => b - a);

  // Cross-analysis: severity per component (top 5)
  const componentSeverity: Record<string, Record<string, number>> = {};
  for (const comp of topComponents.slice(0, 5).map(([c]) => c)) {
    componentSeverity[comp] = {};
    for (const bug of bugs) {
      if (bug.component === comp) {
        const sev = bug.severity || "Unknown";
        componentSeverity[comp][sev] = (componentSeverity[comp][sev] || 0) + 1;
      }
    }
  }

  const prompt = `You are a QA analytics expert. Analyze this bug report data and provide actionable insights for a client presentation.

DATA SUMMARY (${agg.total} total bugs):
Severity: ${severityDist.map(([k, v]) => `${k}: ${v}`).join(", ")}
Top Categories: ${topCategories.map(([k, v]) => `${k}: ${v}`).join(", ")}
Top Components: ${topComponents.map(([k, v]) => `${k}: ${v}`).join(", ")}
Platforms: ${platformDist.map(([k, v]) => `${k}: ${v}`).join(", ")}
Reproducibility: ${reproDist.map(([k, v]) => `${k}: ${v}`).join(", ")}
Severity by Component:
${Object.entries(componentSeverity).map(([comp, sevs]) => `  ${comp}: ${Object.entries(sevs).map(([s, c]) => `${s}(${c})`).join(", ")}`).join("\n")}

Provide analysis in markdown:
## 📊 Executive Summary
## 🔥 Critical Risk Areas
## 📈 Trend Analysis
## 🎯 Recommendations
## 📋 Quality Score (1-10)
Be concise, data-driven, professional. Use actual numbers.`;

  return callAI(apiKey, provider, model, [{ role: "user", content: prompt }], { maxTokens: 1200 });
}

/**
 * RAG-like Q&A: Hybrid approach
 * - Always sends aggregated stats
 * - Smart-filters relevant rows based on question keywords
 * - Limits to max 30 rows to optimize tokens
 */
export async function askAboutBugs(
  apiKey: string,
  provider: AIProvider,
  model: string,
  question: string,
  agg: Aggregations,
  bugs: BugRow[]
): Promise<string | null> {
  const severityDist = Object.entries(agg.severityCounts).map(([k, v]) => `${k}: ${v}`).join(", ");
  const topCategories = Object.entries(agg.categoryCounts).sort(([, a], [, b]) => b - a).slice(0, 10);
  const topComponents = Object.entries(agg.componentCounts).sort(([, a], [, b]) => b - a).slice(0, 10);

  // Smart filtering: find rows relevant to the question
  const qLower = question.toLowerCase();
  const keywords = qLower.split(/\s+/).filter((w) => w.length > 2);

  let relevantRows = bugs.filter((bug) => {
    const text = `${bug.summary} ${bug.component} ${bug.category} ${bug.platform} ${bug.severity} ${bug.jiraId}`.toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  });

  // If no keyword matches, take a diverse sample
  if (relevantRows.length === 0) {
    relevantRows = bugs.slice(0, 20);
  }

  // Limit to 30 rows, compact format
  const sampleRows = relevantRows.slice(0, 30).map((b) => ({
    id: b.jiraId,
    s: b.summary?.slice(0, 80),
    sev: b.severity,
    comp: b.component,
    cat: b.category,
    plat: b.platform,
    repro: b.reproducibility,
  }));

  const prompt = `You are a QA data analyst. Answer the question using this bug data.

STATS (${agg.total} bugs):
- Severity: ${severityDist}
- Categories: ${topCategories.map(([k, v]) => `${k}(${v})`).join(", ")}
- Components: ${topComponents.map(([k, v]) => `${k}(${v})`).join(", ")}
- Platforms: ${Object.entries(agg.platformCounts).map(([k, v]) => `${k}(${v})`).join(", ")}
- Reproducibility: ${Object.entries(agg.reproducibilityCounts).map(([k, v]) => `${k}(${v})`).join(", ")}

RELEVANT BUGS (${relevantRows.length} of ${bugs.length} matched):
${JSON.stringify(sampleRows)}

QUESTION: ${question}

Answer concisely in markdown. Use actual data. If you can't fully answer from the data provided, say what's missing.`;

  return callAI(apiKey, provider, model, [{ role: "user", content: prompt }], { maxTokens: 800 });
}
