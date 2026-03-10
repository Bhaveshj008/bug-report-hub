import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { TooltipComponent, GridComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([BarChart, TooltipComponent, GridComponent, CanvasRenderer]);

interface VBarChartProps {
  data: Record<string, number>;
  title: string;
  color?: string;
}

const BAR_COLORS = [
  "#0ea5e9", "#8b5cf6", "#f97316", "#22c55e",
  "#eab308", "#ef4444", "#ec4899", "#3b82f6",
];

export function VBarChart({ data, title }: VBarChartProps) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  const chartData = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12);

  const option: echarts.EChartsCoreOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(15,15,20,0.9)",
      borderColor: "rgba(255,255,255,0.1)",
      textStyle: { color: "#e2e8f0", fontSize: 12 },
    },
    grid: { left: 40, right: 16, top: 12, bottom: 60, containLabel: false },
    xAxis: {
      type: "category",
      data: chartData.map(([name]) => name.length > 14 ? name.slice(0, 12) + "…" : name),
      axisLabel: { fontSize: 10, color: "#94a3b8", rotate: 35 },
      axisLine: { lineStyle: { color: "#334155" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 10, color: "#94a3b8" },
      splitLine: { lineStyle: { color: "#1e293b", type: "dashed" } },
    },
    series: [{
      type: "bar",
      data: chartData.map(([, value], i) => ({
        value,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: BAR_COLORS[i % BAR_COLORS.length] },
            { offset: 1, color: BAR_COLORS[i % BAR_COLORS.length] + "88" },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      })),
      barMaxWidth: 40,
      animationDuration: 600,
      animationEasing: "cubicOut",
      animationDelay: (idx: number) => idx * 60,
    }],
    animationDuration: 600,
  };

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mb-2 text-[11px] text-muted-foreground">{chartData.length} items · {total} total</p>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height: 280 }} notMerge lazyUpdate />
    </div>
  );
}
