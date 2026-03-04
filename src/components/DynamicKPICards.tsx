import { BarChart3, Hash, Layers, PieChart } from "lucide-react";
import type { DataAnalysis, DynamicAggregations } from "@/types/bug";

interface Props {
  analysis: DataAnalysis;
  agg: DynamicAggregations;
  fileName: string;
}

const COLORS = [
  "text-chart-critical",
  "text-chart-high", 
  "text-chart-medium",
  "text-chart-low",
  "text-primary",
  "text-chart-info",
];

export function DynamicKPICards({ analysis, agg, fileName }: Props) {
  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <p className="text-sm text-muted-foreground font-mono">{fileName}</p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {analysis.columns.length} columns
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total rows */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Rows</p>
          </div>
          <p className="mt-1 text-3xl font-bold text-foreground">{agg.total}</p>
        </div>

        {/* KPI columns: show top values */}
        {analysis.kpiColumns.map((colName) => {
          const counts = agg.columnCounts[colName];
          if (!counts) return null;
          const topEntries = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4);

          return topEntries.map(([value, count], i) => (
            <div key={`${colName}-${value}`} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-1.5">
                <PieChart className={`h-3.5 w-3.5 ${COLORS[i % COLORS.length]}`} />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate max-w-[100px]" title={value}>
                  {value}
                </p>
              </div>
              <p className={`mt-1 text-3xl font-bold ${COLORS[i % COLORS.length]}`}>{count}</p>
              <p className="text-[10px] text-muted-foreground">{colName}</p>
            </div>
          ));
        })}

        {/* Categorical columns count */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categories</p>
          </div>
          <p className="mt-1 text-3xl font-bold text-foreground">
            {analysis.columns.filter(c => c.type === "categorical").length}
          </p>
          <p className="text-[10px] text-muted-foreground">chartable columns</p>
        </div>
      </div>
    </div>
  );
}
