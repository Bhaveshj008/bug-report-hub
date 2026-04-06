import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";

interface FileUploadProps {
  onFileLoaded: (data: ArrayBuffer, fileName: string) => void;
  isLoading: boolean;
}

const ACCEPTED_EXTENSIONS = /\.(xlsx?|csv)$/i;
const ACCEPTED_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
];

export function FileUpload({ onFileLoaded, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState("");

  const handleFile = useCallback(
    (file: File) => {
      setDragError("");
      if (!ACCEPTED_EXTENSIONS.test(file.name) && !ACCEPTED_MIME.includes(file.type)) {
        setDragError("Unsupported file type. Please upload .xlsx, .xls or .csv");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) onFileLoaded(e.target.result as ArrayBuffer, file.name);
      };
      reader.readAsArrayBuffer(file);
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClick = () => {
    if (isLoading) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); setDragError(""); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition-all duration-200 cursor-pointer
        ${isDragging ? "border-primary bg-accent scale-[1.01]" : "border-upload-border bg-upload-bg hover:border-primary hover:bg-accent"}
        ${isLoading ? "opacity-60 pointer-events-none" : ""}
        ${dragError ? "border-destructive/50" : ""}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
        {isLoading ? (
          <FileSpreadsheet className="h-8 w-8 text-primary animate-pulse" />
        ) : (
          <Upload className="h-8 w-8 text-primary" />
        )}
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">
          {isLoading ? "Parsing file…" : "Drop your file here"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          .xlsx, .xls or .csv &bull; Up to 10,000 rows
        </p>
        {dragError && (
          <p className="mt-2 text-xs text-destructive font-medium">{dragError}</p>
        )}
      </div>
    </div>
  );
}