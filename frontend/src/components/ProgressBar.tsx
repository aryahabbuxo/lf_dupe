import { cn, formatTime } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useScanContext } from "@/context/ScanContext";

const STAGE_LABELS: Record<string, string> = {
  idle: "Idle",
  size_grouping: "Stage 1 — Size Grouping",
  partial_hash: "Stage 2 — Partial Hash (64 KB)",
  full_hash: "Stage 3 — Full SHA-256",
  done: "Complete",
  error: "Error",
};

export function ProgressBar() {
  const { scanStatus, progress } = useScanContext();

  if (scanStatus === "idle" || scanStatus === "cancelled") return null;

  const pct = progress?.percent ?? 0;
  const stage = progress?.stage ?? "idle";
  const elapsed = progress?.total_elapsed ?? 0;
  const label = STAGE_LABELS[stage] ?? stage;
  const isError = scanStatus === "error";

  // Build a human-readable "X of Y files" line appropriate for each stage.
  const fileCountLine = (() => {
    if (!progress) return null;
    const { files_scanned, total_files, stage1_total, stage2_total, stage3_total } = progress;
    if (stage === "size_grouping") {
      return `${files_scanned.toLocaleString()} files discovered`;
    }
    if (stage === "partial_hash" && stage2_total != null) {
      return `${files_scanned.toLocaleString()} of ${stage2_total.toLocaleString()} candidates (from ${stage1_total.toLocaleString()} total)`;
    }
    if (stage === "full_hash" && stage3_total != null) {
      return `${files_scanned.toLocaleString()} of ${stage3_total.toLocaleString()} candidates`;
    }
    return `${files_scanned.toLocaleString()} / ${total_files.toLocaleString()} files`;
  })();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span
          className={cn(
            "font-medium",
            isError ? "text-destructive" : "text-foreground"
          )}
        >
          {isError ? "Scan failed" : label}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {formatTime(elapsed)} · {pct.toFixed(1)}%
        </span>
      </div>

      <Progress
        value={pct}
        className={cn(isError && "bg-destructive/20 [&>div]:bg-destructive")}
      />

      {fileCountLine && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {fileCountLine}
        </p>
      )}
    </div>
  );
}
