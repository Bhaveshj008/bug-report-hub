import { useRef, useEffect } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

interface SeverityPieChartProps {
  data: Record<string, number>;
  title?: string;
}

const COLORS = [
  "#0ea5e9", "#8b5cf6", "#f97316", "#22c55e",
  "#eab308", "#ef4444", "#ec4899", "#3b82f6",
];

export function SeverityPieChart({ data, title }: SeverityPieChartProps) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  const chartData = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  const option: echarts.EChartsCoreOption = {
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15,15,20,0.9)",
      borderColor: "rgba(255,255,255,0.1)",
      textStyle: { color: "#e2e8f0", fontSize: 12 },
      formatter: (params: any) => {
        const pct = total > 0 ? ((params.value / total) * 100).toFixed(1) : "0";
        return `<b>${params.name}</b><br/>${params.value} (${pct}%)`;
      },
    },
    color: COLORS,
    series: [
      {
        type: "pie",
        radius: ["40%", "72%"],
        center: ["50%", "48%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: "transparent",
          borderWidth: 2,
        },
        label: {
          show: true,
          position: "outside",
          formatter: "{b}\n{d}%",
          fontSize: 11,
          color: "#94a3b8",
          lineHeight: 16,
        },
        labelLine: {
          show: true,
          length: 12,
          length2: 16,
          smooth: true,
          lineStyle: { color: "#475569", width: 1 },
        },
        emphasis: {
          scale: true,
          scaleSize: 8,
          label: { fontSize: 13, fontWeight: "bold" },
        },
        animationType: "expansion",
        animationDuration: 800,
        animationEasing: "cubicOut",
        data: chartData,
      },
    ],
  };

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <h3 className="mb-1 text-sm font-semibold text-foreground">{title || "Distribution"}</h3>
      <p className="mb-2 text-[11px] text-muted-foreground">{chartData.length} categories · {total} total</p>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height: 280 }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
