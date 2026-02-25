import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SeverityPieChartProps {
  data: Record<string, number>;
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "hsl(0, 72%, 51%)",
  High: "hsl(25, 95%, 53%)",
  Medium: "hsl(45, 93%, 47%)",
  Low: "hsl(142, 71%, 45%)",
};

const DEFAULT_COLORS = [
  "hsl(190, 80%, 42%)",
  "hsl(262, 60%, 55%)",
  "hsl(25, 95%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 47%)",
  "hsl(0, 72%, 51%)",
];

export function SeverityPieChart({ data }: SeverityPieChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

  return (
    <div className="rounded-lg border bg-card p-4 animate-fade-in">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Severity Distribution</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={SEVERITY_COLORS[entry.name] || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
              color: "hsl(var(--foreground))",
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
