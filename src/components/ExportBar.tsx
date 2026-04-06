import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { exportCSV, exportPDF } from "@/utils/exportUtils";
import type { RawRow, DataAnalysis, DynamicAggregations, AISchema } from "@/types/bug";

interface ExportBarProps {
  bugs: RawRow[];
  fileName: string;
  analysis: DataAnalysis;
  agg: DynamicAggregations;
  visibleKPIs?: Set<number>;
  aiInsights?: string | null;
  aiSchema?: AISchema | null;
}

export function ExportBar({ bugs, fileName, analysis, agg, visibleKPIs, aiInsights, aiSchema }: ExportBarProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const baseName = fileName
    .replace(/\.(xlsx|xls|csv)$/i, "")
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .trim() || "export";

  const handleCSV = () => {
    exportCSV(bugs, `${baseName}-export.csv`);
  };

  const handlePDF = async () => {
    setPdfLoading(true);
    setPdfError("");
    try {
      await exportPDF(`${baseName}-report.pdf`, {
        analysis,
        agg,
        rows: bugs,
        visibleKPIs,
        dataFileName: fileName,
        aiInsights,
        aiSchema,
      });
    } catch (e) {
      console.error("PDF export failed:", e);
      setPdfError("PDF failed. Try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {pdfError && (
        <span className="text-xs text-destructive">{pdfError}</span>
      )}
      <button
        onClick={handleCSV}
        className="flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        title="Export as CSV"
      >
        <Download className="h-3.5 w-3.5" />
        CSV
      </button>
      <button
        onClick={handlePDF}
        disabled={pdfLoading}
        className="flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
        title="Export as PDF report"
      >
        {pdfLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <FileText className="h-3.5 w-3.5" />
            PDF
          </>
        )}
      </button>
    </div>
  );
}