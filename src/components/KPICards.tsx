import { Bug, AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { Aggregations } from "@/types/bug";

interface KPICardsProps {
  agg: Aggregations;
  fileName: string;
}

const severityConfig: Record<string, { icon: React.ElementType; colorClass: string }> = {
  Critical: { icon: AlertCircle, colorClass: "text-chart-critical" },
  High: { icon: AlertTriangle, colorClass: "text-chart-high" },
  Medium: { icon: Info, colorClass: "text-chart-medium" },
  Low: { icon: Bug, colorClass: "text-chart-low" },
};

export function KPICards({ agg, fileName }: KPICardsProps) {
  const topSeverities = Object.entries(agg.severityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <p className="text-sm text-muted-foreground font-mono">{fileName}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Bugs</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{agg.total}</p>
        </div>
        {topSeverities.map(([sev, count]) => {
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
        })}
      </div>
    </div>
  );
}
