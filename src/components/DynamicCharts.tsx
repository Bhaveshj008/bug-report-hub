import { useMemo } from "react";
import { SeverityPieChart } from "@/components/charts/SeverityPieChart";
import { HBarChart } from "@/components/charts/HBarChart";
import { VBarChart } from "@/components/charts/VBarChart";
import { DynamicHeatmap } from "@/components/charts/DynamicHeatmap";
import { DynamicStackedBar } from "@/components/charts/DynamicStackedBar";
import type { RawRow, DataAnalysis, DynamicAggregations, ChartSuggestion } from "@/types/bug";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

interface Props {
  rows: RawRow[];
  analysis: DataAnalysis;
  agg: DynamicAggregations;
}

export function DynamicCharts({ rows, analysis, agg }: Props) {
  const charts = useMemo(() => {
    return analysis.chartSuggestions.slice(0, 10);
  }, [analysis]);

  const renderChart = (suggestion: ChartSuggestion, index: number) => {
    const colName = suggestion.columns[0];

    const wrapper = (child: React.ReactNode) => (
      <div key={index} data-chart-card="">
        {child}
      </div>
    );

    switch (suggestion.type) {
      case "pie": {
        const counts = agg.columnCounts[colName];
        if (!counts || Object.keys(counts).length === 0) return null;
        return wrapper(<SeverityPieChart data={counts} title={suggestion.title} />);
      }
      case "vbar": {
        const counts = agg.columnCounts[colName];
        if (!counts || Object.keys(counts).length === 0) return null;
        return wrapper(<VBarChart data={counts} title={suggestion.title} color={CHART_COLORS[index % CHART_COLORS.length]} />);
      }
      case "hbar": {
        const counts = agg.columnCounts[colName];
        if (!counts || Object.keys(counts).length === 0) return null;
        return wrapper(<HBarChart data={counts} title={suggestion.title} color={CHART_COLORS[index % CHART_COLORS.length]} />);
      }
      case "heatmap":
        if (suggestion.columns.length >= 2) {
          return wrapper(<DynamicHeatmap rows={rows} col1={suggestion.columns[0]} col2={suggestion.columns[1]} title={suggestion.title} />);
        }
        return null;
      case "stacked_bar":
        if (suggestion.columns.length >= 2) {
          return wrapper(<DynamicStackedBar rows={rows} groupCol={suggestion.columns[0]} stackCol={suggestion.columns[1]} title={suggestion.title} />);
        }
        return null;
      default:
        return null;
    }
  };

  const simpleCharts = charts.filter(c => c.type !== "heatmap" && c.type !== "stacked_bar");
  const crossCharts = charts.filter(c => c.type === "heatmap" || c.type === "stacked_bar");

  if (charts.length === 0) return null;

  return (
    <div id="dashboard-charts" className="space-y-4">
      {simpleCharts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {simpleCharts.map((chart, i) => renderChart(chart, i))}
        </div>
      )}
      {crossCharts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {crossCharts.map((chart, i) => renderChart(chart, i + simpleCharts.length))}
        </div>
      )}
    </div>
  );
}
