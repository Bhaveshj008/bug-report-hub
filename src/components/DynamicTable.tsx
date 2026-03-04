import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { RawRow, DataAnalysis } from "@/types/bug";

interface Props {
  rows: RawRow[];
  analysis: DataAnalysis;
  onSelectRow: (row: RawRow) => void;
}

export function DynamicTable({ rows, analysis, onSelectRow }: Props) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortCol, setSortCol] = useState<string>("");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const perPage = 25;

  // Determine visible columns (skip very long text columns for table display)
  const visibleColumns = useMemo(() => {
    return analysis.columns
      .filter(c => c.type !== "text" || c.name.toLowerCase().includes("summary") || c.name.toLowerCase().includes("title"))
      .slice(0, 8)
      .map(c => c.name);
  }, [analysis]);

  // Filterable columns (categorical only)
  const filterColumns = useMemo(() => {
    return analysis.columns
      .filter(c => c.type === "categorical" && c.uniqueCount <= 20)
      .slice(0, 4);
  }, [analysis]);

  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    for (const col of filterColumns) {
      opts[col.name] = [...new Set(rows.map(r => r[col.name]).filter(Boolean))].sort();
    }
    return opts;
  }, [rows, filterColumns]);

  const filtered = useMemo(() => {
    let result = rows;

    // Apply filters
    for (const [col, val] of Object.entries(filters)) {
      if (val) result = result.filter(r => r[col] === val);
    }

    // Search across all visible columns
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        visibleColumns.some(col => (r[col] || "").toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const cmp = (a[sortCol] || "").localeCompare(b[sortCol] || "");
        return sortAsc ? cmp : -cmp;
      });
    }

    return result;
  }, [rows, filters, search, sortCol, sortAsc, visibleColumns]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  return (
    <div className="animate-fade-in rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search…"
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        {filterColumns.map(col => (
          <select
            key={col.name}
            value={filters[col.name] || ""}
            onChange={(e) => { setFilters(f => ({ ...f, [col.name]: e.target.value })); setPage(0); }}
            className="h-9 rounded-md border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All {col.name}</option>
            {(filterOptions[col.name] || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              {visibleColumns.map(col => (
                <th
                  key={col}
                  onClick={() => toggleSort(col)}
                  className="cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-1">
                    {col}
                    {sortCol === col && (sortAsc ? " ↑" : " ↓")}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr
                key={i}
                onClick={() => onSelectRow(row)}
                className="cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-0"
              >
                {visibleColumns.map(col => (
                  <td key={col} className="max-w-[250px] truncate whitespace-nowrap px-3 py-2 text-foreground">
                    {row[col] || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {filtered.length} results • Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="rounded border px-2 py-1 text-xs text-foreground disabled:opacity-30 hover:bg-muted">Prev</button>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
              className="rounded border px-2 py-1 text-xs text-foreground disabled:opacity-30 hover:bg-muted">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
