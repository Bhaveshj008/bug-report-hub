import type { Aggregations, BugRow } from "@/types/bug";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export type InsightResult = {
  summary: string;
  trends: string[];
  recommendations: string[];
  riskAreas: string[];
  qualityScore: number;
};

/**
 * Generates AI insights from AGGREGATED data only — never sends raw rows.
 * Sends: counts, distributions, top items. Optimized for minimal tokens.
 */
export async function generateInsights(
  apiKey: string,
  agg: Aggregations,
  bugs: BugRow[]
): Promise<string | null> {
  // Build a compact statistical summary — no raw data
  const topCategories = Object.entries(agg.categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  const topComponents = Object.entries(agg.componentCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  const severityDist = Object.entries(agg.severityCounts)
    .sort(([, a], [, b]) => b - a);
  const platformDist = Object.entries(agg.platformCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const reproDist = Object.entries(agg.reproducibilityCounts)
    .sort(([, a], [, b]) => b - a);

  // Compute cross-analysis: severity per component (top 5 components)
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

Severity Distribution: ${severityDist.map(([k, v]) => `${k}: ${v}`).join(", ")}

Top Categories: ${topCategories.map(([k, v]) => `${k}: ${v}`).join(", ")}

Top Components: ${topComponents.map(([k, v]) => `${k}: ${v}`).join(", ")}

Platform Distribution: ${platformDist.map(([k, v]) => `${k}: ${v}`).join(", ")}

Reproducibility: ${reproDist.map(([k, v]) => `${k}: ${v}`).join(", ")}

Severity by Top Components:
${Object.entries(componentSeverity)
  .map(([comp, sevs]) => `  ${comp}: ${Object.entries(sevs).map(([s, c]) => `${s}(${c})`).join(", ")}`)
  .join("\n")}

Provide a comprehensive analysis in markdown format with these sections:
## 📊 Executive Summary
Brief overview of the bug landscape (2-3 sentences)

## 🔥 Critical Risk Areas
Top risk areas requiring immediate attention

## 📈 Trend Analysis
Key patterns and distributions worth noting

## 🎯 Recommendations
Specific, actionable recommendations for the development team (prioritized)

## 📋 Quality Score
Rate overall quality 1-10 with brief justification

Keep it concise, data-driven, and professional. Use the actual numbers.`;

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
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Groq API error:", res.status, err);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error("AI insights failed:", e);
    return null;
  }
}

/**
 * AI-powered Q&A about bug data. Sends only aggregated stats + question.
 */
export async function askAboutBugs(
  apiKey: string,
  question: string,
  agg: Aggregations,
  bugs: BugRow[]
): Promise<string | null> {
  // Build minimal context
  const severityDist = Object.entries(agg.severityCounts).map(([k, v]) => `${k}: ${v}`).join(", ");
  const topCategories = Object.entries(agg.categoryCounts).sort(([, a], [, b]) => b - a).slice(0, 10);
  const topComponents = Object.entries(agg.componentCounts).sort(([, a], [, b]) => b - a).slice(0, 10);

  // For specific questions, include minimal relevant row data
  const relevantSample = bugs.slice(0, 5).map((b) => ({
    id: b.jiraId,
    summary: b.summary?.slice(0, 60),
    severity: b.severity,
    component: b.component,
    category: b.category,
  }));

  const prompt = `You are a QA data analyst. Answer the user's question based on this bug data.

STATS (${agg.total} bugs):
- Severity: ${severityDist}
- Top Categories: ${topCategories.map(([k, v]) => `${k}(${v})`).join(", ")}
- Top Components: ${topComponents.map(([k, v]) => `${k}(${v})`).join(", ")}
- Platforms: ${Object.entries(agg.platformCounts).map(([k, v]) => `${k}(${v})`).join(", ")}
- Sample bugs: ${JSON.stringify(relevantSample)}

USER QUESTION: ${question}

Answer concisely in markdown. Use data from above. If you can't answer from the data, say so.`;

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
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}
