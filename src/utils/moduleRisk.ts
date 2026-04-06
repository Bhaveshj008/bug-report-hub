/**
 * Module Risk Engine — calculates risk scores per module for health map visualization.
 * Auto-detects module and risk columns, computes weighted risk scores, and normalizes them.
 */
import type {
  RawRow, DataAnalysis, DynamicAggregations, AISchema, ModuleRiskData, DetectedDataType,
} from "@/types/bug";
import { detectDataTypeHeuristic } from "./aiSchema";

const INTERNAL_COLUMNS = ["__sheet"];

// ─── Color palette ──────────────────────────────────────────────────────────

export const RISK_COLORS = {
  Critical: "#ef4444",  // Red — severe, release-blocking issues
  High: "#f97316",  // Orange — high impact, needs urgent attention
  Medium: "#eab308",  // Yellow — moderate, should be tracked
  Low: "#06b6d4",  // Cyan — minimal impact, low priority
  Safe: "#22c55e",  // Green — no significant issues detected
} as const;

// Severity/result → color mapping for consistent chart coloring
export const VALUE_COLORS: Record<string, string> = {
  // Severity
  critical: "#dc2626", blocker: "#dc2626",
  high: "#f97316",
  medium: "#eab308", major: "#eab308",
  low: "#22c55e", minor: "#22c55e",
  // Results
  pass: "#22c55e", passed: "#22c55e",
  fail: "#dc2626", failed: "#dc2626",
  blocked: "#f97316", block: "#f97316",
  "not executed": "#94a3b8", skipped: "#94a3b8", "n/a": "#94a3b8",
  // Status
  open: "#dc2626", new: "#dc2626", reopened: "#dc2626",
  closed: "#22c55e", fixed: "#22c55e", resolved: "#22c55e", done: "#22c55e",
  "in progress": "#f97316", active: "#f97316",
  // Priority
  p1: "#dc2626",
  p2: "#f97316",
  p3: "#eab308",
  p4: "#22c55e",
};

export function getValueColor(value: string): string {
  return VALUE_COLORS[value.toLowerCase()] || "#6b7280";
}

// ─── Module column detection ────────────────────────────────────────────────

const MODULE_KEYWORDS = /\b(module|component|feature|area|section|application|service|page|screen|subsystem|functionality)\b/i;

export function detectModuleColumn(
  analysis: DataAnalysis,
  aiSchema?: AISchema | null
): string | null {
  // AI schema takes priority
  if (aiSchema?.columnMap?.moduleColumn) {
    const col = analysis.columns.find(c => c.name === aiSchema.columnMap.moduleColumn);
    if (col && col.type === "categorical" && col.uniqueCount >= 2) return col.name;
  }

  // Heuristic detection
  const candidates = analysis.columns.filter(c =>
    c.type === "categorical" &&
    !INTERNAL_COLUMNS.includes(c.name) &&
    c.uniqueCount >= 2 &&
    c.uniqueCount <= 100 &&
    c.fillRate > 40 &&
    MODULE_KEYWORDS.test(c.name)
  );

  if (candidates.length > 0) {
    // Prefer the one with the most heuristic-friendly unique count
    return candidates.sort((a, b) => {
      const aScore = a.uniqueCount >= 3 && a.uniqueCount <= 30 ? 10 : 0;
      const bScore = b.uniqueCount >= 3 && b.uniqueCount <= 30 ? 10 : 0;
      return (bScore - aScore) || (b.fillRate - a.fillRate);
    })[0].name;
  }

  return null;
}

// ─── Risk column detection ──────────────────────────────────────────────────

type RiskColumnInfo = {
  column: string;
  type: "severity" | "priority" | "result" | "status";
};

