import type { RawRow, ColumnAnalysis, ColumnType, ChartSuggestion, DataAnalysis } from "@/types/bug";

const URL_REGEX = /^https?:\/\//i;
const DATE_REGEX = /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/;
const NUMBER_REGEX = /^-?\d+(\.\d+)?$/;

// Keywords that suggest important/priority columns
const PRIORITY_KEYWORDS = [
  "severity", "priority", "status", "type", "category", "module",
  "component", "platform", "environment", "result", "pass", "fail",
  "critical", "high", "medium", "low", "p1", "p2", "p3",
];

const ID_KEYWORDS = ["id", "no", "number", "sl", "sr", "#", "ticket", "jira", "key"];
const TEXT_KEYWORDS = ["description", "summary", "comment", "note", "step", "detail", "expected", "actual", "objective", "procedure", "precondition"];

function detectColumnType(name: string, values: string[]): ColumnType {
  const lowerName = name.toLowerCase();
  const nonEmpty = values.filter(v => v && v.trim());
  
  if (nonEmpty.length === 0) return "text";

  // Check name-based hints first
  if (ID_KEYWORDS.some(k => lowerName.includes(k))) {
    const uniqueRatio = new Set(nonEmpty).size / nonEmpty.length;
    if (uniqueRatio > 0.8) return "id";
  }

  if (TEXT_KEYWORDS.some(k => lowerName.includes(k))) {
    const avgLen = nonEmpty.reduce((s, v) => s + v.length, 0) / nonEmpty.length;
    if (avgLen > 40) return "text";
  }

  // Check value patterns
  const sample = nonEmpty.slice(0, 50);
  
  if (sample.every(v => URL_REGEX.test(v))) return "url";
  if (sample.filter(v => DATE_REGEX.test(v)).length > sample.length * 0.7) return "date";
  if (sample.filter(v => NUMBER_REGEX.test(v)).length > sample.length * 0.7) return "numeric";

  // Categorical: limited unique values relative to total
  const uniqueCount = new Set(nonEmpty).size;
  const avgLen = nonEmpty.reduce((s, v) => s + v.length, 0) / nonEmpty.length;
  
  if (uniqueCount <= 25 && avgLen < 50) return "categorical";
  if (uniqueCount <= 50 && uniqueCount < nonEmpty.length * 0.3 && avgLen < 40) return "categorical";
  
  if (avgLen > 60) return "text";
  
  return uniqueCount < nonEmpty.length * 0.5 ? "categorical" : "text";
}

export function analyzeColumns(rows: RawRow[]): DataAnalysis {
  if (rows.length === 0) return { columns: [], chartSuggestions: [], kpiColumns: [], totalRows: 0 };

  const headers = Object.keys(rows[0]);
  const columns: ColumnAnalysis[] = [];

  for (const header of headers) {
    const values = rows.map(r => r[header] || "");
    const nonEmpty = values.filter(v => v.trim());
    const type = detectColumnType(header, nonEmpty);
    
    // Count values
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
  const categoricals = columns.filter(c => c.type === "categorical" && c.fillRate > 30);

  // Sort by priority: columns with priority keywords first, then by unique count
  const sorted = [...categoricals].sort((a, b) => {
    const aPriority = PRIORITY_KEYWORDS.some(k => a.name.toLowerCase().includes(k)) ? 1 : 0;
    const bPriority = PRIORITY_KEYWORDS.some(k => b.name.toLowerCase().includes(k)) ? 1 : 0;
    if (bPriority !== aPriority) return bPriority - aPriority;
    return a.uniqueCount - b.uniqueCount; // fewer unique = better for charts
  });

  let priority = 100;

  for (const col of sorted) {
    if (col.uniqueCount <= 6) {
      suggestions.push({
        type: "pie",
        columns: [col.name],
        title: `${col.name} Distribution`,
        priority: priority--,
      });
    } else if (col.uniqueCount <= 15) {
      suggestions.push({
        type: "vbar",
        columns: [col.name],
        title: `${col.name} Breakdown`,
        priority: priority--,
      });
    } else {
      suggestions.push({
        type: "hbar",
        columns: [col.name],
        title: `Top ${col.name}`,
        priority: priority--,
      });
    }
  }

  // Cross-analysis: combine top 2 categorical columns as heatmap/stacked
  if (sorted.length >= 2) {
    const [col1, col2] = sorted;
    if (col1.uniqueCount <= 10 && col2.uniqueCount <= 10) {
      suggestions.push({
        type: "heatmap",
        columns: [col1.name, col2.name],
        title: `${col1.name} × ${col2.name}`,
        priority: priority--,
      });
    }
    if (sorted.length >= 3) {
      const col3 = sorted[2];
      suggestions.push({
        type: "stacked_bar",
        columns: [col1.name, col3.name],
        title: `${col3.name} by ${col1.name}`,
        priority: priority--,
      });
    }
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

function pickKPIColumns(columns: ColumnAnalysis[]): string[] {
  // Pick columns with few unique values and high fill rate — best for KPI breakdowns
  return columns
    .filter(c => c.type === "categorical" && c.uniqueCount <= 8 && c.fillRate > 50)
    .sort((a, b) => {
      const aPri = PRIORITY_KEYWORDS.some(k => a.name.toLowerCase().includes(k)) ? 100 : 0;
      const bPri = PRIORITY_KEYWORDS.some(k => b.name.toLowerCase().includes(k)) ? 100 : 0;
      return (bPri - aPri) || (a.uniqueCount - b.uniqueCount);
    })
    .slice(0, 2)
    .map(c => c.name);
}

export function dynamicAggregate(rows: RawRow[], analysis: DataAnalysis) {
  const columnCounts: Record<string, Record<string, number>> = {};
  
  for (const col of analysis.columns) {
    if (col.type === "categorical") {
      const counts: Record<string, number> = {};
      for (const row of rows) {
        const val = (row[col.name] || "").trim();
        if (val) counts[val] = (counts[val] || 0) + 1;
      }
      columnCounts[col.name] = counts;
    }
  }

  return { total: rows.length, columnCounts };
}
