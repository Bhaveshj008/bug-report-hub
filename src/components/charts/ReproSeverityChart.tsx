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

export function ReproSeverityChart({ bugs }: Props) {
  const { data, severities } = useMemo(() => {
    const reproSet = new Set<string>();
    const sevSet = new Set<string>();
    for (const b of bugs) {
      reproSet.add(b.reproducibility);
      sevSet.add(b.severity);
    }

    const chartData = Array.from(reproSet)
      .filter((r) => r !== "Unknown")
      .map((repro) => {
        const entry: Record<string, string | number> = { repro };
        for (const b of bugs) {
          if (b.reproducibility === repro) {
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
      <h3 className="mb-3 text-sm font-semibold text-foreground">Reproducibility × Severity</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: 10, right: 10 }}>
          <XAxis dataKey="repro" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
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
            <Bar key={sev} dataKey={sev} stackId="a" fill={SEV_COLORS[sev] || "hsl(var(--chart-info))"} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
