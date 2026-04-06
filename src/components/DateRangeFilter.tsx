import { useMemo, useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { RawRow, DataAnalysis } from "@/types/bug";

interface Props {
  rows: RawRow[];
  analysis: DataAnalysis;
  onFilteredRows: (rows: RawRow[]) => void;
}

export function DateRangeFilter({ rows, analysis, onFilteredRows }: Props) {
  const dates = useMemo(() => analysis.columns.filter(c => c.type === "date"), [analysis]);
  const dateCol = dates.sort((a, b) => b.fillRate - a.fillRate)[0]?.name;

  const [range, setRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  // Apply filter
  useEffect(() => {
    if (!range.from && !range.to) {
      onFilteredRows(rows);
      return;
    }
    
    const filtered = rows.filter(r => {
      if (!dateCol) return true;
      const val = r[dateCol];
      if (!val) return false;
      const d = new Date(val);
      if (isNaN(d.getTime())) return true;
      
      if (range.from && d < range.from) return false;
      // Set "to" to end of day
      if (range.to) {
        const end = new Date(range.to);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
    
    onFilteredRows(filtered);
  }, [rows, dateCol, range, onFilteredRows]);

  if (!dateCol) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed flex items-center gap-2 text-xs">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {range.from ? (
            range.to ? (
              <>
                {format(range.from, "LLL dd, y")} - {format(range.to, "LLL dd, y")}
              </>
            ) : (
              format(range.from, "LLL dd, y")
            )
          ) : (
            <span className="text-muted-foreground tracking-tight">Filter Date Range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          mode="range"
          selected={range}
          onSelect={(r: any) => setRange({ from: r?.from, to: r?.to })}
          initialFocus
          styles={{
            day: { fontSize: "0.8rem", width: 28, height: 28 },
            caption_label: { fontSize: "0.875rem" }
          }}
        />
        {(range.from || range.to) && (
          <div className="p-3 border-t">
            <Button variant="ghost" size="sm" className="w-full h-8 text-xs font-semibold" onClick={() => setRange({from: undefined, to: undefined})}>
              Clear Filter
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
