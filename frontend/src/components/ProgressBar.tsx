/**
 * ProgressBar — animated stage-aware progress indicator.
 *
 * Shows the current pipeline stage as a human label,
 * elapsed time, and a smooth animated bar.
 */

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useScanContext } from "@/context/ScanContext";
import { formatTime } from "@/lib/utils";

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

      {progress && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {progress.files_scanned.toLocaleString()} /{" "}
          {progress.total_files.toLocaleString()} files
        </p>
      )}
    </div>
  );
}
