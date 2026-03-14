import { useState, useCallback, useEffect, useMemo } from "react";
import { Bug, Trash2, Upload as UploadIcon, Settings, History } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { GoogleSheetsConnect } from "@/components/GoogleSheetsConnect";
import { SheetSelector } from "@/components/SheetSelector";
import { DynamicKPICards } from "@/components/DynamicKPICards";
import { DynamicCharts } from "@/components/DynamicCharts";
import { DynamicTable } from "@/components/DynamicTable";
import { DynamicDetailDrawer } from "@/components/DynamicDetailDrawer";
import { SettingsModal } from "@/components/SettingsModal";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { ExportBar } from "@/components/ExportBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InsightsSidebar } from "@/components/InsightsSidebar";
import { parseWorkbook, type SheetInfo } from "@/utils/excelParser";
import { analyzeColumns, dynamicAggregate } from "@/utils/columnAnalyzer";
import { getActiveApiKey, getActiveModel } from "@/utils/aiProviders";
import {
  saveBugData, loadBugData,
  savePreferences, loadPreferences, clearAllData,
  saveAnalysisRecord, type AnalysisRecord,
} from "@/utils/store";
import type { RawRow, UserPreferences, GoogleSheetsConfig } from "@/types/bug";

const DEFAULT_PREFS: UserPreferences = { theme: "dark", aiEnabled: false };

