import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { BugRow } from "@/types/bug";

interface Props {
  bugs: BugRow[];
}

const SEV_COLORS: Record<string, string> = {
  Critical: "hsl(var(--chart-critical))",
  High: "hsl(var(--chart-high))",
  Medium: "hsl(var(--chart-medium))",
  Low: "hsl(var(--chart-low))",
};

export function SeverityPlatformMatrix({ bugs }: Props) {
  const { data, severities } = useMemo(() => {
    const platCounts: Record<string, number> = {};
    for (const b of bugs) platCounts[b.platform] = (platCounts[b.platform] || 0) + 1;
    const topPlats = Object.entries(platCounts).sort(([, a], [, b]) => b - a).slice(0, 6).map(([p]) => p);

    const sevSet = new Set<string>();
    const chartData = topPlats.map((plat) => {
      const entry: Record<string, string | number> = { platform: plat };
      for (const b of bugs) {
        if (b.platform === plat) {
          sevSet.add(b.severity);
          entry[b.severity] = ((entry[b.severity] as number) || 0) + 1;
        }
      }
      return entry;
    });

    return { data: chartData, severities: Array.from(sevSet).sort() };
  }, [bugs]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4 animate-fade-in">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Severity × Platform</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis dataKey="platform" type="category" width={80} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {severities.map((sev) => (
            <Bar key={sev} dataKey={sev} stackId="a" fill={SEV_COLORS[sev] || "hsl(var(--chart-info))"} radius={[0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
