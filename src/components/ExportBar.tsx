import { Download, FileText } from "lucide-react";
import { exportCSV, exportPDF } from "@/utils/exportUtils";
import type { RawRow } from "@/types/bug";

interface ExportBarProps {
  bugs: RawRow[];
  fileName: string;
}

export function ExportBar({ bugs, fileName }: ExportBarProps) {
  const baseName = fileName.replace(/\.(xlsx|xls)$/i, "");

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
        onClick={() => exportPDF("dashboard-content", `${baseName}-report.pdf`)}
        className="flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        <FileText className="h-3.5 w-3.5" />
        PDF
      </button>
    </div>
  );
}