export default function Dashboard() {
  const [rows, setRows] = useState<RawRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RawRow | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [showSettings, setShowSettings] = useState(false);
  const [googleConfig, setGoogleConfig] = useState<GoogleSheetsConfig | null>(null);
  const [pendingSheets, setPendingSheets] = useState<SheetInfo[] | null>(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const [visibleKPIs, setVisibleKPIs] = useState<Set<number>>(new Set());
  const [showSidebar, setShowSidebar] = useState(false);
  const [latestInsights, setLatestInsights] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const savedPrefs = await loadPreferences();
      if (savedPrefs) {
        setPrefs(savedPrefs);
        setTheme(savedPrefs.theme);
        document.documentElement.classList.toggle("dark", savedPrefs.theme === "dark");
      } else {
        document.documentElement.classList.add("dark");
      }
      const cached = await loadBugData();
      if (cached) {
        setRows(cached.rows);
        setFileName(cached.fileName);
        if (cached.googleConfig) setGoogleConfig(cached.googleConfig);
      }
    })();
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    const updated = { ...prefs, theme: next as "light" | "dark" };
    setPrefs(updated);
    await savePreferences(updated);
  }, [theme, prefs]);

  const handleSavePrefs = useCallback(async (newPrefs: UserPreferences) => {
    setPrefs(newPrefs);
    setTheme(newPrefs.theme);
    document.documentElement.classList.toggle("dark", newPrefs.theme === "dark");
    await savePreferences(newPrefs);
  }, []);

  const loadSheets = useCallback(async (sheets: SheetInfo[], fName: string, gConfig?: GoogleSheetsConfig) => {
    const allRows: RawRow[] = [];
    const sheetNames: string[] = [];
    for (const sheet of sheets) {
      if (sheets.length > 1) {
        for (const row of sheet.sampleRows) {
          allRows.push({ ...row, __sheet: sheet.name });
        }
      } else {
        allRows.push(...sheet.sampleRows);
      }
      sheetNames.push(sheet.name);
    }

    setRows(allRows);
    const displayName = sheets.length > 1 ? `${fName} (${sheetNames.join(", ")})` : fName;
    setFileName(displayName);
    const cfg = gConfig || googleConfig;
    if (cfg) setGoogleConfig(cfg);
    await saveBugData(allRows, displayName, undefined, cfg || undefined);

    // Save to analysis history
    const record: AnalysisRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: displayName,
      timestamp: Date.now(),
      rowCount: allRows.length,
      columnCount: allRows.length > 0 ? Object.keys(allRows[0]).length : 0,
      hasInsights: false,
    };
    await saveAnalysisRecord(record);
  }, [googleConfig]);

  const loadSheet = useCallback(async (sheet: SheetInfo, fName: string, gConfig?: GoogleSheetsConfig) => {
    return loadSheets([sheet], fName, gConfig);
  }, [loadSheets]);

  const handleFile = useCallback(async (data: ArrayBuffer, fName: string) => {
    setIsLoading(true);
    try {
      const sheets = parseWorkbook(data);
      if (sheets.length === 0) { setIsLoading(false); return; }
      if (sheets.length > 1) {
        setPendingSheets(sheets);
        setPendingFileName(fName);
        setIsLoading(false);
        return;
      }
      await loadSheet(sheets[0], fName);
    } catch (e) { console.error("Parse error:", e); }
    setIsLoading(false);
  }, [loadSheet]);

  const handleSheetsSelected = useCallback(async (selectedSheets: SheetInfo[]) => {
    setPendingSheets(null);
    setIsLoading(true);
    const sheetName = selectedSheets.length === 1 ? selectedSheets[0].name : undefined;
    const updatedConfig = googleConfig ? { ...googleConfig, sheetName } : undefined;
    await loadSheets(selectedSheets, pendingFileName, updatedConfig);
    setIsLoading(false);
  }, [pendingFileName, loadSheets, googleConfig]);

  const handleGoogleSheet = useCallback(async (sheet: SheetInfo, config: GoogleSheetsConfig) => {
    setIsLoading(true);
    await loadSheet(sheet, `Google Sheet: ${sheet.name}`, config);
    setIsLoading(false);
  }, [loadSheet]);

  const handleGoogleSheetsMulti = useCallback((sheets: SheetInfo[], config: GoogleSheetsConfig) => {
    if (sheets.length === 1) {
      handleGoogleSheet(sheets[0], config);
    } else {
      if (googleConfig?.sheetName) {
        const previousSheet = sheets.find(s => s.name === googleConfig.sheetName);
        if (previousSheet) {
          config.sheetName = googleConfig.sheetName;
          handleGoogleSheet(previousSheet, config);
          return;
        }
      }
      setPendingSheets(sheets);
      setPendingFileName(`Google Sheet`);
      setGoogleConfig(config);
    }
  }, [handleGoogleSheet, googleConfig]);

  const handleClearCache = useCallback(async () => {
    await clearAllData();
    setRows([]);
    setFileName("");
    setGoogleConfig(null);
    setLatestInsights(null);
  }, []);

  const handleDisconnectGoogle = useCallback(async () => {
    setGoogleConfig(null);
    await clearAllData();
    setRows([]);
    setFileName("");
  }, []);

  const handleInsightsGenerated = useCallback(async (insights: string) => {
    setLatestInsights(insights);
    // Update the latest history record with insights
    const record: AnalysisRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileName,
      timestamp: Date.now(),
      rowCount: rows.length,
      columnCount: rows.length > 0 ? Object.keys(rows[0]).length : 0,
      hasInsights: true,
      insights,
    };
    await saveAnalysisRecord(record);
  }, [fileName, rows]);

  const analysis = useMemo(() => analyzeColumns(rows), [rows]);
  const agg = useMemo(() => dynamicAggregate(rows, analysis), [rows, analysis]);

  const hasData = rows.length > 0;
  const activeKey = getActiveApiKey(prefs);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Bug className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">BugLens</h1>
          </div>
          <div className="flex items-center gap-2">
            {hasData && (
              <>
                <ExportBar bugs={rows} fileName={fileName} analysis={analysis} agg={agg} visibleKPIs={visibleKPIs} aiInsights={latestInsights} />
                <button
                  onClick={() => setShowSidebar(true)}
                  className="flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  title="Analysis History"
                >
                  <History className="h-3.5 w-3.5" />
                  History
                </button>
                <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                  <UploadIcon className="h-3.5 w-3.5" />
                  New
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => { if (ev.target?.result) handleFile(ev.target.result as ArrayBuffer, file.name); };
                        reader.readAsArrayBuffer(file);
                      }
                    }}
                  />
                </label>
                <button onClick={handleClearCache}
                  className="flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button onClick={() => setShowSettings(true)}
              className="flex h-9 w-9 items-center justify-center rounded-md border bg-card text-foreground transition-colors hover:bg-muted"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {!hasData ? (
          <div className="mx-auto max-w-xl pt-20">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 animate-pulse-glow">
                <Bug className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Universal Data Analytics</h2>
              <p className="mt-2 text-muted-foreground">Upload any Excel/CSV or connect Google Sheets — charts auto-adapt to your data.</p>
              {prefs.aiEnabled && activeKey && (
                <p className="mt-1 text-xs text-primary">✨ AI-powered insights active</p>
              )}
            </div>
            <div className="space-y-4">
              <FileUpload onFileLoaded={handleFile} isLoading={isLoading} />
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <GoogleSheetsConnect
                googleApiKey={prefs.googleSheetsApiKey}
                onSheetLoaded={handleGoogleSheet}
                onMultipleSheets={handleGoogleSheetsMulti}
                activeConfig={null}
                onDisconnect={() => {}}
              />
            </div>
            {/* Show history button even without data */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowSidebar(true)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <History className="h-3.5 w-3.5" />
                View Analysis History
              </button>
            </div>
          </div>
        ) : (
          <div id="dashboard-content" className="space-y-6">
            {googleConfig && (
              <GoogleSheetsConnect
                googleApiKey={prefs.googleSheetsApiKey}
                onSheetLoaded={handleGoogleSheet}
                onMultipleSheets={handleGoogleSheetsMulti}
                activeConfig={googleConfig}
                onDisconnect={handleDisconnectGoogle}
              />
            )}

            <DynamicKPICards analysis={analysis} agg={agg} fileName={fileName} onVisibleKPIsChange={setVisibleKPIs} />
            <DynamicCharts rows={rows} analysis={analysis} agg={agg} />

            {prefs.aiEnabled && activeKey && (
              <AIInsightsPanel
                apiKey={activeKey}
                provider={prefs.aiProvider || "groq"}
                model={getActiveModel(prefs)}
                agg={agg}
                bugs={rows}
                onInsightsGenerated={handleInsightsGenerated}
              />
            )}

            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Data ({rows.length} rows)</h3>
              <DynamicTable rows={rows} analysis={analysis} onSelectRow={setSelectedRow} />
            </div>
          </div>
        )}
      </main>

      <DynamicDetailDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />
      {pendingSheets && (
        <SheetSelector sheets={pendingSheets} onSelect={handleSheetsSelected} onCancel={() => setPendingSheets(null)} />
      )}
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} preferences={prefs} onSave={handleSavePrefs} />
      <InsightsSidebar open={showSidebar} onClose={() => setShowSidebar(false)} />
    </div>
  );
}
