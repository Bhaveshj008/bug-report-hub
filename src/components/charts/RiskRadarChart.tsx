import { useMemo } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import type { BugRow } from "@/types/bug";

interface Props {
  bugs: BugRow[];
}

const SEVERITY_WEIGHT: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function RiskRadarChart({ bugs }: Props) {
  const data = useMemo(() => {
    const compCounts: Record<string, number> = {};
    for (const b of bugs) compCounts[b.component] = (compCounts[b.component] || 0) + 1;
    const topComps = Object.entries(compCounts).sort(([, a], [, b]) => b - a).slice(0, 6).map(([c]) => c);

    return topComps.map((comp) => {
      const compBugs = bugs.filter((b) => b.component === comp);
      const riskScore = compBugs.reduce((s, b) => s + (SEVERITY_WEIGHT[b.severity] || 1), 0);
      const criticalCount = compBugs.filter((b) => b.severity === "Critical" || b.severity === "High").length;
      const volume = compBugs.length;
      return {
        component: comp.length > 12 ? comp.slice(0, 12) + "…" : comp,
        risk: Math.round((riskScore / Math.max(volume, 1)) * 25),
        volume: Math.min(volume * 5, 100),
        critical: Math.min(criticalCount * 15, 100),
      };
    });
  }, [bugs]);

  if (data.length < 3) return null;

  return (
    <div className="rounded-lg border bg-card p-4 animate-fade-in">
      <h3 className="mb-1 text-sm font-semibold text-foreground">Risk Score Radar</h3>
      <p className="mb-2 text-[10px] text-muted-foreground">Weighted risk per component (severity × volume)</p>
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="component" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <PolarRadiusAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
          <Radar name="Risk" dataKey="risk" stroke="hsl(var(--chart-critical))" fill="hsl(var(--chart-critical))" fillOpacity={0.3} />
          <Radar name="Volume" dataKey="volume" stroke="hsl(var(--chart-info))" fill="hsl(var(--chart-info))" fillOpacity={0.2} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
