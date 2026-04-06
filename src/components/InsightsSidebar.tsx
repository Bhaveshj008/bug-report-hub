import { useState, useEffect } from "react";
import { X, History, Clock, FileText, Trash2, Sparkles, Eye } from "lucide-react";
import { loadAnalysisHistory, deleteAnalysisRecord, type AnalysisRecord } from "@/utils/store";

interface Props {
  open: boolean;
  onClose: () => void;
  onLoadRecord?: (record: AnalysisRecord) => void;
}

export function InsightsSidebar({ open, onClose, onLoadRecord }: Props) {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadAnalysisHistory().then(setRecords);
    }
  }, [open]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteAnalysisRecord(id);
    setRecords(prev => prev.filter(r => r.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
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
            {records.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {records.length}
              </span>
            )}
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
                Upload a file to start tracking your analyses here.
              </p>
            </div>
          ) : (
            records.map((record) => (
              <div key={record.id} className="rounded-lg border bg-background overflow-hidden">
                {/* Record header */}
                <div
                  className="flex items-start justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => setExpanded(expanded === record.id ? null : record.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{record.fileName}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground">{formatDate(record.timestamp)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, record.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all ml-2 shrink-0"
                    title="Delete record"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Badges */}
                <div className="px-3 pb-2 flex items-center gap-2 flex-wrap">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">
                    {record.rowCount} rows
                  </span>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-medium text-accent-foreground">
                    {record.columnCount} cols
                  </span>
                  {record.hasInsights && (
                    <span className="rounded-full bg-chart-high/10 px-2 py-0.5 text-[9px] font-medium text-chart-high flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5" /> AI Insights
                    </span>
                  )}
                </div>

                {/* Expanded insights */}
                {expanded === record.id && record.insights && (
                  <div className="border-t px-3 py-3 space-y-2">
                    <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-6">
                      {record.insights.replace(/[#*_]/g, "").slice(0, 400)}…
                    </p>
                    {onLoadRecord && (
                      <button
                        onClick={() => { onLoadRecord(record); onClose(); }}
                        className="flex items-center gap-1.5 w-full justify-center rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        View Full Insights
                      </button>
                    )}
                  </div>
                )}

                {/* Expanded but no insights */}
                {expanded === record.id && !record.insights && (
                  <div className="border-t px-3 py-3">
                    <p className="text-[10px] text-muted-foreground text-center">
                      No AI insights were generated for this analysis.
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}