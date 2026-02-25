import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

interface HBarChartProps {
  data: Record<string, number>;
  title: string;
  color?: string;
}

export function HBarChart({ data, title, color = "hsl(var(--primary))" }: HBarChartProps) {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 18) + "…" : name, value, fullName: name }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div className="rounded-lg border bg-card p-4 animate-fade-in">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
              color: "hsl(var(--foreground))",
            }}
            formatter={(value: number, _: string, props: any) => [value, props.payload.fullName]}
          />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
