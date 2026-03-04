import { useMemo } from "react";
import type { RawRow } from "@/types/bug";

interface Props {
  rows: RawRow[];
  col1: string;
  col2: string;
  title: string;
}

const INTENSITY_CLASSES = [
  "bg-primary/10",
  "bg-primary/25",
  "bg-primary/40",
  "bg-primary/60",
  "bg-primary/80",
];

export function DynamicHeatmap({ rows, col1, col2, title }: Props) {
  const { values1, values2, matrix, maxCount } = useMemo(() => {
    const c1Counts: Record<string, number> = {};
    const c2Counts: Record<string, number> = {};
    for (const r of rows) {
      const v1 = (r[col1] || "").trim();
      const v2 = (r[col2] || "").trim();
      if (v1) c1Counts[v1] = (c1Counts[v1] || 0) + 1;
      if (v2) c2Counts[v2] = (c2Counts[v2] || 0) + 1;
    }
    const v1 = Object.entries(c1Counts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([k]) => k);
    const v2 = Object.entries(c2Counts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([k]) => k);

    const m: Record<string, Record<string, number>> = {};
    let max = 0;
    for (const a of v1) {
      m[a] = {};
      for (const b of v2) {
        const count = rows.filter(r => (r[col1] || "").trim() === a && (r[col2] || "").trim() === b).length;
        m[a][b] = count;
        if (count > max) max = count;
      }
    }
    return { values1: v1, values2: v2, matrix: m, maxCount: max };
  }, [rows, col1, col2]);

  if (values1.length === 0 || values2.length === 0) return null;

  const getColor = (count: number) => {
    if (count === 0) return "bg-muted/30";
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    const idx = Math.min(Math.floor(intensity * INTENSITY_CLASSES.length), INTENSITY_CLASSES.length - 1);
    return INTENSITY_CLASSES[idx];
  };

  return (
    <div className="rounded-lg border bg-card p-4 animate-fade-in">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">{col1}</th>
              {values2.map(v => (
                <th key={v} className="px-2 py-1.5 text-center text-muted-foreground font-medium truncate max-w-[80px]" title={v}>
                  {v.length > 10 ? v.slice(0, 9) + "…" : v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {values1.map(v1 => (
              <tr key={v1} className="border-t border-border/50">
                <td className="px-2 py-1.5 text-foreground font-medium truncate max-w-[120px]" title={v1}>{v1}</td>
                {values2.map(v2 => {
                  const count = matrix[v1]?.[v2] || 0;
                  return (
                    <td key={v2} className="px-1 py-1">
                      <div className={`flex items-center justify-center rounded py-1.5 text-xs font-medium ${getColor(count)} ${count > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>
                        {count}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
