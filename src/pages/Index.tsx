import { useState, useCallback, useEffect, useMemo } from "react";
import { Bug, Trash2, Upload as UploadIcon, Settings } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { GoogleSheetsConnect } from "@/components/GoogleSheetsConnect";
import { KPICards } from "@/components/KPICards";
import { SeverityPieChart } from "@/components/charts/SeverityPieChart";
import { HBarChart } from "@/components/charts/HBarChart";
import { VBarChart } from "@/components/charts/VBarChart";
import { SeverityComponentHeatmap } from "@/components/charts/SeverityComponentHeatmap";
import { SeverityPlatformMatrix } from "@/components/charts/SeverityPlatformMatrix";
import { RiskRadarChart } from "@/components/charts/RiskRadarChart";
import { ReproSeverityChart } from "@/components/charts/ReproSeverityChart";
import { BugTable } from "@/components/BugTable";
import { BugDetailDrawer } from "@/components/BugDetailDrawer";
import { ManualMappingModal } from "@/components/ManualMappingModal";
import { SettingsModal } from "@/components/SettingsModal";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { ExportBar } from "@/components/ExportBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { parseWorkbook, selectBestSheet, type SheetInfo } from "@/utils/excelParser";
import { matchColumns } from "@/utils/columnMatcher";
import { normalizeRows } from "@/utils/normalizer";
import { aggregate } from "@/utils/aggregator";
import { aiMapColumns } from "@/utils/aiMapper";
import { getActiveApiKey, getActiveModel } from "@/utils/aiProviders";
import { detectDataFormat, getChartLabels } from "@/utils/dataDetector";
import {
  saveBugData, loadBugData, saveTemplate, loadTemplate,
  savePreferences, loadPreferences, createFingerprint, clearAllData,
} from "@/utils/store";
import type { BugRow, ColumnMapping, UserPreferences, DataFormat, GoogleSheetsConfig } from "@/types/bug";

const DEFAULT_PREFS: UserPreferences = { theme: "dark", aiEnabled: false };

