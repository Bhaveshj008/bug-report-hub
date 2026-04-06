import { useState, useEffect, useMemo } from "react";
import { Database, Eye, EyeOff } from "lucide-react";
import type { DataAnalysis, DynamicAggregations, AISchema } from "@/types/bug";
import { computeKPIValue, generateFallbackSchema, detectDataTypeHeuristic } from "@/utils/aiSchema";

interface Props {
  analysis: DataAnalysis;
  agg: DynamicAggregations;
  fileName: string;
  aiSchema?: AISchema | null;
  onVisibleKPIsChange?: (visibleIndices: Set<number>) => void;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  red:    { bg: "bg-red-500/10",    text: "text-red-500",    border: "border-red-500/20" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/20" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/20" },
  green:  { bg: "bg-emerald-500/10",text: "text-emerald-500",border: "border-emerald-500/20" },
  blue:   { bg: "bg-primary/10",    text: "text-primary",    border: "border-primary/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/20" },
  gray:   { bg: "bg-muted",         text: "text-muted-foreground", border: "border-border" },
};

const FALLBACK_COLORS = [
  COLOR_MAP.blue, COLOR_MAP.red, COLOR_MAP.orange, COLOR_MAP.green,
  COLOR_MAP.yellow, COLOR_MAP.purple, COLOR_MAP.gray,
];

type KPIItem = { label: string; value: string | number; sub?: string; color: { bg: string; text: string; border: string } };

export function DynamicKPICards({ analysis, agg, fileName, aiSchema, onVisibleKPIsChange }: Props) {
  // Use AI schema or fallback schema for KPI definitions
  const schema = useMemo(() => {
    if (aiSchema) return aiSchema;
    const dt = detectDataTypeHeuristic(analysis);
    return generateFallbackSchema(analysis, agg, dt);
  }, [aiSchema, analysis, agg]);

  const kpis: KPIItem[] = useMemo(() => {
    return schema.kpis.map((kpiDef, i) => {
      const { value, sub } = computeKPIValue(kpiDef, agg, analysis);
      const color = kpiDef.color ? (COLOR_MAP[kpiDef.color] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]) : FALLBACK_COLORS[i % FALLBACK_COLORS.length];
      return { label: kpiDef.label, value, sub, color };
    });
  }, [schema, agg, analysis]);

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

  // Data type badge
  const dataTypeBadge = schema.dataType !== "generic" ? {
    bug_report: "🐛 Bug Report",
    test_execution: "🧪 Test Execution",
    test_case: "📋 Test Case",
    generic: "",
  }[schema.dataType] : "";

  return (
    <div className="animate-fade-in space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Database className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary shrink-0">
            {analysis.columns.length} cols · {agg.total} rows
          </span>
          {dataTypeBadge && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold text-accent-foreground shrink-0">
              {dataTypeBadge}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowToggles(!showToggles)}
          className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title="Toggle KPI visibility for PDF export"
        >
          {showToggles ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showToggles ? "Done" : "Filter KPIs"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {kpis.map((kpi, i) => {
          const isVisible = visible.has(i);
          if (!isVisible && !showToggles) return null;

          return (
            <div
              key={i}
              className={`relative rounded-xl border ${kpi.color.border} ${kpi.color.bg} p-4 transition-all hover:shadow-md ${!isVisible ? "opacity-40" : ""}`}
            >
              {showToggles && (
                <button
                  onClick={() => toggleKPI(i)}
                  className={`absolute top-2 right-2 h-5 w-5 rounded border flex items-center justify-center transition-colors ${isVisible ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 text-transparent"
                    }`}
                >
                  {isVisible && <span className="text-[10px]">✓</span>}
                </button>
              )}
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 truncate pr-6" title={kpi.label}>
                {kpi.label}
              </p>
              <p className={`text-2xl font-bold ${kpi.color.text} truncate`} title={String(kpi.value)}>
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
