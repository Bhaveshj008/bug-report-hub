import { Hash, TrendingUp, BarChart3, Database, Columns } from "lucide-react";
import type { DataAnalysis, DynamicAggregations } from "@/types/bug";

interface Props {
  analysis: DataAnalysis;
  agg: DynamicAggregations;
  fileName: string;
}

const KPI_COLORS = [
  { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
  { bg: "bg-chart-critical/10", text: "text-chart-critical", border: "border-chart-critical/20" },
  { bg: "bg-chart-high/10", text: "text-chart-high", border: "border-chart-high/20" },
  { bg: "bg-chart-low/10", text: "text-chart-low", border: "border-chart-low/20" },
  { bg: "bg-chart-medium/10", text: "text-chart-medium", border: "border-chart-medium/20" },
  { bg: "bg-chart-info/10", text: "text-chart-info", border: "border-chart-info/20" },
];

export function DynamicKPICards({ analysis, agg, fileName }: Props) {
  // Build KPI items dynamically
  const kpis: { label: string; value: string | number; sub?: string; colorIdx: number }[] = [];
  
  // Total rows — always first
  kpis.push({ label: "Total Records", value: agg.total, colorIdx: 0 });

  // KPI columns: show the dominant value + count for each
  let colorIdx = 1;
  for (const colName of analysis.kpiColumns) {
    const counts = agg.columnCounts[colName];
    if (!counts) continue;
    const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);
    if (entries.length === 0) continue;
    
    // Show top value as a KPI
    const [topValue, topCount] = entries[0];
    const pct = agg.total > 0 ? Math.round((topCount / agg.total) * 100) : 0;
    kpis.push({
      label: `Top ${colName}`,
      value: topValue,
      sub: `${topCount} (${pct}%)`,
      colorIdx: colorIdx++ % KPI_COLORS.length,
    });

    // If there are few categories, show unique count
    if (entries.length <= 6) {
      kpis.push({
        label: `${colName} Types`,
        value: entries.length,
        sub: entries.slice(0, 3).map(([v]) => v).join(", "),
        colorIdx: colorIdx++ % KPI_COLORS.length,
      });
    }
  }

  // Data quality: columns & fill rate
  const avgFill = analysis.columns.length > 0
    ? Math.round(analysis.columns.reduce((s, c) => s + c.fillRate, 0) / analysis.columns.length)
    : 0;
  kpis.push({
    label: "Data Quality",
    value: `${avgFill}%`,
    sub: `${analysis.columns.length} columns`,
    colorIdx: colorIdx++ % KPI_COLORS.length,
  });

  return (
    <div className="animate-fade-in space-y-3">
      <div className="flex items-center gap-3">
        <Database className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
          {analysis.columns.length} cols · {agg.total} rows
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {kpis.map((kpi, i) => {
          const color = KPI_COLORS[kpi.colorIdx];
          return (
            <div key={i} className={`rounded-xl border ${color.border} ${color.bg} p-4 transition-all hover:shadow-md`}>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 truncate" title={kpi.label}>
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
