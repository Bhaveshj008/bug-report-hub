import { useState, useEffect } from "react";
import { Settings, X, Eye, EyeOff, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserPreferences } from "@/types/bug";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSave: (prefs: UserPreferences) => void;
}

export function SettingsModal({ open, onClose, preferences, onSave }: SettingsModalProps) {
  const [aiEnabled, setAiEnabled] = useState(preferences.aiEnabled);
  const [apiKey, setApiKey] = useState(preferences.groqApiKey || "");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setAiEnabled(preferences.aiEnabled);
    setApiKey(preferences.groqApiKey || "");
  }, [preferences, open]);

  if (!open) return null;

  const handleSave = () => {
    onSave({ ...preferences, aiEnabled, groqApiKey: apiKey || undefined });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-md rounded-lg border bg-card shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Settings</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* AI Toggle */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">AI Template Detection</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Uses Groq (Llama 3.3) for smart column mapping & insights
                </p>
              </div>
            </div>
            <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
          </div>

          {/* Groq API Key */}
          {aiEnabled && (
            <div className="space-y-2 animate-fade-in">
              <Label className="text-sm font-medium text-foreground">Groq API Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="gsk_..."
                  className="pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your free key at{" "}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  console.groq.com
                </a>
                . Stored only in your browser.
              </p>

              {apiKey && (
                <div className="rounded-md border border-chart-low/30 bg-chart-low/5 px-3 py-2">
                  <p className="text-xs text-foreground">
                    ✓ Key configured. AI features active:
                  </p>
                  <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                    <li>Smart column mapping when auto-detection fails</li>
                    <li>Bug data insights & trend analysis</li>
                    <li>Severity distribution analysis</li>
                    <li>Actionable recommendations</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm text-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Save Settings
          </button>
        </div>
      </div>
    </>
  );
}
