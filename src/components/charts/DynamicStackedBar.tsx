import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { TooltipComponent, GridComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { RawRow } from "@/types/bug";

echarts.use([BarChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

interface Props {
  rows: RawRow[];
  groupCol: string;
  stackCol: string;
  title: string;
}

const STACK_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#0ea5e9", "#8b5cf6", "#ec4899", "#3b82f6",
];

export function DynamicStackedBar({ rows, groupCol, stackCol, title }: Props) {
  const { groups, stackValues, seriesData } = useMemo(() => {
    const groupCounts: Record<string, string> = {};
    const groupFreq: Record<string, number> = {};
    for (const r of rows) {
      const g = (r[groupCol] || "").trim();
      if (g) {
        const gLower = g.toLowerCase();
        if (!groupCounts[gLower]) groupCounts[gLower] = g;
        groupFreq[gLower] = (groupFreq[gLower] || 0) + 1;
      }
    }
    const topGroupKeys = Object.entries(groupFreq).sort(([, a], [, b]) => b - a).slice(0, 8).map(([k]) => k);
    const topGroups = topGroupKeys.map(k => groupCounts[k]);

    const stackSet: Record<string, string> = {};
    const matrix: Record<string, Record<string, number>> = {};
    for (const group of topGroups) {
      const groupLower = group.toLowerCase();
      matrix[groupLower] = {};
      for (const r of rows) {
        const gRaw = (r[groupCol] || "").trim();
        if (gRaw.toLowerCase() === groupLower) {
          const sv = (r[stackCol] || "").trim();
          if (sv) {
            const svLower = sv.toLowerCase();
            if (!stackSet[svLower]) stackSet[svLower] = sv;
            matrix[groupLower][svLower] = (matrix[groupLower][svLower] || 0) + 1;
          }
        }
      }
    }

    const stacks = Object.values(stackSet).slice(0, 8);
    const series = stacks.map((sv, i) => ({
      name: sv,
      type: "bar" as const,
      stack: "total",
      data: topGroups.map(g => matrix[g.toLowerCase()][sv.toLowerCase()] || 0),
      label: {
        show: true,
        position: "inside",
        formatter: (params: any) => params.value > 0 ? params.value : "",
        fontSize: 9,
        color: "#ffffff",
        fontWeight: "bold",
      },
      itemStyle: { color: STACK_COLORS[i % STACK_COLORS.length], borderRadius: i === stacks.length - 1 ? [3, 3, 0, 0] : 0 },
      animationDuration: 600,
      animationDelay: (idx: number) => idx * 80,
    }));

    return { groups: topGroups, stackValues: stacks, seriesData: series };
  }, [rows, groupCol, stackCol]);

  if (groups.length === 0) return null;

  const option: echarts.EChartsCoreOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(15,15,20,0.9)",
      borderColor: "rgba(255,255,255,0.1)",
      textStyle: { color: "#e2e8f0", fontSize: 12 },
    },
    legend: {
      data: stackValues,
      textStyle: { color: "#94a3b8", fontSize: 10 },
      bottom: 0,
      itemWidth: 12,
      itemHeight: 10,
    },
    grid: { left: 40, right: 16, top: 8, bottom: 36, containLabel: false },
    xAxis: {
      type: "category",
      data: groups.map(g => g.length > 14 ? g.slice(0, 12) + "…" : g),
      axisLabel: { fontSize: 10, color: "#94a3b8", rotate: 25 },
      axisLine: { lineStyle: { color: "#334155" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 10, color: "#94a3b8" },
      splitLine: { lineStyle: { color: "#1e293b", type: "dashed" } },
    },
    series: seriesData,
  };

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height: 280 }} notMerge lazyUpdate />
    </div>
  );
}
