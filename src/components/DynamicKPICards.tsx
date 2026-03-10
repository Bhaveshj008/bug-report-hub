import { useState, useEffect } from "react";
import { Database, Eye, EyeOff } from "lucide-react";
import type { DataAnalysis, DynamicAggregations } from "@/types/bug";

// Columns that are usually noise for KPIs
const NOISE_KEYWORDS = [
  "os version", "browser version", "user agent", "build number", "screen resolution",
  "device id", "session id", "ip address", "mac address", "uuid", "hash",
];

interface Props {
  analysis: DataAnalysis;
  agg: DynamicAggregations;
  fileName: string;
  onVisibleKPIsChange?: (visibleIndices: Set<number>) => void;
}

const KPI_COLORS = [
  { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
  { bg: "bg-chart-critical/10", text: "text-chart-critical", border: "border-chart-critical/20" },
  { bg: "bg-chart-high/10", text: "text-chart-high", border: "border-chart-high/20" },
  { bg: "bg-chart-low/10", text: "text-chart-low", border: "border-chart-low/20" },
  { bg: "bg-chart-medium/10", text: "text-chart-medium", border: "border-chart-medium/20" },
  { bg: "bg-chart-info/10", text: "text-chart-info", border: "border-chart-info/20" },
];

type KPIItem = { label: string; value: string | number; sub?: string; colorIdx: number };

export function DynamicKPICards({ analysis, agg, fileName, onVisibleKPIsChange }: Props) {
  const kpis: KPIItem[] = [];

  // Total rows — always first
  kpis.push({ label: "Total Records", value: agg.total, colorIdx: 0 });

  // Filter out noise columns
  const filteredKPIColumns = analysis.kpiColumns.filter(colName => {
    const lower = colName.toLowerCase();
    return !NOISE_KEYWORDS.some(noise => lower.includes(noise));
  });

  let colorIdx = 1;
  for (const colName of filteredKPIColumns) {
    const counts = agg.columnCounts[colName];
    if (!counts) continue;
    const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);
    if (entries.length === 0) continue;

    const [topValue, topCount] = entries[0];
    const pct = agg.total > 0 ? Math.round((topCount / agg.total) * 100) : 0;
    kpis.push({
      label: `Top ${colName}`,
      value: topValue,
      sub: `${topCount} (${pct}%)`,
      colorIdx: colorIdx++ % KPI_COLORS.length,
    });

    if (entries.length <= 6) {
      kpis.push({
        label: `${colName} Types`,
        value: entries.length,
        sub: entries.slice(0, 3).map(([v]) => v).join(", "),
        colorIdx: colorIdx++ % KPI_COLORS.length,
      });
    }
  }

  // Data quality
  const avgFill = analysis.columns.length > 0
    ? Math.round(analysis.columns.reduce((s, c) => s + c.fillRate, 0) / analysis.columns.length)
    : 0;
  kpis.push({
    label: "Data Quality",
    value: `${avgFill}%`,
    sub: `${analysis.columns.length} columns`,
    colorIdx: colorIdx++ % KPI_COLORS.length,
  });

  // Visibility state - all visible by default
  const [visible, setVisible] = useState<Set<number>>(new Set(kpis.map((_, i) => i)));
  const [showToggles, setShowToggles] = useState(false);

  // Reset visibility when kpis count changes
  useEffect(() => {
    setVisible(new Set(kpis.map((_, i) => i)));
  }, [kpis.length]);

  useEffect(() => {
    onVisibleKPIsChange?.(visible);
  }, [visible, onVisibleKPIsChange]);

  const toggleKPI = (idx: number) => {
    setVisible(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="animate-fade-in space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
            {analysis.columns.length} cols · {agg.total} rows
          </span>
        </div>
        <button
          onClick={() => setShowToggles(!showToggles)}
          className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Toggle KPI visibility for PDF export"
        >
          {showToggles ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showToggles ? "Done" : "Filter KPIs"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {kpis.map((kpi, i) => {
          const color = KPI_COLORS[kpi.colorIdx];
          const isVisible = visible.has(i);

          if (!isVisible && !showToggles) return null;

          return (
            <div
              key={i}
              className={`relative rounded-xl border ${color.border} ${color.bg} p-4 transition-all hover:shadow-md ${!isVisible ? "opacity-40" : ""}`}
            >
              {showToggles && (
                <button
                  onClick={() => toggleKPI(i)}
                  className={`absolute top-2 right-2 h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                    isVisible ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 text-transparent"
                  }`}
                >
                  {isVisible && <span className="text-[10px]">✓</span>}
                </button>
              )}
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 truncate pr-6" title={kpi.label}>
                {kpi.label}
              </p>
              <p className={`text-2xl font-bold ${color.text} truncate`} title={String(kpi.value)}>
                {kpi.value}
              </p>
              {kpi.sub && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate" title={kpi.sub}>{kpi.sub}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
