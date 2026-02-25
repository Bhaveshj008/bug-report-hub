import { X, ExternalLink } from "lucide-react";
import type { BugRow } from "@/types/bug";

interface BugDetailDrawerProps {
  bug: BugRow | null;
  onClose: () => void;
}

export function BugDetailDrawer({ bug, onClose }: BugDetailDrawerProps) {
  if (!bug) return null;

  const fields: { label: string; value: string; mono?: boolean }[] = [
    { label: "Jira ID", value: bug.jiraId, mono: true },
    { label: "Summary", value: bug.summary },
    { label: "Severity", value: bug.severity },
    { label: "Component", value: bug.component },
    { label: "Category", value: bug.category },
    { label: "Platform", value: bug.platform },
    { label: "OS Version", value: bug.osVersion },
    { label: "User Role", value: bug.userRole },
    { label: "Reproducibility", value: bug.reproducibility },
    { label: "App", value: bug.app },
  ];

  const longFields = [
    { label: "Reproduction Steps", value: bug.steps },
    { label: "Expected Results", value: bug.expected },
    { label: "Actual Results", value: bug.actual },
    { label: "Test Data", value: bug.testData },
    { label: "QA Comments", value: bug.qaComments },
    { label: "Comments", value: bug.comments },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l bg-card shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-foreground truncate">{bug.jiraId} — {bug.summary}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{f.label}</p>
                <p className={`mt-0.5 text-sm text-foreground ${f.mono ? "font-mono" : ""}`}>{f.value}</p>
              </div>
            ))}
          </div>

          {bug.artifactsLink && bug.artifactsLink !== "Unknown" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Artifacts</p>
              <a
                href={bug.artifactsLink.startsWith("http") ? bug.artifactsLink : `https://${bug.artifactsLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View Artifacts <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {longFields.map(
            (f) =>
              f.value &&
              f.value !== "Unknown" && (
                <div key={f.label}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{f.label}</p>
                  <div className="rounded-md bg-muted p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {f.value}
                  </div>
                </div>
              )
          )}
        </div>
      </div>
    </>
  );
}
