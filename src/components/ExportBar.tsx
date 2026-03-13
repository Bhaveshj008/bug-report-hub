import { Download, FileText } from "lucide-react";
import { exportCSV, exportPDF } from "@/utils/exportUtils";
import type { RawRow, DataAnalysis, DynamicAggregations } from "@/types/bug";

interface ExportBarProps {
  bugs: RawRow[];
  fileName: string;
  analysis: DataAnalysis;
  agg: DynamicAggregations;
  visibleKPIs?: Set<number>;
}

export function ExportBar({ bugs, fileName, analysis, agg, visibleKPIs }: ExportBarProps) {
  const baseName = fileName.replace(/\.(xlsx|xls|csv)$/i, "").replace(/[^a-zA-Z0-9\s-]/g, "").trim() || "export";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => exportCSV(bugs, `${baseName}-export.csv`)}
        className="flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Download className="h-3.5 w-3.5" />
        CSV
      </button>
      <button
        onClick={() => exportPDF(`${baseName}-report.pdf`, { analysis, agg, rows: bugs, visibleKPIs, dataFileName: fileName })}
        className="flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        <FileText className="h-3.5 w-3.5" />
        PDF
      </button>
    </div>
  );
}
