import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DuplicateGroup } from "@/components/DuplicateGroup";
import { useResults } from "@/hooks/useResults";
import { formatBytes, formatTime } from "@/lib/utils";

const PAGE_SIZE = 50;

interface Props {
  compact?: boolean;
}

export function ResultsPanel({ compact = false }: Props) {
  const { results, load, clear, loading } = useResults();
  const [page, setPage] = useState(1);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Loading results…
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-14">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-sm text-muted-foreground">No scan results yet. Run a scan above.</p>
      </div>
    );
  }

  const { stage_times, total_elapsed, duplicate_groups, total_files, total_wasted_bytes } =
    results;
  const totalCopies = duplicate_groups.reduce((sum, g) => sum + g.count, 0);
  const shown = compact
    ? duplicate_groups.slice(0, 5)
    : duplicate_groups.slice(0, page * PAGE_SIZE);
  const hasMore = !compact && shown.length < duplicate_groups.length;

  return (
    <div className="space-y-5">
      {/* Big stats row — full page only */}
      {!compact && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            value={total_files.toLocaleString()}
            label="Files Scanned"
            sub="unique paths walked"
          />
          <StatCard
            value={duplicate_groups.length.toLocaleString()}
            label="Duplicate Groups"
            sub={`${totalCopies.toLocaleString()} total copies`}
          />
          <StatCard
            value={formatBytes(total_wasted_bytes)}
            label="Space Wasted"
            sub="reclaimable storage"
            accent
          />
        </div>
      )}

      {/* Complexity table */}
      <Card className="dark:card-glow">
        <CardContent className="p-4 font-mono text-sm">
          <p className="font-semibold mb-3 not-italic font-sans text-sm">Algorithm Complexity</p>
          <div className="border-t pt-2.5 space-y-1.5">
            <SummaryRow label="Size Grouping" complexity="O(n log n)" time={stage_times.size_grouping} />
            <SummaryRow label="Partial Hash" complexity="O(k·P)" time={stage_times.partial_hash} />
            <SummaryRow label="Full Hash" complexity="O(m·F)" time={stage_times.full_hash} />
          </div>
          <div className="border-t mt-2 pt-2">
            <SummaryRow label="Overall" complexity="O(n log n)" time={total_elapsed} bold />
          </div>
          <p className="text-xs text-muted-foreground mt-3 not-italic font-sans">
            {total_files.toLocaleString()} files · {formatBytes(total_wasted_bytes)} wasted
          </p>
        </CardContent>
      </Card>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {duplicate_groups.length.toLocaleString()} duplicate group
          {duplicate_groups.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clear}>
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
          {compact && duplicate_groups.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/results">
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Group cards */}
      <div className="space-y-2">
        {shown.map((group) => (
          <DuplicateGroup key={group.hash} group={group} />
        ))}
        {compact && duplicate_groups.length > 5 && (
          <p className="text-sm text-muted-foreground text-center pt-1">
            +{(duplicate_groups.length - 5).toLocaleString()} more groups —{" "}
            <Link to="/results" className="text-primary underline underline-offset-4">
              view all
            </Link>
          </p>
        )}
        {hasMore && (
          <button
            onClick={() => setPage((p) => p + 1)}
            className="w-full py-2.5 text-sm text-muted-foreground border border-border/50 rounded-lg hover:text-foreground hover:border-primary/30 transition-colors"
          >
            Load more · {(duplicate_groups.length - shown.length).toLocaleString()} remaining
          </button>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  value: string;
  label: string;
  sub: string;
  accent?: boolean;
}

function StatCard({ value, label, sub, accent }: StatCardProps) {
  return (
    <Card className="dark:card-glow">
      <CardContent className="p-4 text-center">
        <p
          className={`text-2xl font-bold tabular-nums mb-1 ${
            accent ? "text-destructive" : "gradient-text-blue"
          }`}
        >
          {value}
        </p>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

interface SummaryRowProps {
  label: string;
  complexity: string;
  time: number | null | undefined;
  bold?: boolean;
}

function SummaryRow({ label, complexity, time, bold }: SummaryRowProps) {
  return (
    <div
      className={`flex justify-between tabular-nums text-xs gap-2 ${
        bold ? "font-bold text-[13px]" : ""
      }`}
    >
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-foreground flex-1">{complexity}</span>
      <span className="text-primary shrink-0">{formatTime(time)}</span>
    </div>
  );
}
