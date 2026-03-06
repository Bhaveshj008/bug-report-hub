import { useState, useMemo } from "react";
import { Search, Filter, ArrowUpDown } from "lucide-react";
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

  // Show all columns except very long text — up to 10
  const visibleColumns = useMemo(() => {
    return analysis.columns
      .filter(c => c.type !== "text" || c.fillRate > 70)
      .slice(0, 10)
      .map(c => c.name);
  }, [analysis]);

  // Filterable columns
  const filterColumns = useMemo(() => {
    return analysis.columns
      .filter(c => c.type === "categorical" && c.uniqueCount <= 25 && c.uniqueCount >= 2)
      .slice(0, 5);
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
    for (const [col, val] of Object.entries(filters)) {
      if (val) result = result.filter(r => r[col] === val);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        visibleColumns.some(col => (r[col] || "").toLowerCase().includes(q))
      );
    }
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const av = a[sortCol] || "", bv = b[sortCol] || "";
        // Try numeric sort
        const an = parseFloat(av), bn = parseFloat(bv);
        if (!isNaN(an) && !isNaN(bn)) return sortAsc ? an - bn : bn - an;
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return result;
  }, [rows, filters, search, sortCol, sortAsc, visibleColumns]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const activeFilters = Object.values(filters).filter(Boolean).length;

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  return (
    <div className="animate-fade-in rounded-xl border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 bg-muted/20">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search across all columns…"
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        {filterColumns.map(col => (
          <select
            key={col.name}
            value={filters[col.name] || ""}
            onChange={(e) => { setFilters(f => ({ ...f, [col.name]: e.target.value })); setPage(0); }}
            className="h-9 rounded-lg border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 max-w-[160px]"
          >
            <option value="">All {col.name}</option>
            {(filterOptions[col.name] || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        {activeFilters > 0 && (
          <button onClick={() => setFilters({})} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Filter className="h-3 w-3" /> Clear {activeFilters}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-10">#</th>
              {visibleColumns.map(col => (
                <th
                  key={col}
                  onClick={() => toggleSort(col)}
                  className="cursor-pointer whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {sortCol === col ? (
                      <span className="text-primary">{sortAsc ? "↑" : "↓"}</span>
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
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
                className="cursor-pointer border-b transition-colors hover:bg-primary/5 last:border-0"
              >
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{page * perPage + i + 1}</td>
                {visibleColumns.map(col => (
                  <td key={col} className="max-w-[220px] truncate whitespace-nowrap px-4 py-2.5 text-foreground">
                    {row[col] || <span className="text-muted-foreground/40">—</span>}
                  </td>
                ))}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                  No matching records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-2.5 bg-muted/10">
          <span className="text-xs text-muted-foreground">
            Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(0)} disabled={page === 0}
              className="rounded-md border px-2 py-1 text-xs text-foreground disabled:opacity-30 hover:bg-muted">First</button>
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="rounded-md border px-2.5 py-1 text-xs text-foreground disabled:opacity-30 hover:bg-muted">Prev</button>
            <span className="px-2 text-xs font-medium text-foreground">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
              className="rounded-md border px-2.5 py-1 text-xs text-foreground disabled:opacity-30 hover:bg-muted">Next</button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
              className="rounded-md border px-2 py-1 text-xs text-foreground disabled:opacity-30 hover:bg-muted">Last</button>
          </div>
        </div>
      )}
    </div>
  );
}
