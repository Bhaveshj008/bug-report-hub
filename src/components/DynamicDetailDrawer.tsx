import { X, ExternalLink } from "lucide-react";
import type { RawRow } from "@/types/bug";

interface Props {
  row: RawRow | null;
  onClose: () => void;
}

const URL_REGEX = /^https?:\/\//i;
const INTERNAL_KEYS = ["__sheet"];

export function DynamicDetailDrawer({ row, onClose }: Props) {
  if (!row) return null;

  const entries = Object.entries(row)
    .filter(([k, v]) => !INTERNAL_KEYS.includes(k) && v && v.trim());

  const shortFields = entries.filter(([, v]) => v.length <= 80);
  const longFields = entries.filter(([, v]) => v.length > 80);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l bg-card shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-foreground truncate">
            {entries[0]?.[1] || "Row Details"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No data to display for this row.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {shortFields.map(([key, value]) => (
              <div key={key}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{key}</p>
                {URL_REGEX.test(value) ? (
                  <a href={value} target="_blank" rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    Open Link <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="mt-0.5 text-sm text-foreground">{value}</p>
                )}
              </div>
            ))}
          </div>

          {longFields.map(([key, value]) => (
            <div key={key}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{key}</p>
              {URL_REGEX.test(value) ? (
                <a href={value} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Open Link <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <div className="rounded-md bg-muted p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {value}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}