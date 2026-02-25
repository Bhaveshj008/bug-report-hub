import { useState, useCallback } from "react";
import { Sparkles, Send, Loader2, RefreshCw, MessageSquare, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { generateInsights, askAboutBugs } from "@/utils/aiInsights";
import type { Aggregations, BugRow } from "@/types/bug";

interface AIInsightsPanelProps {
  apiKey: string;
  agg: Aggregations;
  bugs: BugRow[];
}

export function AIInsightsPanel({ apiKey, agg, bugs }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Q&A
  const [showChat, setShowChat] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateInsights(apiKey, agg, bugs);
      if (result) {
        setInsights(result);
      } else {
        setError("Failed to generate insights. Check your API key.");
      }
    } catch {
      setError("Failed to connect to Groq API.");
    }
    setLoading(false);
  }, [apiKey, agg, bugs]);

  const handleAsk = useCallback(async () => {
    if (!question.trim()) return;
    setChatLoading(true);
    const q = question;
    setQuestion("");
    try {
      const answer = await askAboutBugs(apiKey, q, agg, bugs);
      setChatHistory((prev) => [...prev, { q, a: answer || "Unable to answer. Try rephrasing." }]);
    } catch {
      setChatHistory((prev) => [...prev, { q, a: "Error connecting to AI." }]);
    }
    setChatLoading(false);
  }, [apiKey, question, agg, bugs]);

  return (
    <div className="space-y-4">
      {/* Insights Section */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Llama 3.3
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowChat(!showChat)}
              className="flex h-7 items-center gap-1 rounded-md border px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MessageSquare className="h-3 w-3" />
              Ask
            </button>
            {insights && (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex h-7 items-center gap-1 rounded-md border px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          {!insights && !loading && !error && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Generate AI-Powered Insights</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                Analyzes severity distributions, risk areas, and trends. Sends only aggregated stats — never raw data.
              </p>
              <button
                onClick={handleGenerate}
                className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate Insights
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analyzing {agg.total} bugs...</span>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {insights && !loading && (
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground [&_h2]:text-base [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_ul]:text-xs [&_ol]:text-xs [&_p]:text-xs [&_li]:text-xs">
              <ReactMarkdown>{insights}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      {/* Q&A Chat */}
      {showChat && (
        <div className="rounded-lg border bg-card animate-fade-in">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Ask About Your Bugs</h3>
            </div>
            <button onClick={() => setShowChat(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-4 space-y-3">
            {chatHistory.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Ask questions like "What are the riskiest components?" or "How many critical bugs on Android?"
              </p>
            )}
            {chatHistory.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-end">
                  <div className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-foreground max-w-[80%]">
                    {item.q}
                  </div>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:text-xs [&_li]:text-xs [&_h2]:text-sm [&_h3]:text-xs">
                    <ReactMarkdown>{item.a}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Thinking...</span>
              </div>
            )}
          </div>

          <div className="border-t px-4 py-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !chatLoading && handleAsk()}
                placeholder="Ask about your bug data..."
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleAsk}
                disabled={chatLoading || !question.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
