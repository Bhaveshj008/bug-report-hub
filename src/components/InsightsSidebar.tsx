import { useState, useEffect, useCallback } from "react";
import { History, X, Trash2, ChevronRight, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { loadAllInsights, deleteInsight, type SavedInsight } from "@/utils/store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InsightsSidebar({ open, onClose }: Props) {
  const [insights, setInsights] = useState<SavedInsight[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const all = await loadAllInsights();
    setInsights(all);
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const handleDelete = async (id: string) => {
    await deleteInsight(id);
    setInsights(prev => prev.filter(i => i.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-card border-l shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <History className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Insights History</h2>
              <p className="text-[10px] text-muted-foreground">{insights.length} saved insight{insights.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No insights yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Generate AI insights to see them saved here.</p>
            </div>
          ) : (
            insights.map((insight) => (
              <div key={insight.id} className="rounded-lg border bg-background transition-colors hover:border-primary/30">
                <button
                  onClick={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandedId === insight.id ? "rotate-90" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{insight.fileName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(insight.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {" · "}{insight.rowCount} rows
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(insight.id); }}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>

                {expandedId === insight.id && (
                  <div className="border-t px-4 py-3">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground [&_h2]:text-sm [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-xs [&_ul]:text-xs [&_ol]:text-xs [&_p]:text-xs [&_li]:text-xs">
                      <ReactMarkdown>{insight.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
