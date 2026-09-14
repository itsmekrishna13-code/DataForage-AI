import { useCallback, useRef, useState } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function UploadZone({
  filename,
  sizeBytes,
  rows,
  cols,
  onFile,
  onSample,
  onClear,
}: {
  filename?: string;
  sizeBytes?: number;
  rows?: number;
  cols?: number;
  onFile: (file: File) => void;
  onSample: () => void;
  onClear: () => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files?.[0];
      if (f) {
        if (!f.name.toLowerCase().endsWith(".csv")) {
          toast.error("Unsupported file format. Please upload a CSV (.csv) file.");
          return;
        }
        onFile(f);
      }
    },
    [onFile]
  );

  if (filename) {
    return (
      <div className="rounded-[10px] border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[color:var(--accent-soft)] text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-foreground">{filename}</div>
            <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {sizeBytes != null && <span>{(sizeBytes / 1024).toFixed(1)} KB</span>}
              {rows != null && (
                <span className="rounded-full bg-[color:var(--accent-soft)] px-2 py-0.5 font-mono-num text-primary">
                  {rows.toLocaleString()} rows
                </span>
              )}
              {cols != null && (
                <span className="rounded-full bg-[color:var(--accent-soft)] px-2 py-0.5 font-mono-num text-primary">
                  {cols} cols
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
            <X className="h-4 w-4" /> Replace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={cn(
        "rounded-[10px] border-2 border-dashed bg-card p-10 text-center transition-colors",
        dragActive
          ? "border-primary bg-[color:var(--accent-soft)]"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[color:var(--accent-soft)] text-primary">
        <Upload className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">Drop a CSV to begin</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Drag & drop a file here, or click to browse. Max 200MB.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={() => inputRef.current?.click()}>Choose CSV</Button>
        <Button variant="outline" onClick={onSample}>
          Load Sample Dataset
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            if (!f.name.toLowerCase().endsWith(".csv")) {
              toast.error("Unsupported file format. Please upload a CSV (.csv) file.");
              // Clear input so it can be re-selected if needed
              if (inputRef.current) inputRef.current.value = "";
              return;
            }
            onFile(f);
          }
        }}
      />
    </div>
  );
}
