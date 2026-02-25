import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

interface VBarChartProps {
  data: Record<string, number>;
  title: string;
  color?: string;
}

export function VBarChart({ data, title, color = "hsl(var(--chart-2))" }: VBarChartProps) {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 12) + "…" : name, value, fullName: name }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div className="rounded-lg border bg-card p-4 animate-fade-in">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
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
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
