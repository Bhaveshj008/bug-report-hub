import { useMemo } from "react";
import type { BugRow } from "@/types/bug";

interface Props {
  bugs: BugRow[];
}

const SEV_ORDER = ["Critical", "High", "Medium", "Low"];

export function SeverityComponentHeatmap({ bugs }: Props) {
  const { components, matrix, maxCount } = useMemo(() => {
    const compCounts: Record<string, number> = {};
    for (const b of bugs) {
      compCounts[b.component] = (compCounts[b.component] || 0) + 1;
    }
    const topComps = Object.entries(compCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([c]) => c);

    const m: Record<string, Record<string, number>> = {};
    let max = 0;
    for (const comp of topComps) {
      m[comp] = {};
      for (const sev of SEV_ORDER) {
        const count = bugs.filter((b) => b.component === comp && b.severity === sev).length;
        m[comp][sev] = count;
        if (count > max) max = count;
      }
    }
    return { components: topComps, matrix: m, maxCount: max };
  }, [bugs]);

  const getColor = (count: number, sev: string) => {
    if (count === 0) return "bg-muted/30";
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    const colorMap: Record<string, string[]> = {
      Critical: ["bg-chart-critical/10", "bg-chart-critical/30", "bg-chart-critical/50", "bg-chart-critical/70"],
      High: ["bg-chart-high/10", "bg-chart-high/30", "bg-chart-high/50", "bg-chart-high/70"],
      Medium: ["bg-chart-medium/10", "bg-chart-medium/30", "bg-chart-medium/50", "bg-chart-medium/70"],
      Low: ["bg-chart-low/10", "bg-chart-low/30", "bg-chart-low/50", "bg-chart-low/70"],
    };
    const colors = colorMap[sev] || colorMap.Low;
    const idx = Math.min(Math.floor(intensity * colors.length), colors.length - 1);
    return colors[idx];
  };

  if (components.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4 animate-fade-in">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Severity × Component Heatmap</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">Component</th>
              {SEV_ORDER.map((s) => (
                <th key={s} className="px-2 py-1.5 text-center text-muted-foreground font-medium">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {components.map((comp) => (
              <tr key={comp} className="border-t border-border/50">
                <td className="px-2 py-1.5 text-foreground font-medium truncate max-w-[120px]">{comp}</td>
                {SEV_ORDER.map((sev) => {
                  const count = matrix[comp]?.[sev] || 0;
                  return (
                    <td key={sev} className="px-1 py-1">
                      <div
                        className={`flex items-center justify-center rounded py-1.5 text-xs font-medium ${getColor(count, sev)} ${count > 0 ? "text-foreground" : "text-muted-foreground/50"}`}
                      >
                        {count}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