export function detectRiskColumn(
  analysis: DataAnalysis,
  aiSchema?: AISchema | null
): RiskColumnInfo | null {
  const cols = analysis.columns.filter(c =>
    c.type === "categorical" && !INTERNAL_COLUMNS.includes(c.name) && c.fillRate > 30
  );

  // Check AI schema first
  const isQA = aiSchema?.dataType === "test_case" || aiSchema?.dataType === "test_execution" ||
    cols.some(c => /\b(result|outcome|pass|fail)\b/i.test(c.name));

  if (aiSchema?.columnMap) {
    if (isQA && aiSchema.columnMap.resultColumn) {
      const c = cols.find(c => c.name === aiSchema.columnMap.resultColumn);
      if (c) return { column: c.name, type: "result" };
    }
    if (aiSchema.columnMap.severityColumn) {
      const c = cols.find(c => c.name === aiSchema.columnMap.severityColumn);
      if (c) return { column: c.name, type: "severity" };
    }
    if (!isQA && aiSchema.columnMap.resultColumn) {
      const c = cols.find(c => c.name === aiSchema.columnMap.resultColumn);
      if (c) return { column: c.name, type: "result" };
    }
    if (aiSchema.columnMap.priorityColumn) {
      const c = cols.find(c => c.name === aiSchema.columnMap.priorityColumn);
      if (c) return { column: c.name, type: "priority" };
    }
    if (aiSchema.columnMap.statusColumn) {
      const c = cols.find(c => c.name === aiSchema.columnMap.statusColumn);
      if (c) return { column: c.name, type: "status" };
    }
  }

  // Heuristic priorities based on inferred data type
  if (isQA) {
    for (const col of cols) {
      if (/\b(result|outcome|verdict|execution)\b/i.test(col.name)) return { column: col.name, type: "result" };
    }
    for (const col of cols) {
      if (/\b(severity|sev)\b/i.test(col.name)) return { column: col.name, type: "severity" };
    }
  } else {
    for (const col of cols) {
      if (/\b(severity|sev)\b/i.test(col.name)) return { column: col.name, type: "severity" };
    }
    for (const col of cols) {
      if (/\b(result|outcome|verdict)\b/i.test(col.name)) return { column: col.name, type: "result" };
    }
  }
  for (const col of cols) {
    const n = col.name.toLowerCase();
    if (/\b(priority|pri)\b/.test(n)) return { column: col.name, type: "priority" };
  }
  for (const col of cols) {
    const n = col.name.toLowerCase();
    if (/\b(status|state)\b/.test(n)) return { column: col.name, type: "status" };
  }

  return null;
}

// ─── Risk score calculation ─────────────────────────────────────────────────

// Weight maps for different data types
const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 4, blocker: 4,
  high: 2,
  medium: 1, major: 1,
  low: 0.25, minor: 0.25,
};

const RESULT_WEIGHTS: Record<string, number> = {
  fail: 3, failed: 3,
  blocked: 2, block: 2,
  "not executed": 1, skipped: 1, "n/a": 1, "not run": 1,
  pass: 0, passed: 0,
};

const PRIORITY_WEIGHTS: Record<string, number> = {
  p1: 3, critical: 3, high: 3, highest: 3,
  p2: 1.5, medium: 1.5,
  p3: 0.5, low: 0.5,
  p4: 0.1, lowest: 0.1,
};

const STATUS_WEIGHTS: Record<string, number> = {
  // Bug tracking
  open: 3, new: 3, "in progress": 2, active: 2, reopened: 3,
  closed: 0, fixed: 0, resolved: 0, done: 0,
  // Execution/Test/API
  error: 3, fail: 3, failed: 3, exception: 3,
  timeout: 3, blocked: 2,
  success: 0, passed: 0, pass: 0, ok: 0,
};

function getWeightMap(riskType: "severity" | "priority" | "result" | "status"): Record<string, number> {
  switch (riskType) {
    case "severity": return SEVERITY_WEIGHTS;
    case "result": return RESULT_WEIGHTS;
    case "priority": return PRIORITY_WEIGHTS;
    case "status": return STATUS_WEIGHTS;
  }
}

