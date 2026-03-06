import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";

interface HBarChartProps {
  data: Record<string, number>;
  title: string;
  color?: string;
}

const BAR_COLORS = [
  "hsl(190, 80%, 42%)",
  "hsl(262, 60%, 55%)",
  "hsl(25, 95%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 47%)",
  "hsl(0, 72%, 51%)",
  "hsl(330, 60%, 50%)",
  "hsl(200, 70%, 50%)",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground">{payload[0].payload.fullName}</p>
      <p className="text-sm font-bold text-foreground">{payload[0].value}</p>
    </div>
  );
};

export function HBarChart({ data, title }: HBarChartProps) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name: name.length > 22 ? name.slice(0, 20) + "…" : name, value, fullName: name }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mb-3 text-[11px] text-muted-foreground">Top {chartData.length} · {total} total</p>
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 34)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={500}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
