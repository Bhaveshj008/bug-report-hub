import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { RawRow } from "@/types/bug";

interface Props {
  rows: RawRow[];
  groupCol: string;
  stackCol: string;
  title: string;
}

const STACK_COLORS = [
  "hsl(0, 88%, 48%)",
  "hsl(25, 95%, 53%)",
  "hsl(45, 93%, 47%)",
  "hsl(142, 71%, 45%)",
  "hsl(190, 80%, 42%)",
  "hsl(262, 60%, 55%)",
  "hsl(330, 60%, 50%)",
  "hsl(200, 70%, 50%)",
];

export function DynamicStackedBar({ rows, groupCol, stackCol, title }: Props) {
  const { data, stackValues } = useMemo(() => {
    const groupCounts: Record<string, number> = {};
    for (const r of rows) {
      const g = (r[groupCol] || "").trim();
      if (g) groupCounts[g] = (groupCounts[g] || 0) + 1;
    }
    const topGroups = Object.entries(groupCounts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([k]) => k);

    const stackSet = new Set<string>();
    const chartData = topGroups.map(group => {
      const entry: Record<string, string | number> = { group };
      for (const r of rows) {
        if ((r[groupCol] || "").trim() === group) {
          const sv = (r[stackCol] || "").trim();
          if (sv) {
            stackSet.add(sv);
            entry[sv] = ((entry[sv] as number) || 0) + 1;
          }
        }
      }
      return entry;
    });

    return { data: chartData, stackValues: Array.from(stackSet).slice(0, 8) };
  }, [rows, groupCol, stackCol]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4 animate-fade-in">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ left: 10, right: 10 }}>
          <XAxis dataKey="group" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-25} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {stackValues.map((sv, i) => (
            <Bar key={sv} dataKey={sv} stackId="a" fill={STACK_COLORS[i % STACK_COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
