/**
 * Module Risk Treemap — ECharts treemap where size = activity, color = risk level
 */
import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { TreemapChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ModuleRiskData } from "@/types/bug";
import { buildTreemapData, getRiskColor, RISK_COLORS } from "@/utils/moduleRisk";

echarts.use([TreemapChart, TooltipComponent, CanvasRenderer]);

interface Props {
  modules: ModuleRiskData[];
  riskColName: string;
}

export function ModuleTreemap({ modules, riskColName }: Props) {
  const treeData = useMemo(() => buildTreemapData(modules), [modules]);

  const option: echarts.EChartsCoreOption = useMemo(() => ({
    tooltip: {
      backgroundColor: "rgba(15,15,20,0.95)",
      borderColor: "rgba(255,255,255,0.1)",
      textStyle: { color: "#e2e8f0", fontSize: 12 },
      formatter: (params: any) => {
        const d = params.data;
        if (!d || !d.breakdown) return "";
        const breakdownLines = Object.entries(d.breakdown as Record<string, number>)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 8)
          .map(([k, v]) => `<span style="color:${getRiskColor(
            k.toLowerCase().includes("critical") || k.toLowerCase().includes("fail") ? 90 :
            k.toLowerCase().includes("high") || k.toLowerCase().includes("block") ? 70 :
            k.toLowerCase().includes("medium") || k.toLowerCase().includes("p2") ? 50 :
            k.toLowerCase().includes("low") || k.toLowerCase().includes("pass") ? 15 : 50
          )}">●</span> ${k}: <b>${v}</b>`)
          .join("<br/>");

        return `<div style="min-width:160px">
          <div style="font-weight:700;font-size:13px;margin-bottom:6px">${d.name}</div>
          <div style="color:#94a3b8;font-size:11px;margin-bottom:4px">
            Total: <b style="color:#e2e8f0">${d.value}</b> · Risk: <b style="color:${getRiskColor(d.riskScore)}">${d.riskLevel} (${d.riskScore})</b>
          </div>
          <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:4px;font-size:11px">
            ${breakdownLines}
          </div>
        </div>`;
      },
    },
    series: [{
      type: "treemap",
      left: "0%",
      right: "0%",
      top: "0%",
      bottom: "0%",
      roam: true, // enable zoom and pan
      nodeClick: false,
      breadcrumb: { show: false },
      label: {
        show: true,
        formatter: (params: any) => {
          const d = params.data;
          // Only show label if the node has a significant size, to prevent tiny boxes from overflowing text
          return `{name|${d.name}}\n{score|${d.riskLevel}}`;
        },
        rich: {
          name: {
            fontSize: 11,
            fontWeight: "bold",
            color: "#fff",
            lineHeight: 16,
            textShadowColor: "rgba(0,0,0,0.8)",
            textShadowBlur: 4,
          },
          score: {
            fontSize: 9,
            color: "rgba(255,255,255,0.8)",
            lineHeight: 12,
          },
        },
        verticalAlign: "middle",
        align: "center",
      },
      itemStyle: {
        borderRadius: 4,
        gapWidth: 3,
      },
      emphasis: {
        itemStyle: {
          borderColor: "#fff",
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: "rgba(0,0,0,0.4)",
        },
      },
      levels: [{
        itemStyle: { borderWidth: 0, gapWidth: 3 },
      }],
      data: treeData,
      animationDuration: 800,
      animationEasing: "cubicOut",
    }],
  }), [treeData]);

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height: 360 }}
      notMerge
      lazyUpdate
    />
  );
}
