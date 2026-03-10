import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { HeatmapChart } from "echarts/charts";
import { TooltipComponent, GridComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { RawRow } from "@/types/bug";

echarts.use([HeatmapChart, TooltipComponent, GridComponent, VisualMapComponent, CanvasRenderer]);

interface Props {
  rows: RawRow[];
  col1: string;
  col2: string;
  title: string;
}

export function DynamicHeatmap({ rows, col1, col2, title }: Props) {
  const { values1, values2, heatData, maxCount } = useMemo(() => {
    const c1Counts: Record<string, number> = {};
    const c2Counts: Record<string, number> = {};
    for (const r of rows) {
      const v1 = (r[col1] || "").trim();
      const v2 = (r[col2] || "").trim();
      if (v1) c1Counts[v1] = (c1Counts[v1] || 0) + 1;
      if (v2) c2Counts[v2] = (c2Counts[v2] || 0) + 1;
    }
    const v1 = Object.entries(c1Counts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([k]) => k);
    const v2 = Object.entries(c2Counts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([k]) => k);

    const data: number[][] = [];
    let max = 0;
    for (let i = 0; i < v1.length; i++) {
      for (let j = 0; j < v2.length; j++) {
        const count = rows.filter(r => (r[col1] || "").trim() === v1[i] && (r[col2] || "").trim() === v2[j]).length;
        data.push([j, i, count]);
        if (count > max) max = count;
      }
    }
    return { values1: v1, values2: v2, heatData: data, maxCount: max };
  }, [rows, col1, col2]);

  if (values1.length === 0 || values2.length === 0) return null;

  const option: echarts.EChartsCoreOption = {
    tooltip: {
      backgroundColor: "rgba(15,15,20,0.9)",
      borderColor: "rgba(255,255,255,0.1)",
      textStyle: { color: "#e2e8f0", fontSize: 12 },
      formatter: (params: any) => `${values1[params.data[1]]} × ${values2[params.data[0]]}<br/><b>${params.data[2]}</b>`,
    },
    grid: { left: 10, right: 40, top: 8, bottom: 40, containLabel: true },
    xAxis: {
      type: "category",
      data: values2.map(v => v.length > 10 ? v.slice(0, 9) + "…" : v),
      axisLabel: { fontSize: 10, color: "#94a3b8", rotate: 30 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#334155" } },
    },
    yAxis: {
      type: "category",
      data: values1.map(v => v.length > 14 ? v.slice(0, 12) + "…" : v),
      axisLabel: { fontSize: 10, color: "#94a3b8" },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#334155" } },
    },
    visualMap: {
      min: 0,
      max: maxCount || 1,
      calculable: false,
      orient: "vertical",
      right: 0,
      top: "center",
      inRange: { color: ["#1e293b", "#0ea5e9", "#8b5cf6"] },
      textStyle: { color: "#94a3b8", fontSize: 10 },
    },
    series: [{
      type: "heatmap",
      data: heatData,
      label: { show: true, fontSize: 11, color: "#e2e8f0" },
      itemStyle: { borderRadius: 3, borderColor: "transparent", borderWidth: 2 },
      emphasis: { itemStyle: { borderColor: "#0ea5e9", borderWidth: 2 } },
      animationDuration: 800,
    }],
  };

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height: Math.max(220, values1.length * 40 + 60) }} notMerge lazyUpdate />
    </div>
  );
}
