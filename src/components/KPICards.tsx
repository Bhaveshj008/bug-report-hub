import { Bug, AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import type { Aggregations, DataFormat } from "@/types/bug";
import { getChartLabels } from "@/utils/dataDetector";

interface KPICardsProps {
  agg: Aggregations;
  fileName: string;
  dataFormat?: DataFormat;
}

const severityConfig: Record<string, { icon: React.ElementType; colorClass: string }> = {
  Critical: { icon: AlertCircle, colorClass: "text-chart-critical" },
  High: { icon: AlertTriangle, colorClass: "text-chart-high" },
  Medium: { icon: Info, colorClass: "text-chart-medium" },
  Low: { icon: Bug, colorClass: "text-chart-low" },
  // Test case statuses
  Pass: { icon: CheckCircle, colorClass: "text-chart-low" },
  Fail: { icon: AlertCircle, colorClass: "text-chart-critical" },
  "Not Tested": { icon: Info, colorClass: "text-chart-medium" },
  Blocked: { icon: AlertTriangle, colorClass: "text-chart-high" },
  // Priority levels
  P1: { icon: AlertCircle, colorClass: "text-chart-critical" },
  P2: { icon: AlertTriangle, colorClass: "text-chart-high" },
  P3: { icon: Info, colorClass: "text-chart-medium" },
  P4: { icon: Bug, colorClass: "text-chart-low" },
};

export function KPICards({ agg, fileName, dataFormat = "bug_report" }: KPICardsProps) {
  const labels = getChartLabels(dataFormat);
  const topSeverities = Object.entries(agg.severityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // For test cases, also show status distribution in KPI
  const isTestCase = dataFormat === "test_case";
  const statusCards = isTestCase
    ? Object.entries(agg.reproducibilityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
    : [];

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <p className="text-sm text-muted-foreground font-mono">{fileName}</p>
        {dataFormat !== "bug_report" && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary uppercase">
            {dataFormat === "test_case" ? "Test Cases" : "Generic"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{labels.total}</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{agg.total}</p>
        </div>
        {isTestCase ? (
          statusCards.map(([status, count]) => {
            const cfg = severityConfig[status] || { icon: Bug, colorClass: "text-chart-info" };
            const Icon = cfg.icon;
            return (
              <div key={status} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${cfg.colorClass}`} />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{status}</p>
                </div>
                <p className={`mt-1 text-3xl font-bold ${cfg.colorClass}`}>{count}</p>
              </div>
            );
          })
        ) : (
          topSeverities.map(([sev, count]) => {
            const cfg = severityConfig[sev] || { icon: Bug, colorClass: "text-chart-info" };
            const Icon = cfg.icon;
            return (
              <div key={sev} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${cfg.colorClass}`} />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{sev}</p>
                </div>
                <p className={`mt-1 text-3xl font-bold ${cfg.colorClass}`}>{count}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
