import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";

interface VBarChartProps {
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

export function VBarChart({ data, title }: VBarChartProps) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 12) + "…" : name, value, fullName: name }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mb-3 text-[11px] text-muted-foreground">{chartData.length} items · {total} total</p>
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
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={500}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
