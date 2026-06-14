import { Check } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { useScanContext, type Progress } from "@/context/ScanContext";

const STAGES = [
  { key: "size_grouping", label: "Size Group", complexity: "O(n log n)", short: "S1" },
  { key: "partial_hash", label: "Partial Hash", complexity: "O(k·P)", short: "S2" },
  { key: "full_hash", label: "Full SHA-256", complexity: "O(m·F)", short: "S3" },
] as const;

function stageIndex(stage: string): number {
  return STAGES.findIndex((s) => s.key === stage);
}

export function ProgressBar() {
  const { scanStatus, progress } = useScanContext();
  if (scanStatus === "idle" || scanStatus === "cancelled") return null;

  const currentStageKey = progress?.stage ?? "size_grouping";
  const currentIdx = stageIndex(currentStageKey);
  const isDone = scanStatus === "completed";
  const isError = scanStatus === "error";
  const elapsed = progress?.total_elapsed ?? 0;
  const pct = progress?.percent ?? 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card dark:card-glow p-5 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between text-sm">
        <span
          className={cn(
            "font-semibold",
            isError ? "text-destructive" : isDone ? "text-emerald-400" : "text-foreground"
          )}
        >
          {isError ? "Scan failed" : isDone ? "Scan complete" : `Stage ${currentIdx + 1} of 3`}
        </span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {formatTime(elapsed)} · {pct.toFixed(1)}%
        </span>
      </div>

      {/* Pipeline nodes + connectors */}
      <div className="flex items-start">
        {STAGES.map((stage, idx) => {
          const isActive = !isDone && idx === currentIdx;
          const isComplete = isDone || idx < currentIdx;
          const isLast = idx === STAGES.length - 1;

          return (
            <div key={stage.key} className="flex items-start flex-1">
              {/* Node + label */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-500",
                    isComplete
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                      ? "bg-primary/15 border-primary text-primary dark:stage-node-active"
                      : "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : stage.short}
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {stage.label}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground/60">
                    {stage.complexity}
                  </p>
                </div>
              </div>

              {/* Connector */}
              {!isLast && (
                <div className="flex-1 mx-2 mt-[18px] relative h-0.5">
                  <div className="absolute inset-0 rounded-full bg-border" />
                  {(isComplete || isActive) && (
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                        isComplete ? "bg-primary w-full" : "progress-shimmer"
                      )}
                      style={!isComplete ? { width: `${pct}%` } : undefined}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* File count line */}
      {progress && (
        <FileCountLine progress={progress} currentIdx={currentIdx} isDone={isDone} />
      )}
    </div>
  );
}

function FileCountLine({
  progress,
  currentIdx,
  isDone,
}: {
  progress: Progress;
  currentIdx: number;
  isDone: boolean;
}) {
  const { files_scanned, total_files, stage2_total, stage3_total } = progress;

  if (isDone) {
    return (
      <p className="text-xs font-mono text-emerald-400">
        {total_files.toLocaleString()} files processed — done
      </p>
    );
  }
  if (currentIdx === 0) {
    return (
      <p className="text-xs font-mono text-muted-foreground">
        {files_scanned.toLocaleString()} files discovered...
      </p>
    );
  }
  if (currentIdx === 1 && stage2_total != null) {
    return (
      <p className="text-xs font-mono text-muted-foreground">
        {files_scanned.toLocaleString()} of {stage2_total.toLocaleString()} candidates
        <span className="text-muted-foreground/50 ml-1">
          (from {total_files.toLocaleString()} total)
        </span>
      </p>
    );
  }
  if (currentIdx === 2 && stage3_total != null) {
    return (
      <p className="text-xs font-mono text-muted-foreground">
        {files_scanned.toLocaleString()} of {stage3_total.toLocaleString()} final candidates
      </p>
    );
  }
  return null;
}
