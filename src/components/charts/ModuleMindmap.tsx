/**
 * Module Risk Mindmap — ECharts Graph with 3-segment elbow routing.
 * Each branch: straight diagonal → tiny rounded arc at corner → straight horizontal.
 * Roam (scroll-to-zoom + drag) works on the whole chart uniformly.
 */
import { useMemo, useRef } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { GraphChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ModuleRiskData } from "@/types/bug";
import { RISK_COLORS, getRiskColor } from "@/utils/moduleRisk";

echarts.use([GraphChart, TooltipComponent, CanvasRenderer]);

interface Props { modules: ModuleRiskData[]; }

const PILL_BG: Record<string, string> = {
  Critical: "rgba(239,68,68,0.22)",
  High:     "rgba(249,115,22,0.18)",
  Medium:   "rgba(234,179,8,0.16)",
  Low:      "rgba(6,182,212,0.16)",
  Safe:     "rgba(34,197,94,0.14)",
};

export function ModuleMindmap({ modules }: Props) {
  const chartRef = useRef<any>(null);

  const option: echarts.EChartsCoreOption = useMemo(() => {
    const sorted = [...modules].sort((a, b) => b.riskScore - a.riskScore);
    const half = Math.ceil(sorted.length / 2);
    const rightSide = sorted.slice(0, half);
    const leftSide  = sorted.slice(half);

    const V_SPACING = 54;
    const H_NODE    = 280;  // x of pill
    const H_MID     = 140;  // x of elbow
    // CR is computed per-node based on its angle — zero for nearly-horizontal lines

    const nodes: any[] = [];
    const edges: any[] = [];

    // Invisible waypoint helper
    const mid = (id: string, x: number, y: number) =>
      nodes.push({ id, x, y, symbolSize: 0, symbol: "circle",
        itemStyle: { color: "transparent", borderColor: "transparent" },
        label: { show: false }, _mid: true });

    // Root
    nodes.push({
      id: "root", name: "All Modules", x: 0, y: 0,
      symbolSize: [148, 38], symbol: "roundRect",
      itemStyle: { color: "#0f172a", borderColor: "rgba(148,163,184,0.5)", borderWidth: 1.5 },
      label: { show: true, formatter: "⬡  All Modules", color: "#f1f5f9",
        fontSize: 13, fontWeight: "bold", position: "inside",
        verticalAlign: "middle", align: "center" },
    });

    const addSide = (list: ModuleRiskData[], side: "right" | "left") => {
      const sign = side === "right" ? 1 : -1;
      const maxY = ((list.length - 1) / 2) * V_SPACING || 1;

      list.forEach((m, i) => {
        const y = (i - (list.length - 1) / 2) * V_SPACING;
        const nid   = `${side}_${i}`;
        const preId = `${side}_pre_${i}`;
        const arcId = `${side}_arc_${i}`;

        const shortName = m.module.length > 16 ? m.module.slice(0, 15) + "…" : m.module;
        const rc = RISK_COLORS[m.riskLevel as keyof typeof RISK_COLORS] ?? "#475569";

        // Unit vector along diagonal (root → elbow at H_MID, y)
        const dist = Math.sqrt(H_MID * H_MID + y * y) || 1;
        const ux = H_MID / dist;
        const uy = y / dist;

        // Only round the corner when the turn angle is steep enough to need it.
        // angle = 0 when node is at center (perfectly horizontal line), increases as node moves away.
        const angle = Math.abs(Math.atan2(y, H_MID)); // radians, 0 = horizontal
        const needsCorner = angle > 0.28; // ~16° threshold — below this, line is nearly straight
        const CR = needsCorner ? Math.min(18, Math.abs(y) * 0.3) : 0;

        // Pull-back point: CR pixels before the elbow
        const preX = sign * (H_MID - CR * ux);
        const preY = y - CR * uy;
        // Post-corner point: CR pixels after the elbow
        const arcX = sign * (H_MID + CR);
        const arcY = y;

        // Corner curveness: only applied when corner rounding is needed
        const norm = maxY > 0 ? y / maxY : 0;
        const curveness = needsCorner
          ? (side === "right" ? (norm >= 0 ? -0.45 : 0.45) : (norm >= 0 ? 0.45 : -0.45))
          : 0;

        mid(preId, preX, preY);
        mid(arcId, arcX, arcY);

        // Pill node
        nodes.push({
          id: nid, name: m.module, x: sign * H_NODE, y,
          riskScore: m.riskScore, riskLevel: m.riskLevel,
          breakdown: m.breakdown, totalCount: m.total,
          symbolSize: [148, 32], symbol: "roundRect",
          itemStyle: {
            color: PILL_BG[m.riskLevel] ?? "rgba(30,41,59,0.8)",
            borderColor: rc, borderWidth: 1.5,
          },
          label: {
            show: true,
            formatter: side === "right"
              ? `● ${shortName}  (${m.riskScore})`
              : `(${m.riskScore})  ${shortName} ●`,
            color: "#e2e8f0", fontSize: 10.5,
            position: "inside", verticalAlign: "middle", align: "center",
          },
        });

        // Segment 1 — straight diagonal from root → just before elbow
        edges.push({ source: "root", target: preId,
          lineStyle: { color: rc, opacity: 0.45, width: 1.5, curveness: 0 } });

        // Segment 2 — tiny rounded arc ONLY at the elbow corner
        edges.push({ source: preId, target: arcId,
          lineStyle: { color: rc, opacity: 0.45, width: 1.5, curveness } });

        // Segment 3 — straight horizontal into the pill
        edges.push({ source: arcId, target: nid,
          lineStyle: { color: rc, opacity: 0.45, width: 1.5, curveness: 0 } });
      });
    };

    addSide(rightSide, "right");
    addSide(leftSide,  "left");

    return {
      tooltip: {
        backgroundColor: "rgba(10,12,20,0.95)",
        borderColor: "rgba(255,255,255,0.08)",
        extraCssText: "border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.6);",
        textStyle: { color: "#e2e8f0", fontSize: 12 },
        formatter: (params: any) => {
          const d = params.data;
          if (params.dataType === "edge" || d._mid) return "";
          if (d.id === "root") {
            return `<div style="font-weight:700;font-size:13px;margin-bottom:4px">All Modules</div>
                    <div style="color:#94a3b8;font-size:11px">${modules.length} modules analyzed</div>`;
          }
          const color = getRiskColor(d.riskScore ?? 0);
          const rows = Object.entries((d.breakdown ?? {}) as Record<string, number>)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px">
              <span style="color:#94a3b8">${k}</span><b>${v}</b></div>`)
            .join("");
          return `<div style="min-width:160px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${d.name}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:6px">
              Total: <b style="color:#e2e8f0">${d.totalCount}</b>&nbsp;·&nbsp;
              Risk: <b style="color:${color}">${d.riskLevel} (${d.riskScore}/100)</b>
            </div>
            <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:5px;font-size:11px">${rows}</div>
          </div>`;
        },
      },
      series: [{
        type: "graph", layout: "none",
        roam: true, scaleLimit: { min: 0.3, max: 3 },
        draggable: false,
        nodes, edges,
        emphasis: {
          focus: "adjacency",
          itemStyle: { shadowBlur: 12, shadowColor: "rgba(14,165,233,0.4)" },
        },
        animationDuration: 700, animationEasing: "cubicOut",
      }],
    };
  }, [modules]);

  const handleReset = () => {
    chartRef.current?.getEchartsInstance?.()?.dispatchAction({ type: "restore" });
  };

  const chartHeight = Math.max(380, Math.ceil(modules.length / 2) * 54 + 80);

  return (
    <div className="relative">
      <div className="absolute top-1 right-1 z-10 flex items-center gap-2">
        <span className="text-[9px] text-muted-foreground/40 select-none hidden sm:inline">
          scroll to zoom · drag to pan
        </span>
        <button onClick={handleReset}
          className="text-[9px] px-2 py-0.5 rounded border border-white/10 bg-card/80 text-muted-foreground hover:text-foreground hover:border-white/25 transition-colors">
          Reset
        </button>
      </div>
      <ReactEChartsCore ref={chartRef} echarts={echarts} option={option}
        style={{ height: chartHeight, width: "100%" }} notMerge lazyUpdate />
    </div>
  );
}
