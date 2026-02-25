import type { BugRow, Aggregations } from "@/types/bug";

function countBy(rows: BugRow[], key: keyof BugRow): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const val = row[key] || "Unknown";
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

export function aggregate(rows: BugRow[]): Aggregations {
  return {
    total: rows.length,
    severityCounts: countBy(rows, "severity"),
    categoryCounts: countBy(rows, "category"),
    componentCounts: countBy(rows, "component"),
    platformCounts: countBy(rows, "platform"),
    reproducibilityCounts: countBy(rows, "reproducibility"),
  };
}

export function topN(counts: Record<string, number>, n: number): { name: string; count: number }[] {
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}
