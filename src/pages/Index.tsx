import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Bug, Trash2, Upload as UploadIcon, Settings, History, AlertTriangle, Camera, Scan, ThumbsUp } from "lucide-react";
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
import { ModuleHealthMap } from "@/components/ModuleHealthMap";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { parseWorkbook, type SheetInfo } from "@/utils/excelParser";
import { analyzeColumns, dynamicAggregate } from "@/utils/columnAnalyzer";
import { getActiveApiKey, getActiveModel } from "@/utils/aiProviders";
import { generateAISchema, generateFallbackSchema, detectDataTypeHeuristic } from "@/utils/aiSchema";
import {
  saveBugData, loadBugData,
  savePreferences, loadPreferences, clearAllData,
  saveAnalysisRecord, updateAnalysisRecord, type AnalysisRecord,
} from "@/utils/store";
import {
  detectModuleColumn, detectRiskColumn, calculateModuleRisks,
} from "@/utils/moduleRisk";
import type { RawRow, UserPreferences, GoogleSheetsConfig, AISchema } from "@/types/bug";

const DEFAULT_PREFS: UserPreferences = { theme: "dark", aiEnabled: false };

export default function Dashboard() {
  const [rows, setRows] = useState<RawRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<RawRow[]>([]);
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
  const [truncationWarning, setTruncationWarning] = useState("");

  const [aiSchema, setAiSchema] = useState<AISchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  // Track current analysis record ID to update (not duplicate) on insights generation
  const currentAnalysisId = useRef<string | null>(null);

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

  const loadSheets = useCallback(async (
    sheets: SheetInfo[],
    fName: string,
    gConfig?: GoogleSheetsConfig
  ) => {
    const allRows: RawRow[] = [];
    const sheetNames: string[] = [];
    let totalOriginalRows = 0;

    for (const sheet of sheets) {
      totalOriginalRows += sheet.rowCount;
      if (sheets.length > 1) {
        for (const row of sheet.sampleRows) {
          allRows.push({ ...row, __sheet: sheet.name });
        }
      } else {
        allRows.push(...sheet.sampleRows);
      }
      sheetNames.push(sheet.name);
    }

    // Warn if data was truncated
    if (totalOriginalRows > allRows.length) {
      setTruncationWarning(
        `File has ${totalOriginalRows.toLocaleString()} rows — showing first 10,000 only.`
      );
    } else {
      setTruncationWarning("");
    }

    setRows(allRows);
    setFilteredRows(allRows);
    setLatestInsights(null);
    setAiSchema(null);
    const displayName = sheets.length > 1 ? `${fName} (${sheetNames.join(", ")})` : fName;
    setFileName(displayName);

    const cfg = gConfig || googleConfig;
    if (cfg) setGoogleConfig(cfg);
    await saveBugData(allRows, displayName, undefined, cfg || undefined);

    // Save one analysis record per load
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    currentAnalysisId.current = id;

    const record: AnalysisRecord = {
      id,
      fileName: displayName,
      timestamp: Date.now(),
      rowCount: allRows.length,
      columnCount: allRows.length > 0
        ? Object.keys(allRows[0]).filter(k => k !== "__sheet").length
        : 0,
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
    } catch (e) {
      console.error("Parse error:", e);
    }
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
      setPendingFileName("Google Sheet");
      setGoogleConfig(config);
    }
  }, [handleGoogleSheet, googleConfig]);

  const handleClearCache = useCallback(async () => {
    const confirmed = window.confirm(
      "Clear all data? This will remove your current dataset and analysis. This cannot be undone."
    );
    if (!confirmed) return;
    await clearAllData();
    setRows([]);
    setFilteredRows([]);
    setFileName("");
    setGoogleConfig(null);
    setLatestInsights(null);
    setTruncationWarning("");
    setAiSchema(null);
    currentAnalysisId.current = null;
  }, []);

  const handleDisconnectGoogle = useCallback(async () => {
    const confirmed = window.confirm("Disconnect Google Sheet and clear data?");
    if (!confirmed) return;
    setGoogleConfig(null);
    await clearAllData();
    setRows([]);
    setFilteredRows([]);
    setFileName("");
    setLatestInsights(null);
    setTruncationWarning("");
    setAiSchema(null);
    currentAnalysisId.current = null;
  }, []);

  const handleInsightsGenerated = useCallback(async (insights: string) => {
    setLatestInsights(insights);
    // Update existing record instead of creating a new duplicate
    if (currentAnalysisId.current) {
      await updateAnalysisRecord(currentAnalysisId.current, {
        hasInsights: true,
        insights,
      });
    }
  }, []);

  const handleLoadRecord = useCallback((record: AnalysisRecord) => {
    if (record.insights) {
      setLatestInsights(record.insights);
    }
  }, []);

  const rawAnalysis = useMemo(() => analyzeColumns(rows), [rows]);

  const activeRows = filteredRows.length > 0 ? filteredRows : rows;
  const analysis = useMemo(() => analyzeColumns(activeRows), [activeRows]);
  const agg = useMemo(() => dynamicAggregate(activeRows, analysis), [activeRows, analysis]);

  const handleDateFilter = useCallback((filtered: RawRow[]) => {
    setFilteredRows(filtered);
  }, []);

  const moduleRisks = useMemo(() => {
    if (activeRows.length === 0 || !aiSchema) return [];
    const moduleCol = detectModuleColumn(analysis, aiSchema);
    const riskInfo = detectRiskColumn(analysis, aiSchema);
    if (!moduleCol || !riskInfo) return [];
    return calculateModuleRisks(activeRows, moduleCol, riskInfo.column, riskInfo.type);
  }, [activeRows, analysis, aiSchema]);

  useEffect(() => {
    if (!rows.length || !rawAnalysis.columns.length) return;

    const rawAgg = dynamicAggregate(rows, rawAnalysis);
    const activeKey = getActiveApiKey(prefs);
    if (!prefs.aiEnabled || !activeKey) {
      const dt = detectDataTypeHeuristic(rawAnalysis);
      setAiSchema(generateFallbackSchema(rawAnalysis, rawAgg, dt));
      return;
    }

    let cancelled = false;
    setSchemaLoading(true);

    generateAISchema(
      activeKey,
      prefs.aiProvider || "groq",
      getActiveModel(prefs),
      rawAnalysis,
      rows
    ).then(schema => {
      if (cancelled) return;
      if (schema) {
        setAiSchema(schema);
      } else {
        const dt = detectDataTypeHeuristic(rawAnalysis);
        setAiSchema(generateFallbackSchema(rawAnalysis, rawAgg, dt));
      }
      setSchemaLoading(false);
    }).catch(() => {
      if (cancelled) return;
      const dt = detectDataTypeHeuristic(rawAnalysis);
      setAiSchema(generateFallbackSchema(rawAnalysis, rawAgg, dt));
      setSchemaLoading(false);
    });

    return () => { cancelled = true; };
  }, [rows, rawAnalysis, prefs.aiEnabled, prefs.aiProvider, prefs.aiModel, prefs.apiKeys]);

  const hasData = rows.length > 0;
  const activeKey = getActiveApiKey(prefs);
  const isFiltered = filteredRows.length !== rows.length;

  // Stable dataset key for chat history (based on file name + row count)
  const datasetKey = useMemo(() => {
    if (!fileName) return "";
    return `${fileName}-${rows.length}`.replace(/[^a-zA-Z0-9\-_]/g, "_");
  }, [fileName, rows.length]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <ThumbsUp className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">QualityLens</h1>
            {schemaLoading && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary animate-pulse">
                AI analyzing…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasData && (
              <>
                <ExportBar
                  bugs={rows}
                  fileName={fileName}
                  analysis={analysis}
                  agg={agg}
                  visibleKPIs={visibleKPIs}
                  aiInsights={latestInsights}
                  aiSchema={aiSchema}
                />
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
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result) handleFile(ev.target.result as ArrayBuffer, file.name);
                        };
                        reader.readAsArrayBuffer(file);
                      }
                      // Reset so same file can be re-uploaded
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  onClick={handleClearCache}
                  className="flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                  title="Clear data"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button
              onClick={() => setShowSettings(true)}
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
        {/* Truncation warning banner */}
        {truncationWarning && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-sm text-foreground">{truncationWarning}</p>
          </div>
        )}

        {!hasData ? (
          <div className="mx-auto max-w-xl pt-20">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 animate-pulse-glow">
                <ThumbsUp className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Universal Data Analytics</h2>
              <p className="mt-2 text-muted-foreground">
                Upload any Excel/CSV or connect Google Sheets — charts auto-adapt to your data.
              </p>
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
                onDisconnect={() => { }}
              />
            </div>
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

            <div className="flex items-center gap-3">
              <DateRangeFilter
                rows={rows}
                analysis={rawAnalysis}
                onFilteredRows={handleDateFilter}
              />
              {isFiltered && (
                <span className="text-xs text-muted-foreground">
                  Showing <b className="text-foreground">{activeRows.length.toLocaleString()}</b> of {rows.length.toLocaleString()} rows
                </span>
              )}
            </div>

            <DynamicKPICards
              analysis={analysis}
              agg={agg}
              fileName={fileName}
              aiSchema={aiSchema}
              onVisibleKPIsChange={setVisibleKPIs}
            />

            <DynamicCharts rows={activeRows} analysis={analysis} agg={agg} aiSchema={aiSchema} />

            <ModuleHealthMap
              rows={activeRows}
              analysis={analysis}
              agg={agg}
              aiSchema={aiSchema}
            />

            {prefs.aiEnabled && activeKey && (
              <AIInsightsPanel
                apiKey={activeKey}
                provider={prefs.aiProvider || "groq"}
                model={getActiveModel(prefs)}
                agg={agg}
                bugs={activeRows}
                datasetKey={datasetKey}
                moduleRisks={moduleRisks}
                initialInsights={latestInsights}
                onInsightsGenerated={handleInsightsGenerated}
                analysis={analysis}
                aiSchema={aiSchema}
              />
            )}

            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Data
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {activeRows.length.toLocaleString()} rows
                </span>
                {isFiltered && (
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
                    filtered
                  </span>
                )}
                {truncationWarning && (
                  <span className="ml-2 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-normal text-warning">
                    truncated
                  </span>
                )}
              </h3>
              {/* key={fileName} forces DynamicTable to remount on new file, clearing filter/sort state */}
              <DynamicTable
                key={fileName}
                rows={activeRows}
                analysis={analysis}
                onSelectRow={setSelectedRow}
              />
            </div>
          </div>
        )}
      </main>

      <DynamicDetailDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />

      {pendingSheets && (
        <SheetSelector
          sheets={pendingSheets}
          onSelect={handleSheetsSelected}
          onCancel={() => setPendingSheets(null)}
        />
      )}

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        preferences={prefs}
        onSave={handleSavePrefs}
      />

      <InsightsSidebar
        open={showSidebar}
        onClose={() => setShowSidebar(false)}
        onLoadRecord={handleLoadRecord}
      />
    </div>
  );
}