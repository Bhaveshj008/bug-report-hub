/**
 * Module Health Map — Shows module breakdown bar + risk mindmap side by side.
 * Breakdown bar: WHY is a module risky? (composition by severity/result)
 * Mindmap: WHICH modules are riskiest? (ranked overview)
 */
import { useMemo } from "react";
import { Shield } from "lucide-react";
import { ModuleStackedBar } from "@/components/charts/ModuleStackedBar";
import { ModuleMindmap } from "@/components/charts/ModuleMindmap";
import {
  detectModuleColumn, detectRiskColumn, calculateModuleRisks,
  getRiskLevelCounts, RISK_COLORS,
} from "@/utils/moduleRisk";
import type { RawRow, DataAnalysis, DynamicAggregations, AISchema } from "@/types/bug";

interface Props {
  rows: RawRow[];
  analysis: DataAnalysis;
  agg: DynamicAggregations;
  aiSchema?: AISchema | null;
}

const LEVEL_ORDER = ["Critical", "High", "Medium", "Low", "Safe"] as const;

export function ModuleHealthMap({ rows, analysis, agg, aiSchema }: Props) {
  const moduleCol = useMemo(() => detectModuleColumn(analysis, aiSchema), [analysis, aiSchema]);
  const riskInfo = useMemo(() => detectRiskColumn(analysis, aiSchema), [analysis, aiSchema]);

  const modules = useMemo(() => {
    if (!moduleCol || !riskInfo) return [];
    return calculateModuleRisks(rows, moduleCol, riskInfo.column, riskInfo.type);
  }, [rows, moduleCol, riskInfo]);

  const levelCounts = useMemo(() => getRiskLevelCounts(modules), [modules]);

  if (!moduleCol || !riskInfo || modules.length < 2) return null;

  return (
    <div className="space-y-4 animate-fade-in" id="module-health-map">
      {/* Section header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/20 via-yellow-500/20 to-green-500/20 border border-white/5">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Module Health Map</h3>
          <p className="text-[11px] text-muted-foreground">
            {modules.length} modules analyzed by {riskInfo.column}
          </p>
        </div>
      </div>

      {/* Risk level legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card/50 px-4 py-2.5">
        {LEVEL_ORDER.map(level => (
          <div key={level} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
              style={{ backgroundColor: RISK_COLORS[level] }}
            />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {level}
            </span>
            <span className="text-[11px] font-bold text-foreground">
              {levelCounts[level]}
            </span>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-muted-foreground/60">
          Scored by {riskInfo.column}
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* LEFT: Stacked breakdown bar — WHY is each module risky? */}
        <div className="rounded-xl border bg-card p-4" data-healthmap-card>
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Module Breakdown
            </h4>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              Composition of each module — what's driving the risk score
            </p>
          </div>
          <ModuleStackedBar modules={modules} />
        </div>

        {/* RIGHT: Mindmap — WHICH modules are riskiest (ranked) */}
        <div className="rounded-xl border bg-card p-4" data-healthmap-card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Module Risk Mindmap
              </h4>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                Ranked by risk score · scroll to zoom · drag to pan
              </p>
            </div>
          </div>
          {/* 5-state color key */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
            {([
              ["Critical", "#ef4444", "Release-blocking issues"],
              ["High", "#f97316", "Urgent, high-impact bugs"],
              ["Medium", "#eab308", "Tracked, moderate impact"],
              ["Low", "#06b6d4", "Minimal impact"],
              ["Safe", "#22c55e", "No significant issues"],
            ] as const).map(([level, color, tip]) => (
              <div key={level} className="flex items-center gap-1" title={tip}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-muted-foreground">{level}</span>
              </div>
            ))}
          </div>
          <ModuleMindmap modules={modules} />
        </div>

      </div>
    </div>
  );
}
