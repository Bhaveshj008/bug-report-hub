import { useState } from "react";
import type { CanonicalField, ColumnMapping } from "@/types/bug";

interface ManualMappingModalProps {
  headers: string[];
  currentMapping: ColumnMapping;
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

const FIELD_LABELS: Record<CanonicalField, string> = {
  app: "App",
  jiraId: "Jira ID",
  summary: "Summary",
  severity: "Severity",
  component: "Component",
  userRole: "User Role",
  testData: "Test Data",
  platform: "Platform",
  osVersion: "OS Version",
  category: "Category",
  reproducibility: "Reproducibility",
  steps: "Reproduction Steps",
  expected: "Expected Results",
  actual: "Actual Results",
  artifactsLink: "Artifacts Link",
  qaComments: "QA Comments",
  comments: "Comments",
};

export function ManualMappingModal({ headers, currentMapping, onConfirm, onCancel }: ManualMappingModalProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({ ...currentMapping });

  const fields = Object.keys(FIELD_LABELS) as CanonicalField[];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-x-4 top-[5%] z-50 mx-auto max-w-lg rounded-lg border bg-card shadow-2xl animate-fade-in">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Map Columns</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Couldn't auto-detect all columns. Please map them manually.
          </p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-3">
          {fields.map((field) => (
            <div key={field} className="flex items-center gap-3">
              <label className="w-36 text-sm font-medium text-foreground shrink-0">{FIELD_LABELS[field]}</label>
              <select
                value={mapping[field] || ""}
                onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || null })}
                className="flex-1 h-9 rounded-md border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">— Skip —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button onClick={onCancel} className="rounded-md border px-4 py-2 text-sm text-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(mapping)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Apply Mapping
          </button>
        </div>
      </div>
    </>
  );
}
