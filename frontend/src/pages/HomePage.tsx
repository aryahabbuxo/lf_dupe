import { useEffect } from "react";
import { ScanSearch } from "lucide-react";
import { ScanForm } from "@/components/ScanForm";
import { ProgressBar } from "@/components/ProgressBar";
import { ResultsPanel } from "@/components/ResultsPanel";
import { AlgorithmPanel } from "@/components/AlgorithmPanel";
import { ComplexityGraph } from "@/components/ComplexityGraph";
import { useScanContext } from "@/context/ScanContext";
import { useResults } from "@/hooks/useResults";
import { formatBytes } from "@/lib/utils";

export default function HomePage() {
  const { scanStatus } = useScanContext();
  const { results, load } = useResults();

  useEffect(() => {
    load();
  }, [load]);

  const showProgress = scanStatus === "running" || scanStatus === "error";
  const showResults = !!results || scanStatus === "completed";

  return (
    <div className="relative">
      {/* Hero ---------------------------------------------------------------- */}
      <div className="relative overflow-hidden py-14 text-center px-4">
        <div className="absolute inset-0 bg-dot-grid" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />

        <div className="relative max-w-3xl mx-auto space-y-4 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping-slow" />
            3-stage pipeline · O(n log n + k·P + m·F)
          </div>

          <div className="flex items-center justify-center gap-3">
            <ScanSearch className="h-7 w-7 text-primary shrink-0" />
            <h1 className="hero-title text-5xl">DupeScan</h1>
          </div>

          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Detect duplicate files using size grouping, partial xxHash, and full
            SHA-256 — only reading what matters.
          </p>

          {results && (
            <div className="flex items-center justify-center gap-6 pt-2 flex-wrap">
              <StatPill value={results.total_files.toLocaleString()} label="files scanned" />
              <div className="w-px h-8 bg-border" />
              <StatPill
                value={results.duplicate_groups.length.toLocaleString()}
                label="duplicate groups"
              />
              <div className="w-px h-8 bg-border" />
              <StatPill
                value={formatBytes(results.total_wasted_bytes)}
                label="space wasted"
                accent
              />
            </div>
          )}
        </div>
      </div>

      {/* Two-column: scan form + complexity graph ---------------------------- */}
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <ScanForm />
            {showProgress && <ProgressBar />}
          </div>
          <ComplexityGraph />
        </div>

        {/* Results — full width below the two columns ----------------------- */}
        {showResults && (
          <section className="pt-2">
            <ResultsPanel />
          </section>
        )}

        {/* Algorithm panel -------------------------------------------------- */}
        <div className="pt-4 border-t border-border/40 pb-20">
          <AlgorithmPanel />
        </div>
      </div>
    </div>
  );
}

function StatPill({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={`text-xl font-bold tabular-nums ${
          accent ? "text-destructive" : "gradient-text-blue"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
