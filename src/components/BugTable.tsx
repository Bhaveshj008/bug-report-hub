import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import type { BugRow } from "@/types/bug";

interface BugTableProps {
  rows: BugRow[];
  onSelectBug: (bug: BugRow) => void;
}

const SEVERITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export function BugTable({ rows, onSelectBug }: BugTableProps) {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("");
  const [platFilter, setPlatFilter] = useState("");
  const [compFilter, setCompFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [sortField, setSortField] = useState<"severity" | "component" | "jiraId">("severity");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const perPage = 25;

  const severities = useMemo(() => [...new Set(rows.map((r) => r.severity))].sort(), [rows]);
  const platforms = useMemo(() => [...new Set(rows.map((r) => r.platform))].sort(), [rows]);
  const components = useMemo(() => [...new Set(rows.map((r) => r.component))].sort(), [rows]);
  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (sevFilter) result = result.filter((r) => r.severity === sevFilter);
    if (platFilter) result = result.filter((r) => r.platform === platFilter);
    if (compFilter) result = result.filter((r) => r.component === compFilter);
    if (catFilter) result = result.filter((r) => r.category === catFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.summary.toLowerCase().includes(q) ||
          r.jiraId.toLowerCase().includes(q) ||
          r.component.toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      if (sortField === "severity") {
        const diff = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
        return sortAsc ? diff : -diff;
      }
      const cmp = a[sortField].localeCompare(b[sortField]);
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [rows, sevFilter, platFilter, compFilter, catFilter, search, sortField, sortAsc]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null;

  const severityBadge = (sev: string) => {
    const colors: Record<string, string> = {
      Critical: "bg-chart-critical/15 text-chart-critical",
      High: "bg-chart-high/15 text-chart-high",
      Medium: "bg-chart-medium/15 text-chart-medium",
      Low: "bg-chart-low/15 text-chart-low",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[sev] || "bg-muted text-muted-foreground"}`}>
        {sev}
      </span>
    );
  };

  return (
    <div className="animate-fade-in rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search bugs…"
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        {[
          { label: "Severity", value: sevFilter, set: setSevFilter, options: severities },
          { label: "Platform", value: platFilter, set: setPlatFilter, options: platforms },
          { label: "Component", value: compFilter, set: setCompFilter, options: components },
          { label: "Category", value: catFilter, set: setCatFilter, options: categories },
        ].map((f) => (
          <select
            key={f.label}
            value={f.value}
            onChange={(e) => { f.set(e.target.value); setPage(0); }}
            className="h-9 rounded-md border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All {f.label}</option>
            {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium text-muted-foreground" onClick={() => toggleSort("jiraId")}>
                <span className="flex items-center gap-1">ID <SortIcon field="jiraId" /></span>
              </th>
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Summary</th>
              <th className="cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium text-muted-foreground" onClick={() => toggleSort("severity")}>
                <span className="flex items-center gap-1">Severity <SortIcon field="severity" /></span>
              </th>
              <th className="cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium text-muted-foreground" onClick={() => toggleSort("component")}>
                <span className="flex items-center gap-1">Component <SortIcon field="component" /></span>
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted-foreground">Platform</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted-foreground">Category</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((bug, i) => (
              <tr
                key={i}
                onClick={() => onSelectBug(bug)}
                className="cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-0"
              >
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-primary">{bug.jiraId}</td>
                <td className="max-w-[300px] truncate px-3 py-2 text-foreground">{bug.summary}</td>
                <td className="px-3 py-2">{severityBadge(bug.severity)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{bug.component}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{bug.platform}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{bug.category}</td>
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
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded border px-2 py-1 text-xs text-foreground disabled:opacity-30 hover:bg-muted"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="rounded border px-2 py-1 text-xs text-foreground disabled:opacity-30 hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
