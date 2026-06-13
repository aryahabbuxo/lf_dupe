/**
 * ResultsPanel — summary header + list of DuplicateGroup cards.
 *
 * The complexity summary box is the key educational artifact —
 * it shows real measured times alongside the Big-O notation so
 * viewers can connect theory to practice.
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DuplicateGroup } from "@/components/DuplicateGroup";
import { useResults } from "@/hooks/useResults";
import { formatBytes, formatTime } from "@/lib/utils";

interface Props {
  compact?: boolean;
}

export function ResultsPanel({ compact = false }: Props) {
  const { results, load, clear, loading } = useResults();

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading results…</p>;
  }

  if (!results) {
    return (
      <p className="text-sm text-muted-foreground">
        No scan results yet. Run a scan above.
      </p>
    );
  }

  const { stage_times, total_elapsed, duplicate_groups, total_files, total_wasted_bytes } = results;
  const shown = compact ? duplicate_groups.slice(0, 5) : duplicate_groups;

  return (
    <div className="space-y-4">
      {/* Complexity Summary Box */}
      <Card>
        <CardContent className="p-4 font-mono text-sm">
          <p className="font-semibold mb-2 not-italic font-sans">Algorithm Complexity</p>
          <div className="border-t pt-2 space-y-1">
            <SummaryRow label="Size Grouping" complexity="O(n log n)" time={stage_times.size_grouping} />
            <SummaryRow label="Partial Hash  " complexity="O(k·P)    " time={stage_times.partial_hash} />
            <SummaryRow label="Full Hash     " complexity="O(m·F)    " time={stage_times.full_hash} />
          </div>
          <div className="border-t mt-2 pt-2">
            <SummaryRow label="Overall       " complexity="O(n log n)" time={total_elapsed} bold />
          </div>
          <p className="text-xs text-muted-foreground mt-2 not-italic font-sans">
            {total_files.toLocaleString()} files · {formatBytes(total_wasted_bytes)} wasted
          </p>
        </CardContent>
      </Card>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {duplicate_groups.length} duplicate group{duplicate_groups.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clear}>
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
          {compact && duplicate_groups.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/results">
                View Full Results
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Group cards */}
      <div className="space-y-3">
        {shown.map((group) => (
          <DuplicateGroup key={group.hash} group={group} />
        ))}
        {compact && duplicate_groups.length > 5 && (
          <p className="text-sm text-muted-foreground text-center">
            +{duplicate_groups.length - 5} more groups —{" "}
            <Link to="/results" className="text-primary underline underline-offset-4">
              view all
            </Link>
          </p>
        )}
      </div>
    </div>
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
    <div className={`flex justify-between tabular-nums ${bold ? "font-bold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{complexity}</span>
      <span className="text-primary">{formatTime(time)}</span>
    </div>
  );
}
