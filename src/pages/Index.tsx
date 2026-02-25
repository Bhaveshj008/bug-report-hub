import { useState, useCallback, useEffect, useMemo } from "react";
import { Bug, Trash2, Upload as UploadIcon } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { KPICards } from "@/components/KPICards";
import { SeverityPieChart } from "@/components/charts/SeverityPieChart";
import { HBarChart } from "@/components/charts/HBarChart";
import { VBarChart } from "@/components/charts/VBarChart";
import { BugTable } from "@/components/BugTable";
import { BugDetailDrawer } from "@/components/BugDetailDrawer";
import { ManualMappingModal } from "@/components/ManualMappingModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { parseWorkbook, selectBestSheet, type SheetInfo } from "@/utils/excelParser";
import { matchColumns } from "@/utils/columnMatcher";
import { normalizeRows } from "@/utils/normalizer";
import { aggregate } from "@/utils/aggregator";
import {
  saveBugData,
  loadBugData,
  saveTemplate,
  loadTemplate,
  savePreferences,
  loadPreferences,
  createFingerprint,
  clearAllData,
} from "@/utils/store";
import type { BugRow, ColumnMapping, UserPreferences } from "@/types/bug";

export default function Dashboard() {
  const [bugs, setBugs] = useState<BugRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBug, setSelectedBug] = useState<BugRow | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // manual mapping state
  const [showMapping, setShowMapping] = useState(false);
  const [pendingSheet, setPendingSheet] = useState<SheetInfo | null>(null);
  const [pendingMapping, setPendingMapping] = useState<ColumnMapping | null>(null);

  // load cached data on mount
  useEffect(() => {
    (async () => {
      const prefs = await loadPreferences();
      if (prefs?.theme) {
        setTheme(prefs.theme);
        document.documentElement.classList.toggle("dark", prefs.theme === "dark");
      } else {
        document.documentElement.classList.add("dark");
      }
      const cached = await loadBugData();
      if (cached) {
        setBugs(cached.rows);
        setFileName(cached.fileName);
      }
    })();
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    await savePreferences({ theme: next, aiEnabled: false });
  }, [theme]);

  const processSheet = useCallback(
    async (sheet: SheetInfo, mapping: ColumnMapping, fName: string) => {
      const rows = normalizeRows(sheet.sampleRows, mapping);
      setBugs(rows);
      setFileName(fName);
      await saveBugData(rows, fName);

      // save template
      const fpId = createFingerprint(sheet.headers, sheet.name);
      await saveTemplate({
        id: fpId,
        headers: sheet.headers,
        sheetName: sheet.name,
        mapping,
        createdAt: Date.now(),
      });
    },
    []
  );

  const handleFile = useCallback(
    async (data: ArrayBuffer, fName: string) => {
      setIsLoading(true);
      try {
        const sheets = parseWorkbook(data);
        if (sheets.length === 0) { setIsLoading(false); return; }
        const best = selectBestSheet(sheets);

        // check for saved template
        const fpId = createFingerprint(best.headers, best.name);
        const saved = await loadTemplate(fpId);
        if (saved) {
          await processSheet(best, saved.mapping, fName);
          setIsLoading(false);
          return;
        }

        // deterministic matching
        const result = matchColumns(best.headers);
        if (result.confidence >= 0.35) {
          await processSheet(best, result.mapping, fName);
        } else {
          // show manual mapping
          setPendingSheet(best);
          setPendingMapping(result.mapping);
          setShowMapping(true);
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
      setIsLoading(false);
    },
    [processSheet]
  );

  const handleManualMapping = useCallback(
    async (mapping: ColumnMapping) => {
      setShowMapping(false);
      if (pendingSheet) {
        setIsLoading(true);
        await processSheet(pendingSheet, mapping, fileName || "uploaded.xlsx");
        setPendingSheet(null);
        setPendingMapping(null);
        setIsLoading(false);
      }
    },
    [pendingSheet, fileName, processSheet]
  );

  const handleClearCache = useCallback(async () => {
    await clearAllData();
    setBugs([]);
    setFileName("");
  }, []);

  const agg = useMemo(() => aggregate(bugs), [bugs]);

  const hasBugs = bugs.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                  <UploadIcon className="h-3.5 w-3.5" />
                  New File
                  <input
                    type="file"
                    accept=".xlsx,.xls"
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
                    }}
                  />
                </label>
                <button
                  onClick={handleClearCache}
                  className="flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </>
            )}
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
              <p className="mt-2 text-muted-foreground">
                Upload your Excel bug report to generate a client-ready analytics dashboard.
              </p>
            </div>
            <FileUpload onFileLoaded={handleFile} isLoading={isLoading} />
          </div>
        ) : (
          <>
            <KPICards agg={agg} fileName={fileName} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <SeverityPieChart data={agg.severityCounts} />
              <HBarChart data={agg.categoryCounts} title="Issues by Category" color="hsl(var(--chart-3))" />
              <VBarChart data={agg.componentCounts} title="Issues by Component" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <HBarChart data={agg.platformCounts} title="Platform Distribution" color="hsl(var(--chart-4))" />
              <HBarChart data={agg.reproducibilityCounts} title="Reproducibility" color="hsl(var(--chart-5))" />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Defect List</h3>
              <BugTable rows={bugs} onSelectBug={setSelectedBug} />
            </div>
          </>
        )}
      </main>

      <BugDetailDrawer bug={selectedBug} onClose={() => setSelectedBug(null)} />

      {showMapping && pendingSheet && pendingMapping && (
        <ManualMappingModal
          headers={pendingSheet.headers}
          currentMapping={pendingMapping}
          onConfirm={handleManualMapping}
          onCancel={() => setShowMapping(false)}
        />
      )}
    </div>
  );
}
