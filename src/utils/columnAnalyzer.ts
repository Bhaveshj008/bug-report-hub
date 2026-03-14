import type { RawRow, ColumnAnalysis, ColumnType, ChartSuggestion, DataAnalysis } from "@/types/bug";

const URL_REGEX = /^https?:\/\//i;
const DATE_REGEX = /^\d{1,4}[-\/\.]\d{1,2}[-\/\.]\d{1,4}(\s|T|$)/;
const NUMBER_REGEX = /^-?\d+(\.\d+)?$/;
const CURRENCY_REGEX = /^[\$€£₹¥]?\s*-?\d[\d,]*(\.\d+)?$/;

// Priority keywords for important columns
const PRIORITY_KEYWORDS = [
  "severity", "priority", "status", "type", "category", "module",
  "component", "platform", "environment", "result", "pass", "fail",
  "critical", "high", "medium", "low", "p1", "p2", "p3",
  "department", "region", "country", "state", "city",
  "gender", "age group", "segment", "tier", "level", "grade", "rating",
  "channel", "source", "method", "class", "group",
];

const ID_KEYWORDS = ["id", "no", "number", "sl", "sr", "#", "ticket", "jira", "key", "code", "index"];
const TEXT_KEYWORDS = [
  "description", "summary", "comment", "note", "step", "detail",
  "expected", "actual", "objective", "procedure", "precondition",
  "remarks", "feedback", "review", "body", "content", "message", "bio",
  "address", "url", "link", "path", "email",
];

function detectColumnType(name: string, values: string[]): ColumnType {
  const lowerName = name.toLowerCase().trim();
  const nonEmpty = values.filter(v => v && v.trim());
  
  if (nonEmpty.length === 0) return "text";

  // Name-based hints
  if (ID_KEYWORDS.some(k => lowerName === k || lowerName.endsWith(" " + k) || lowerName.startsWith(k + " ") || lowerName.endsWith("_" + k))) {
    const uniqueRatio = new Set(nonEmpty).size / nonEmpty.length;
    if (uniqueRatio > 0.7) return "id";
  }

  if (lowerName.includes("email") || lowerName.includes("url") || lowerName.includes("link") || lowerName.includes("website")) {
    return "url";
  }

  if (lowerName.includes("date") || lowerName.includes("time") || lowerName.includes("created") || lowerName.includes("updated") || lowerName.includes("timestamp")) {
    return "date";
  }

  // Value-based detection on sample
  const sample = nonEmpty.slice(0, 80);
  
  if (sample.every(v => URL_REGEX.test(v))) return "url";
  
  const dateMatches = sample.filter(v => DATE_REGEX.test(v.trim())).length;
  if (dateMatches > sample.length * 0.6) return "date";
  
  const numMatches = sample.filter(v => NUMBER_REGEX.test(v.trim()) || CURRENCY_REGEX.test(v.trim())).length;
  if (numMatches > sample.length * 0.6) return "numeric";

  // Check if text column
  if (TEXT_KEYWORDS.some(k => lowerName.includes(k))) {
    const avgLen = nonEmpty.reduce((s, v) => s + v.length, 0) / nonEmpty.length;
    if (avgLen > 30) return "text";
  }

  // Categorical detection
  const uniqueCount = new Set(nonEmpty).size;
  const avgLen = nonEmpty.reduce((s, v) => s + v.length, 0) / nonEmpty.length;
  
  // Strong categorical: very few unique values
  if (uniqueCount <= 2 && nonEmpty.length >= 5) return "categorical";
  if (uniqueCount <= 15 && avgLen < 60) return "categorical";
  if (uniqueCount <= 30 && uniqueCount < nonEmpty.length * 0.15 && avgLen < 50) return "categorical";
  if (uniqueCount <= 50 && uniqueCount < nonEmpty.length * 0.08 && avgLen < 40) return "categorical";
  
  // Long text
  if (avgLen > 50) return "text";
  
  // ID-like: high uniqueness
  if (uniqueCount > nonEmpty.length * 0.8) return "id";
  
  return uniqueCount < nonEmpty.length * 0.4 ? "categorical" : "text";
}

export function analyzeColumns(rows: RawRow[]): DataAnalysis {
  if (rows.length === 0) return { columns: [], chartSuggestions: [], kpiColumns: [], totalRows: 0 };

  const headers = Object.keys(rows[0]);
  const columns: ColumnAnalysis[] = [];

  for (const header of headers) {
    const values = rows.map(r => r[header] || "");
    const nonEmpty = values.filter(v => v.trim());
    const type = detectColumnType(header, nonEmpty);
    
    const counts: Record<string, number> = {};
    for (const v of nonEmpty) {
      const val = v.trim();
      if (val) counts[val] = (counts[val] || 0) + 1;
    }

    const topValues = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([value, count]) => ({ value, count }));

    columns.push({
      name: header,
      type,
      uniqueCount: new Set(nonEmpty).size,
      totalCount: nonEmpty.length,
      topValues,
      fillRate: rows.length > 0 ? (nonEmpty.length / rows.length) * 100 : 0,
    });
  }

  const chartSuggestions = generateChartSuggestions(columns);
  const kpiColumns = pickKPIColumns(columns);

  return { columns, chartSuggestions, kpiColumns, totalRows: rows.length };
}