export function getRiskLevel(score: number): ModuleRiskData["riskLevel"] {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  if (score >= 20) return "Low";
  return "Safe";
}

export function getRiskColor(score: number): string {
  if (score >= 80) return RISK_COLORS.Critical;
  if (score >= 60) return RISK_COLORS.High;
  if (score >= 40) return RISK_COLORS.Medium;
  if (score >= 20) return RISK_COLORS.Low;
  return RISK_COLORS.Safe;
}

// ─── Main calculation ───────────────────────────────────────────────────────

export function calculateModuleRisks(
  rows: RawRow[],
  moduleCol: string,
  riskCol: string,
  riskType: "severity" | "priority" | "result" | "status"
): ModuleRiskData[] {
  const weights = getWeightMap(riskType);

  // Single-pass: build module → { total, breakdown, rawScore, maxStructuredWeight, maxInferredWeight }
  // We track structured vs inferred weights separately so floor overrides only apply for
  // recognized values like "Critical" or "Fail", NOT for vague free-text inferences.
  const moduleData: Record<string, {
    total: number;
    breakdown: Record<string, number>;
    rawScore: number;
    maxStructuredWeight: number;  // from recognized values (Critical, Fail, P1, etc.)
    maxInferredWeight: number;    // from free-text heuristic guesses
  }> = {};
  const moduleCanonical: Record<string, string> = {};
  const riskCanonical: Record<string, string> = {};

  for (const row of rows) {
    const mod = (row[moduleCol] || "").trim();
    const risk = (row[riskCol] || "").trim();
    if (!mod) continue;

    const modLower = mod.toLowerCase();
    if (!moduleCanonical[modLower]) moduleCanonical[modLower] = mod;
    const canonical = moduleCanonical[modLower];

    if (!moduleData[canonical]) moduleData[canonical] = {
      total: 0, breakdown: {}, rawScore: 0, maxStructuredWeight: 0, maxInferredWeight: 0,
    };
    moduleData[canonical].total++;

    if (risk) {
      const riskLower = risk.toLowerCase();
      if (!riskCanonical[riskLower]) riskCanonical[riskLower] = risk;
      const canonicalRisk = riskCanonical[riskLower];

      moduleData[canonical].breakdown[canonicalRisk] = (moduleData[canonical].breakdown[canonicalRisk] || 0) + 1;

      // Find weight for this value using known patterns
      let w = 0;
      let matched = false;
      for (const [pattern, weight] of Object.entries(weights)) {
        if (riskLower === pattern || riskLower.includes(pattern)) {
          w = weight;
          matched = true;
          break;
        }
      }

      // ── Fallback for free-text QA descriptions ──────────────────────────────
      // When testers write observations like "User is not able to login" instead
      // of standard values like "Fail", we infer a LOWER weight so these don't
      // overwhelm the scoring and make every module look equally risky.
      if (!matched && riskLower.length > 10) {
        const FAIL_PHRASES = [
          "not able", "unable", "not display", "not work", "not function",
          "not show", "not load", "not save", "not submit", "not allow",
          "invalid", "incorrect", "error", "exception", "crash", "broken",
          "wrong", "missing", "issue", "problem", "bug", "defect",
          "allowing", "allows",
          "not enter", "not edit", "not update", "not delete", "not access",
          "not redirect", "mismatch", "unexpected",
        ];
        const PASS_PHRASES = [
          "working", "as expected", "successfully", "correct", "valid",
          "pass", "ok ", " ok", "done", "good", "proper", "verified",
          "able to",
        ];

        const isFailLike = FAIL_PHRASES.some(p => riskLower.includes(p));
        const isPassLike = PASS_PHRASES.some(p => riskLower.includes(p));

        if (isFailLike && !isPassLike) {
          // Inferred failure — use a moderate weight but track as inferred
          w = riskType === "result" ? 1.5 : 0.75;
        } else if (!isPassLike) {
          // Unrecognized long text — very small weight
          w = 0.15;
        }
        // If isPassLike → w stays 0

        moduleData[canonical].rawScore += w;
        moduleData[canonical].maxInferredWeight = Math.max(moduleData[canonical].maxInferredWeight, w);
      } else {
        moduleData[canonical].rawScore += w;
        if (matched) {
          moduleData[canonical].maxStructuredWeight = Math.max(moduleData[canonical].maxStructuredWeight, w);
        }
      }
    }
  }

  // Normalize scores
  const modules = Object.entries(moduleData);
  if (modules.length === 0) return [];

  // For result-based and status-based scoring, divide by total first (rate-based).
  // Max structured weight for both is 3, so dividing by (total * 3) gives a pure 0-100 scale.
  if (riskType === "result" || riskType === "status") {
    for (const [, data] of modules) {
      if (data.total > 0) {
        data.rawScore = (data.rawScore / (data.total * 3)) * 100;
      }
    }
  }

  const maxRaw = Math.max(...modules.map(([, d]) => d.rawScore), 0.001);

  return modules.map(([name, data]) => {
    const normalized = (riskType === "result" || riskType === "status")
      ? Math.min(data.rawScore, 100)
      : (data.rawScore / maxRaw) * 100;

    // ── Absolute floor overrides ──
    // ONLY apply for absolute severity/priority (e.g. 1 Critical bug = floor 80).
    // Free-text inferred weights are ignored for these floors.
    let finalScore = Math.round(normalized);

    if (riskType === "severity") {
      if (data.maxStructuredWeight >= 4 && finalScore < 80) finalScore = 80;
      else if (data.maxStructuredWeight >= 2 && finalScore < 60) finalScore = 60;
    }

    // For rate-driven metrics (results, statuses like Open/Close), we DO NOT
    // enforce absolute floors. A single "Error" in 500 requests shouldn't make the module High risk.

    if (riskType === "priority") {
      if (data.maxStructuredWeight >= 3 && finalScore < 80) finalScore = 80;
      else if (data.maxStructuredWeight >= 1.5 && finalScore < 60) finalScore = 60;
    }

    return {
      module: name,
      total: data.total,
      riskScore: finalScore,
      riskLevel: getRiskLevel(finalScore),
      breakdown: data.breakdown,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

// ─── Summary stats for the legend ───────────────────────────────────────────

export function getRiskLevelCounts(modules: ModuleRiskData[]): Record<ModuleRiskData["riskLevel"], number> {
  const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Safe: 0 };
  for (const m of modules) {
    counts[m.riskLevel] = (counts[m.riskLevel] || 0) + 1;
  }
  return counts as Record<ModuleRiskData["riskLevel"], number>;
}

// ─── Build treemap data structure ───────────────────────────────────────────

export function buildTreemapData(modules: ModuleRiskData[]) {
  return modules.map(m => ({
    name: m.module,
    value: m.total,
    riskScore: m.riskScore,
    riskLevel: m.riskLevel,
    breakdown: m.breakdown,
    itemStyle: {
      color: getRiskColor(m.riskScore),
      borderColor: "rgba(255,255,255,0.15)",
      borderWidth: 2,
    },
  }));
}

// ─── Build mindmap data structure ───────────────────────────────────────────

export function buildMindmapData(modules: ModuleRiskData[]) {
  return {
    name: "All Modules",
    itemStyle: { color: "#334155", borderColor: "#475569" },
    children: modules.map(m => ({
      name: m.module,
      value: m.total,
      riskScore: m.riskScore,
      riskLevel: m.riskLevel,
      breakdown: m.breakdown,
      itemStyle: {
        color: getRiskColor(m.riskScore),
        borderColor: "rgba(255,255,255,0.2)",
        borderWidth: 1,
      },
      // Optionally could add severity breakdown as leaves, but keep it clean
      // by just leaving modules as the leaves, colored by risk.
    })),
  };
}
