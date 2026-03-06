import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SeverityPieChartProps {
  data: Record<string, number>;
  title?: string;
}

const COLORS = [
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
  const { name, value, payload: p } = payload[0];
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground">{name}</p>
      <p className="text-sm font-bold text-foreground">{value} <span className="text-muted-foreground font-normal">({p.pct}%)</span></p>
    </div>
  );
};

export function SeverityPieChart({ data, title }: SeverityPieChartProps) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  const chartData = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value, pct: total > 0 ? Math.round((value / total) * 100) : 0 }));

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <h3 className="mb-1 text-sm font-semibold text-foreground">{title || "Distribution"}</h3>
      <p className="mb-3 text-[11px] text-muted-foreground">{chartData.length} categories · {total} total</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
            animationBegin={0}
            animationDuration={600}
          >
            {chartData.map((entry, i) => (
              <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => <span className="text-xs text-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
