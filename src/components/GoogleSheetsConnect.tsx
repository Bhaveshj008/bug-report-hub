import { useState, useEffect, useRef, useCallback } from "react";
import {
  Link2, RefreshCw, Unplug, Loader2, Clock, ExternalLink, AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  extractSheetId, fetchGoogleSheet, fetchAllGoogleSheets,
  fetchPublicSpreadsheetAsWorkbook,
} from "@/utils/googleSheets";
import type { SheetInfo } from "@/utils/excelParser";
import type { GoogleSheetsConfig } from "@/types/bug";

interface Props {
  googleApiKey?: string;
  onSheetLoaded: (sheet: SheetInfo, config: GoogleSheetsConfig) => void;
  onMultipleSheets: (sheets: SheetInfo[], config: GoogleSheetsConfig) => void;
  activeConfig?: GoogleSheetsConfig | null;
  onDisconnect: () => void;
}

export function GoogleSheetsConnect({
  googleApiKey, onSheetLoaded, onMultipleSheets, activeConfig, onDisconnect,
}: Props) {
  const [url, setUrl] = useState(activeConfig?.url || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoPoll, setAutoPoll] = useState((activeConfig?.pollInterval || 0) > 0);
  const [pollInterval, setPollInterval] = useState(activeConfig?.pollInterval || 30);
  const [lastFetched, setLastFetched] = useState<number | null>(activeConfig?.lastFetched || null);
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSheet = useCallback(
    async (silent = false) => {
      const target = url || activeConfig?.url || "";
      const parsed = extractSheetId(target);
      if (!parsed) {
        if (!silent) setError("Invalid Google Sheets URL. Make sure it contains /spreadsheets/d/");
        return;
      }

      if (!silent) setLoading(true);
      setError("");

      try {
        const config: GoogleSheetsConfig = {
          url: target,
          sheetId: parsed.sheetId,
          gid: parsed.gid,
          pollInterval: autoPoll ? pollInterval : 0,
          lastFetched: Date.now(),
        };

        const alreadySelectedSheet = activeConfig?.sheetName;

        if (googleApiKey) {
          const allSheets = await fetchAllGoogleSheets(parsed.sheetId, googleApiKey);
          setAvailableSheets(allSheets);

          if (alreadySelectedSheet) {
            const match = allSheets.find(s => s.name === alreadySelectedSheet);
            if (match) {
              config.sheetName = match.name;
              setLastFetched(Date.now());
              onSheetLoaded(match, config);
              if (!silent) setLoading(false);
              return;
            }
            // Sheet was deleted or renamed
            if (!silent) {
              setError(`Sheet "${alreadySelectedSheet}" no longer exists in this workbook.`);
              setLoading(false);
            }
            return;
          }

          if (allSheets.length > 1) {
            setLastFetched(Date.now());
            onMultipleSheets(allSheets, config);
            if (!silent) setLoading(false);
            return;
          }
          if (allSheets.length === 1) {
            config.sheetName = allSheets[0].name;
            setLastFetched(Date.now());
            onSheetLoaded(allSheets[0], config);
            if (!silent) setLoading(false);
            return;
          }
        }

        // Without API key — download workbook
        try {
          const sheets = await fetchPublicSpreadsheetAsWorkbook(parsed.sheetId);
          setAvailableSheets(sheets);

          if (alreadySelectedSheet) {
            const match = sheets.find(s => s.name === alreadySelectedSheet);
            if (match) {
              config.sheetName = match.name;
              setLastFetched(Date.now());
              onSheetLoaded(match, config);
              if (!silent) setLoading(false);
              return;
            }
            if (!silent) {
              setError(`Sheet "${alreadySelectedSheet}" no longer exists in this workbook.`);
              setLoading(false);
            }
            return;
          }

          if (sheets.length > 1) {
            setLastFetched(Date.now());
            onMultipleSheets(sheets, config);
            if (!silent) setLoading(false);
            return;
          }
          if (sheets.length === 1) {
            config.sheetName = sheets[0].name;
            setLastFetched(Date.now());
            onSheetLoaded(sheets[0], config);
            if (!silent) setLoading(false);
            return;
          }
        } catch {
          // Fallback to CSV
        }

        // Final fallback: CSV export
        const sheet = await fetchGoogleSheet(parsed.sheetId, parsed.gid, googleApiKey);
        config.sheetName = sheet.name;
        setLastFetched(Date.now());
        onSheetLoaded(sheet, config);
      } catch (e: any) {
        if (!silent) setError(e.message || "Failed to fetch sheet. Check the URL and sharing settings.");
      }
      if (!silent) setLoading(false);
    },
    [url, activeConfig, googleApiKey, autoPoll, pollInterval, onSheetLoaded, onMultipleSheets]
  );

  useEffect(() => {
    const loadAvailableSheets = async () => {
      if (!activeConfig?.sheetId) return;
      try {
        if (googleApiKey) {
          const allSheets = await fetchAllGoogleSheets(activeConfig.sheetId, googleApiKey);
          setAvailableSheets(allSheets);
          return;
        }
        try {
          const sheets = await fetchPublicSpreadsheetAsWorkbook(activeConfig.sheetId);
          setAvailableSheets(sheets);
        } catch {
          setAvailableSheets([]);
        }
      } catch {
        setAvailableSheets([]);
      }
    };
    loadAvailableSheets();
  }, [activeConfig?.sheetId, googleApiKey]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (autoPoll && activeConfig && pollInterval > 0) {
      pollRef.current = setInterval(() => fetchSheet(true), pollInterval * 1000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [autoPoll, pollInterval, activeConfig, fetchSheet]);

  const handleConnect = () => {
    if (!url.trim()) { setError("Please paste a Google Sheets URL"); return; }
    fetchSheet();
  };

  const handleSwitchSheet = useCallback(async (sheetName: string) => {
    const sheet = availableSheets.find(s => s.name === sheetName);
    if (!sheet || !activeConfig) return;
    setLoading(true);
    try {
      const config: GoogleSheetsConfig = {
        ...activeConfig,
        sheetName: sheet.name,
        lastFetched: Date.now(),
      };
      setLastFetched(Date.now());
      onSheetLoaded(sheet, config);
    } catch (e: any) {
      setError(e.message || "Failed to switch sheet");
    }
    setLoading(false);
  }, [availableSheets, activeConfig, onSheetLoaded]);

  if (activeConfig) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Link2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">Google Sheets Connected</span>
            {activeConfig.sheetName && availableSheets.length > 1 ? (
              <select
                value={activeConfig.sheetName}
                onChange={(e) => handleSwitchSheet(e.target.value)}
                disabled={loading}
                className="h-6 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
              >
                {availableSheets.map(sheet => (
                  <option key={sheet.name} value={sheet.name}>{sheet.name}</option>
                ))}
              </select>
            ) : (
              activeConfig.sheetName && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {activeConfig.sheetName}
                </span>
              )
            )}
            <span className="h-2 w-2 rounded-full bg-chart-low animate-pulse shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => fetchSheet()}
              disabled={loading}
              className="flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </button>
            <button
              onClick={onDisconnect}
              className="flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10"
              title="Disconnect Google Sheet"
            >
              <Unplug className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {lastFetched && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last: {new Date(lastFetched).toLocaleTimeString()}
            </span>
          )}
          <a
            href={activeConfig.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> Open sheet
          </a>
        </div>

        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <Switch checked={autoPoll} onCheckedChange={setAutoPoll} />
            <Label className="text-xs text-foreground">Auto-refresh</Label>
          </div>
          {autoPoll && (
            <select
              value={pollInterval}
              onChange={(e) => setPollInterval(Number(e.target.value))}
              className="h-7 rounded border bg-background px-2 text-xs text-foreground"
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1 min</option>
              <option value={120}>2 min</option>
              <option value={300}>5 min</option>
            </select>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Connect Google Sheet</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a Google Sheets URL. Sheet must be shared as &quot;Anyone with the link&quot;.
        Multi-sheet workbooks will show a sheet selector.
      </p>
      <Input
        value={url}
        onChange={(e) => { setUrl(e.target.value); setError(""); }}
        onKeyDown={(e) => e.key === "Enter" && !loading && handleConnect()}
        placeholder="https://docs.google.com/spreadsheets/d/..."
        className="text-xs font-mono"
      />
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
      <button
        onClick={handleConnect}
        disabled={loading}
        className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        {loading ? "Connecting…" : "Connect"}
      </button>
    </div>
  );
}