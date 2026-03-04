import { useState } from "react";
import { FileSpreadsheet, ChevronRight } from "lucide-react";
import type { SheetInfo } from "@/utils/excelParser";

interface SheetSelectorProps {
  sheets: SheetInfo[];
  onSelect: (sheet: SheetInfo) => void;
  onCancel: () => void;
}

export function SheetSelector({ sheets, onSelect, onCancel }: SheetSelectorProps) {
  const [selected, setSelected] = useState<number>(0);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-md rounded-lg border bg-card shadow-2xl animate-fade-in">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Select Sheet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This workbook contains {sheets.length} sheets. Choose which one to analyze.
          </p>
        </div>
        <div className="max-h-[50vh] overflow-y-auto px-3 py-3 space-y-1.5">
          {sheets.map((sheet, i) => (
            <button
              key={sheet.name}
              onClick={() => setSelected(i)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors ${
                selected === i
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-muted border border-transparent"
              }`}
            >
              <FileSpreadsheet className={`h-5 w-5 shrink-0 ${selected === i ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${selected === i ? "text-primary" : "text-foreground"}`}>
                  {sheet.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sheet.rowCount} rows · {sheet.headers.length} columns
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {sheet.headers.slice(0, 5).join(", ")}{sheet.headers.length > 5 ? "…" : ""}
                </p>
              </div>
              {selected === i && <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button onClick={onCancel} className="rounded-md border px-4 py-2 text-sm text-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={() => onSelect(sheets[selected])}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Analyze Sheet
          </button>
        </div>
      </div>
    </>
  );
}
