import { useState, useEffect } from "react";
import { X, History, Clock, FileText, Trash2 } from "lucide-react";
import { loadAnalysisHistory, deleteAnalysisRecord, type AnalysisRecord } from "@/utils/store";

interface Props {
  open: boolean;
  onClose: () => void;
  onLoadRecord?: (record: AnalysisRecord) => void;
}

export function InsightsSidebar({ open, onClose, onLoadRecord }: Props) {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);

  useEffect(() => {
    if (open) {
      loadAnalysisHistory().then(setRecords);
    }
  }, [open]);

  const handleDelete = async (id: string) => {
    await deleteAnalysisRecord(id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-card border-l shadow-2xl transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Analysis History</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-52px)] p-3 space-y-2">
          {records.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No analysis history yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Upload a file and generate insights to see history here.
              </p>
            </div>
          ) : (
            records.map((record) => (
              <div
                key={record.id}
                className="rounded-lg border bg-background p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => onLoadRecord?.(record)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{record.fileName}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground">{formatDate(record.timestamp)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">
                    {record.rowCount} rows
                  </span>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-medium text-accent-foreground">
                    {record.columnCount} cols
                  </span>
                  {record.hasInsights && (
                    <span className="rounded-full bg-chart-high/10 px-2 py-0.5 text-[9px] font-medium text-chart-high">
                      AI Insights
                    </span>
                  )}
                </div>
                {record.insights && (
                  <p className="mt-2 text-[10px] text-muted-foreground line-clamp-2">
                    {record.insights.replace(/[#*_]/g, "").slice(0, 120)}...
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