export default function Dashboard() {
  const [bugs, setBugs] = useState<BugRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBug, setSelectedBug] = useState<BugRow | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [showMapping, setShowMapping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingSheet, setPendingSheet] = useState<SheetInfo | null>(null);
  const [pendingMapping, setPendingMapping] = useState<ColumnMapping | null>(null);
  const [dataFormat, setDataFormat] = useState<DataFormat>("bug_report");
  const [googleConfig, setGoogleConfig] = useState<GoogleSheetsConfig | null>(null);

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
        setBugs(cached.rows);
        setFileName(cached.fileName);
        if (cached.dataFormat) setDataFormat(cached.dataFormat);
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

  const processSheet = useCallback(async (sheet: SheetInfo, mapping: ColumnMapping, fName: string, gConfig?: GoogleSheetsConfig) => {
    const format = detectDataFormat(sheet.headers, sheet.sampleRows);
    setDataFormat(format);
    const rows = normalizeRows(sheet.sampleRows, mapping);
    setBugs(rows);
    setFileName(fName);
    const cfg = gConfig || googleConfig;
    if (cfg) setGoogleConfig(cfg);
    await saveBugData(rows, fName, format, cfg || undefined);
    const fpId = createFingerprint(sheet.headers, sheet.name);
    await saveTemplate({ id: fpId, headers: sheet.headers, sheetName: sheet.name, mapping, createdAt: Date.now() });
  }, [googleConfig]);

  const processSheetWithMatching = useCallback(async (sheet: SheetInfo, fName: string, gConfig?: GoogleSheetsConfig) => {
    const fpId = createFingerprint(sheet.headers, sheet.name);
    const saved = await loadTemplate(fpId);
    if (saved) { await processSheet(sheet, saved.mapping, fName, gConfig); return true; }

    const result = matchColumns(sheet.headers);
    if (result.confidence >= 0.35) { await processSheet(sheet, result.mapping, fName, gConfig); return true; }

    const activeKey = getActiveApiKey(prefs);
    if (prefs.aiEnabled && activeKey) {
      const aiMapping = await aiMapColumns(activeKey, prefs.aiProvider || "groq", getActiveModel(prefs), sheet.name, sheet.headers, sheet.sampleRows.slice(0, 10));
      if (aiMapping) { await processSheet(sheet, aiMapping, fName, gConfig); return true; }
    }

    return false;
  }, [processSheet, prefs]);

  const handleFile = useCallback(async (data: ArrayBuffer, fName: string) => {
    setIsLoading(true);
    try {
      const sheets = parseWorkbook(data);
      if (sheets.length === 0) { setIsLoading(false); return; }
      const best = selectBestSheet(sheets);

      const matched = await processSheetWithMatching(best, fName);
      if (!matched) {
        const result = matchColumns(best.headers);
        setPendingSheet(best);
        setPendingMapping(result.mapping);
        setShowMapping(true);
      }
    } catch (e) { console.error("Parse error:", e); }
    setIsLoading(false);
  }, [processSheetWithMatching]);

  const handleGoogleSheet = useCallback(async (sheet: SheetInfo, config: GoogleSheetsConfig) => {
    setIsLoading(true);
    try {
      const fName = `Google Sheet: ${sheet.name}`;
      const matched = await processSheetWithMatching(sheet, fName, config);
      if (!matched) {
        const result = matchColumns(sheet.headers);
        setPendingSheet(sheet);
        setPendingMapping(result.mapping);
        setShowMapping(true);
      }
    } catch (e) { console.error("Google Sheet error:", e); }
    setIsLoading(false);
  }, [processSheetWithMatching]);

  const handleManualMapping = useCallback(async (mapping: ColumnMapping) => {
    setShowMapping(false);
    if (pendingSheet) {
      setIsLoading(true);
      await processSheet(pendingSheet, mapping, fileName || "uploaded.xlsx");
      setPendingSheet(null);
      setPendingMapping(null);
      setIsLoading(false);
    }
  }, [pendingSheet, fileName, processSheet]);

  const handleClearCache = useCallback(async () => {
    await clearAllData();
    setBugs([]);
    setFileName("");
    setGoogleConfig(null);
    setDataFormat("bug_report");
  }, []);

  const handleDisconnectGoogle = useCallback(async () => {
    setGoogleConfig(null);
    await clearAllData();
    setBugs([]);
    setFileName("");
    setDataFormat("bug_report");
  }, []);

  const agg = useMemo(() => aggregate(bugs), [bugs]);
  const labels = useMemo(() => getChartLabels(dataFormat), [dataFormat]);
  const hasBugs = bugs.length > 0;
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
            {hasBugs && (
              <>
                <ExportBar bugs={bugs} fileName={fileName} />
                <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                  <UploadIcon className="h-3.5 w-3.5" />
                  New
                  <input type="file" accept=".xlsx,.xls" className="hidden"
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
        {!hasBugs ? (
          <div className="mx-auto max-w-xl pt-20">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 animate-pulse-glow">
                <Bug className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Bug Report Analytics</h2>
              <p className="mt-2 text-muted-foreground">Upload Excel or connect Google Sheets to generate analytics.</p>
              {prefs.aiEnabled && activeKey && (
                <p className="mt-1 text-xs text-primary">✨ AI-powered column detection active</p>
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
                activeConfig={null}
                onDisconnect={() => {}}
              />
            </div>
          </div>
        ) : (
          <div id="dashboard-content" className="space-y-6">
            {googleConfig && (
              <GoogleSheetsConnect
                googleApiKey={prefs.googleSheetsApiKey}
                onSheetLoaded={handleGoogleSheet}
                activeConfig={googleConfig}
                onDisconnect={handleDisconnectGoogle}
              />
            )}

            <KPICards agg={agg} fileName={fileName} dataFormat={dataFormat} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <SeverityPieChart data={agg.severityCounts} title={labels.severity} />
              <HBarChart data={agg.categoryCounts} title={labels.category} color="hsl(var(--chart-3))" />
              <VBarChart data={agg.componentCounts} title={labels.component} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SeverityComponentHeatmap bugs={bugs} />
              <RiskRadarChart bugs={bugs} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SeverityPlatformMatrix bugs={bugs} />
              <ReproSeverityChart bugs={bugs} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <HBarChart data={agg.platformCounts} title={labels.platform} color="hsl(var(--chart-4))" />
              <HBarChart data={agg.reproducibilityCounts} title={labels.reproducibility} color="hsl(var(--chart-5))" />
            </div>

            {prefs.aiEnabled && activeKey && (
              <AIInsightsPanel
                apiKey={activeKey}
                provider={prefs.aiProvider || "groq"}
                model={getActiveModel(prefs)}
                agg={agg}
                bugs={bugs}
              />
            )}

            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">{labels.listTitle}</h3>
              <BugTable rows={bugs} onSelectBug={setSelectedBug} />
            </div>
          </div>
        )}
      </main>

      <BugDetailDrawer bug={selectedBug} onClose={() => setSelectedBug(null)} />
      {showMapping && pendingSheet && pendingMapping && (
        <ManualMappingModal headers={pendingSheet.headers} currentMapping={pendingMapping} onConfirm={handleManualMapping} onCancel={() => setShowMapping(false)} />
      )}
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} preferences={prefs} onSave={handleSavePrefs} />
    </div>
  );
}