function generateChartSuggestions(columns: ColumnAnalysis[]): ChartSuggestion[] {
  const suggestions: ChartSuggestion[] = [];
  const categoricals = columns.filter(c => c.type === "categorical" && c.fillRate > 20 && c.uniqueCount >= 2);

  // Sort: priority keywords first, then fewer unique values
  const sorted = [...categoricals].sort((a, b) => {
    const aPri = PRIORITY_KEYWORDS.some(k => a.name.toLowerCase().includes(k)) ? 1 : 0;
    const bPri = PRIORITY_KEYWORDS.some(k => b.name.toLowerCase().includes(k)) ? 1 : 0;
    if (bPri !== aPri) return bPri - aPri;
    return a.uniqueCount - b.uniqueCount;
  });

  let priority = 100;

  for (const col of sorted.slice(0, 6)) {
    if (col.uniqueCount === 2) {
      // Binary — pie is perfect
      suggestions.push({ type: "pie", columns: [col.name], title: `${col.name} Distribution`, priority: priority-- });
    } else if (col.uniqueCount <= 7) {
      // Small set — donut/pie
      suggestions.push({ type: "pie", columns: [col.name], title: `${col.name} Distribution`, priority: priority-- });
    } else if (col.uniqueCount <= 12) {
      // Medium — vertical bar
      suggestions.push({ type: "vbar", columns: [col.name], title: `${col.name} Breakdown`, priority: priority-- });
    } else {
      // Larger — horizontal bar (better for long labels)
      suggestions.push({ type: "hbar", columns: [col.name], title: `Top ${col.name}`, priority: priority-- });
    }
  }

  // Cross-analysis charts: pick the best 2-3 categorical pairs
  if (sorted.length >= 2) {
    const small = sorted.filter(c => c.uniqueCount <= 10);
    
    if (small.length >= 2) {
      suggestions.push({
        type: "heatmap",
        columns: [small[0].name, small[1].name],
        title: `${small[0].name} × ${small[1].name}`,
        priority: priority--,
      });
    }
    
    if (sorted.length >= 2) {
      const [col1, col2] = sorted.slice(0, 2);
      if (col1.uniqueCount <= 12 && col2.uniqueCount <= 8) {
        suggestions.push({
          type: "stacked_bar",
          columns: [col1.name, col2.name],
          title: `${col2.name} by ${col1.name}`,
          priority: priority--,
        });
      }
    }

    // Third cross-chart if enough data
    if (small.length >= 3) {
      suggestions.push({
        type: "stacked_bar",
        columns: [small[0].name, small[2].name],
        title: `${small[2].name} by ${small[0].name}`,
        priority: priority--,
      });
    }
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

function pickKPIColumns(columns: ColumnAnalysis[]): string[] {
  return columns
    .filter(c => c.type === "categorical" && c.uniqueCount >= 2 && c.uniqueCount <= 10 && c.fillRate > 40)
    .sort((a, b) => {
      const aPri = PRIORITY_KEYWORDS.some(k => a.name.toLowerCase().includes(k)) ? 100 : 0;
      const bPri = PRIORITY_KEYWORDS.some(k => b.name.toLowerCase().includes(k)) ? 100 : 0;
      return (bPri - aPri) || (a.uniqueCount - b.uniqueCount);
    })
    .slice(0, 3)
    .map(c => c.name);
}

/**
 * Levenshtein distance check — returns true if strings differ by at most 2 chars
 * and are at least 4 chars long (to avoid merging short distinct values)
 */
function areSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  if (Math.abs(a.length - b.length) > 2) return false;

  const maxLen = Math.max(a.length, b.length);
  let dist = 0;
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) { matrix[i][j] = j; continue; }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  dist = matrix[a.length][b.length];
  // Allow merge if edit distance <= 2 and the words are reasonably long
  return dist <= 2 && dist / maxLen < 0.4;
}

export function dynamicAggregate(rows: RawRow[], analysis: DataAnalysis) {
  const columnCounts: Record<string, Record<string, number>> = {};
  
  for (const col of analysis.columns) {
    if (col.type === "categorical") {
      // Case-insensitive + spelling-tolerant normalization
      // Group by lowercase, pick the most frequent casing as canonical display name
      const lowerToCanonical: Record<string, string> = {};
      const lowerCounts: Record<string, number> = {};
      const casingCounts: Record<string, Record<string, number>> = {};

      for (const row of rows) {
        const raw = (row[col.name] || "").trim();
        if (!raw) continue;
        const lower = raw.toLowerCase();
        lowerCounts[lower] = (lowerCounts[lower] || 0) + 1;
        if (!casingCounts[lower]) casingCounts[lower] = {};
        casingCounts[lower][raw] = (casingCounts[lower][raw] || 0) + 1;
      }

      // Pick the most common casing as canonical display name
      const counts: Record<string, number> = {};
      for (const [lower, total] of Object.entries(lowerCounts)) {
        const casings = casingCounts[lower];
        const canonical = Object.entries(casings).sort(([, a], [, b]) => b - a)[0][0];
        counts[canonical] = total;
      }

      // Fuzzy merge: merge values that differ by 1-2 chars (typo tolerance)
      const keys = Object.keys(counts);
      const merged = new Set<string>();
      for (let i = 0; i < keys.length; i++) {
        if (merged.has(keys[i])) continue;
        for (let j = i + 1; j < keys.length; j++) {
          if (merged.has(keys[j])) continue;
          if (areSimilar(keys[i].toLowerCase(), keys[j].toLowerCase())) {
            // Merge j into i (keep the one with higher count)
            if (counts[keys[i]] >= counts[keys[j]]) {
              counts[keys[i]] += counts[keys[j]];
              delete counts[keys[j]];
              merged.add(keys[j]);
            } else {
              counts[keys[j]] += counts[keys[i]];
              delete counts[keys[i]];
              merged.add(keys[i]);
              break;
            }
          }
        }
      }

      columnCounts[col.name] = counts;
    }
  }

  return { total: rows.length, columnCounts };
}
