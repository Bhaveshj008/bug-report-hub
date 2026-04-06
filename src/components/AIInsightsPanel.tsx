import { useState, useCallback, useEffect, useRef } from "react";
import { Sparkles, Send, Loader2, RefreshCw, MessageSquare, X, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { generateInsights, askAboutBugs } from "@/utils/aiInsights";
import { saveChatHistory, loadChatHistory, clearChatHistory, type ChatEntry } from "@/utils/store";
import type { DynamicAggregations, RawRow, AIProvider, ModuleRiskData, DataAnalysis, AISchema } from "@/types/bug";

interface AIInsightsPanelProps {
  apiKey: string;
  provider: AIProvider;
  model: string;
  agg: DynamicAggregations;
  bugs: RawRow[];
  datasetKey: string;
  moduleRisks?: ModuleRiskData[];
  initialInsights?: string | null;
  onInsightsGenerated?: (insights: string) => void;
  analysis: DataAnalysis;
  aiSchema: AISchema | null;
}

export function AIInsightsPanel({
  apiKey, provider, model, agg, bugs, datasetKey, moduleRisks, initialInsights, onInsightsGenerated,
  analysis, aiSchema
}: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<string | null>(initialInsights || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load persisted chat history when dataset changes
  useEffect(() => {
    if (datasetKey) {
      loadChatHistory(datasetKey).then(setChatHistory);
    }
  }, [datasetKey]);

  // Scroll to bottom when chat updates
  useEffect(() => {
    if (showChat && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, showChat]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateInsights(apiKey, provider, model, agg, bugs, moduleRisks, analysis, aiSchema);
      if (result) {
        setInsights(result);
        onInsightsGenerated?.(result);
      } else {
        setError("Failed to generate insights. Check your API key and try again.");
      }
    } catch {
      setError("Failed to connect to AI provider. Check your API key.");
    }
    setLoading(false);
  }, [apiKey, provider, model, agg, bugs, moduleRisks, analysis, aiSchema, onInsightsGenerated]);

  const handleAsk = useCallback(async () => {
    if (!question.trim()) return;
    setChatLoading(true);
    const q = question.trim();
    setQuestion("");
    
    try {
      const answer = await askAboutBugs(
        apiKey, provider, model,
        q, bugs, chatHistory, agg, moduleRisks, analysis, aiSchema
      );
      
      const entry: ChatEntry = { 
        q, 
        a: answer || "Unable to answer. Try rephrasing your question.", 
        timestamp: Date.now() 
      };
      
      const newHistory = [...chatHistory, entry];
      setChatHistory(newHistory);
      await saveChatHistory(datasetKey, newHistory);
    } catch {
      const errorEntry: ChatEntry = { 
        q, 
        a: "Error connecting to AI provider.", 
        timestamp: Date.now() 
      };
      const newHistory = [...chatHistory, errorEntry];
      setChatHistory(newHistory);
      await saveChatHistory(datasetKey, newHistory);
    }
    
    setChatLoading(false);
  }, [apiKey, provider, model, question, agg, bugs, chatHistory, datasetKey, moduleRisks, analysis, aiSchema]);

  const handleClearChat = useCallback(async () => {
    setChatHistory([]);
    await clearChatHistory(datasetKey);
  }, [datasetKey]);

  const providerLabel = { groq: "Groq", openai: "OpenAI", google: "Gemini", anthropic: "Claude" }[provider] || provider;
  const modelShort = model.split("/").pop()?.split("-").slice(0, 3).join("-") || model;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {providerLabel} · {modelShort}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowChat(!showChat)}
              className="flex h-7 items-center gap-1 rounded-md border px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MessageSquare className="h-3 w-3" />
              {showChat ? "Hide Chat" : "Ask Data"}
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex h-7 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              {insights ? "Regenerate" : "Analyze Now"}
            </button>
          </div>
        </div>

        <div className="p-4">
          {!insights && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="mb-3 rounded-full bg-muted p-3">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mb-1 text-sm font-medium text-foreground">No insights generated yet</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Click Analyze Now to let AI discover patterns, anomalies, and key takeaways from your data.
              </p>
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analyzing {agg.total} rows with {providerLabel}…</span>
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

      {showChat && (
        <div className="rounded-lg border bg-card animate-fade-in">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Ask About Your Data</h3>
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">RAG</span>
            </div>
            <div className="flex items-center gap-1">
              {chatHistory.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="flex h-6 items-center gap-1 rounded px-2 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Clear chat history"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              )}
              <button onClick={() => setShowChat(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-4 space-y-3">
            {chatHistory.length === 0 && (
              <div className="text-center py-2 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Ask anything about your data. The AI searches relevant rows to answer precisely.
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {["What patterns do you see?", "What are the top categories?", "Summarize the key findings"].map(s => (
                    <button
                      key={s}
                      onClick={() => setQuestion(s)}
                      className="rounded-full border bg-muted/50 px-2.5 py-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
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
                <span className="text-xs">Searching & analyzing…</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <div className="border-t px-4 py-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !chatLoading && handleAsk()}
                placeholder="Ask about your data…"
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