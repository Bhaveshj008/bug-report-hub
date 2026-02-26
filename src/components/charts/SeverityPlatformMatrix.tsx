import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { BugRow } from "@/types/bug";

interface Props {
  bugs: BugRow[];
}

const SEV_COLORS: Record<string, string> = {
  Critical: "hsl(0, 88%, 48%)",
  High: "hsl(25, 95%, 53%)",
  Medium: "hsl(45, 93%, 47%)",
  Low: "hsl(142, 71%, 45%)",
  Blocker: "hsl(18, 95%, 45%)",
  Major: "hsl(38, 95%, 50%)",
  Minor: "hsl(120, 70%, 44%)",
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

    const SEV_ORDER = ["Critical", "High", "Medium", "Low", "Blocker", "Major", "Minor"];
    const sortedSeverities = SEV_ORDER.filter((s) => sevSet.has(s));
    return { data: chartData, severities: sortedSeverities.length > 0 ? sortedSeverities : Array.from(sevSet).sort() };
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
