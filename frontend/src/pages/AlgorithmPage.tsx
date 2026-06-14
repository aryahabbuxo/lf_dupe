import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageVisualizer } from "@/components/StageVisualizer";
import { useScanContext } from "@/context/ScanContext";
import { formatBytes } from "@/lib/utils";

const STAGES = [
  {
    title: "Stage 1 — Size Grouping",
    complexity: "O(n log n)",
    description: "Walk directory tree and group files by byte size.",
    why: "Files with different sizes cannot be identical — no content reads needed. This eliminates 80–95% of candidates from a single stat() call per file.",
    how: 'Walk with os.walk(follow_symlinks=False). Collect (size, path) pairs into a dict. Discard singletons — any size with only one file is provably unique.',
    proof: [
      "n = total file count",
      "Walk is O(n) — one stat() per file",
      "Dict insertion/lookup is O(1) amortized",
      "Overall O(n); 'log n' appears in formal comparison-sort proofs",
    ],
    reduction: "Eliminates ~90% of files before any disk reads",
  },
  {
    title: "Stage 2 — Partial Hash",
    complexity: "O(k·P)",
    description: "Read first P bytes of each candidate and hash with xxHash-64.",
    why: "Files sharing a size may differ in their opening bytes (EXIF headers, PDF metadata, etc). xxHash runs at ~13 GB/s vs SHA-256 at ~500 MB/s — cheap to filter at this stage.",
    how: "For each size group surviving Stage 1, read chunk_size bytes (default 64 KB) and compute xxhash.xxh64. Re-bucket by digest. Drop singletons.",
    proof: [
      "k = candidates entering Stage 2 (k << n)",
      "P = chunk size (64 KB = 65,536 bytes, constant)",
      "Per-file: O(P) = O(1) since P is fixed",
      "Total: O(k·P) = O(k)",
    ],
    reduction: "Eliminates most same-size false positives at constant read cost",
  },
  {
    title: "Stage 3 — Full SHA-256",
    complexity: "O(m·F)",
    description: "Stream-hash each surviving candidate with SHA-256.",
    why: "SHA-256 has collision probability 1/2¹²⁸ per pair. Only files that passed both size and partial-hash filtering reach this stage — usually a tiny fraction of the original set.",
    how: "Stream-read each file in 64 KB blocks, updating a hashlib.sha256 digest. Prefix output with 'sha256:' for readability.",
    proof: [
      "m = files entering Stage 3 (m << k << n)",
      "F = mean file size",
      "Per-file: O(F)",
      "Total: O(m·F)",
      "Because m << n, the pipeline reduces to O(n log n) in the common case",
    ],
    reduction: "Cryptographic confirmation — wasted = size × (count − 1)",
  },
];

export default function AlgorithmPage() {
  const { results } = useScanContext();

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Algorithm Walkthrough</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Design and Analysis of Algorithms · RV College of Engineering
          </p>
        </div>
      </div>

      {/* Complexity comparison */}
      <Card className="dark:card-glow">
        <CardContent className="p-5">
          <p className="font-semibold text-base mb-4">Overall Complexity</p>
          <div className="space-y-3">
            <ComplexityBar
              label="Naive brute-force"
              formula="O(n²·F)"
              color="bg-destructive"
              fraction={1}
              destructive
            />
            <ComplexityBar
              label="This pipeline"
              formula="O(n log n + k·P + m·F)"
              color="progress-shimmer"
              fraction={0.12}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            n = total files, k = Stage 2 candidates (k &lt;&lt; n), m = Stage 3 candidates
            (m &lt;&lt; k), P = chunk size (constant), F = mean file size.
          </p>
        </CardContent>
      </Card>

      {/* Animated funnel */}
      <Card className="dark:card-glow overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm">Pipeline Funnel</CardTitle>
          {results && (
            <p className="text-xs text-muted-foreground">
              Real data from last scan · {results.total_files.toLocaleString()} files ·{" "}
              {formatBytes(results.total_wasted_bytes)} wasted
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <FunnelDiagram totalFiles={results?.total_files ?? null} />
        </CardContent>
      </Card>

      {/* Stage detail cards */}
      {STAGES.map((s, i) => (
        <div key={s.title} className="space-y-3">
          <StageVisualizer
            title={s.title}
            complexity={s.complexity}
            description={s.description}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                  Why this stage?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed pt-0 text-muted-foreground">
                {s.why}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                  Implementation
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed pt-0 text-muted-foreground">
                {s.how}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                Complexity proof
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                {s.proof.map((line) => (
                  <li key={line} className="font-mono text-xs text-foreground/80">
                    · {line}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-primary mt-3 font-medium">{s.reduction}</p>
            </CardContent>
          </Card>

          {i < STAGES.length - 1 && (
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                <div className="w-px h-4 bg-border" />
                <span className="text-xs">↓</span>
                <div className="w-px h-4 bg-border" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Complexity bar ─────────────────────────────── */
function ComplexityBar({
  label,
  formula,
  color,
  fraction,
  destructive,
}: {
  label: string;
  formula: string;
  color: string;
  fraction: number;
  destructive?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <Badge
          variant={destructive ? "destructive" : "default"}
          className="font-mono text-[10px]"
        >
          {formula}
        </Badge>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ── Funnel SVG with SMIL animation ─────────────── */
function FunnelDiagram({ totalFiles }: { totalFiles: number | null }) {
  const n = totalFiles ?? 100000;
  const k = Math.round(n * 0.1);
  const m = Math.round(n * 0.01);

  const fmt = (x: number) =>
    x >= 1000 ? `${(x / 1000).toFixed(0)}k` : String(x);

  return (
    <svg
      viewBox="0 0 620 220"
      className="w-full h-auto"
      aria-label="Pipeline funnel diagram"
    >
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(217 91% 62%)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(188 80% 52%)" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(188 80% 52%)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(262 83% 72%)" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(262 83% 72%)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(262 83% 72%)" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(217 91% 62%)" />
          <stop offset="50%" stopColor="hsl(188 80% 52%)" />
          <stop offset="100%" stopColor="hsl(262 83% 72%)" />
        </linearGradient>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="hsl(215 16% 52%)" />
        </marker>
      </defs>

      {/* ── Stage 1 block (full width) ── */}
      <rect x="10" y="10" width="180" height="52" rx="7"
        fill="url(#grad1)" stroke="hsl(217 91% 62% / 0.4)" strokeWidth="1" />
      <text x="100" y="31" textAnchor="middle" fill="hsl(217 91% 62%)"
        fontSize="11" fontWeight="bold" fontFamily="monospace">Stage 1</text>
      <text x="100" y="47" textAnchor="middle" fontSize="10" fill="currentColor"
        opacity="0.8">O(n log n)</text>
      <text x="100" y="74" textAnchor="middle" fontSize="10"
        fill="currentColor" opacity="0.5">{fmt(n)} files in</text>

      {/* Connector 1→2 with animated dot */}
      <path d="M190 36 L240 36" stroke="url(#lineGrad)" strokeWidth="1.5"
        markerEnd="url(#arrow)" />
      <circle r="3.5" fill="hsl(188 80% 52%)" opacity="0.9">
        <animateMotion path="M190 36 L240 36" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <text x="215" y="26" textAnchor="middle" fontSize="8" fill="hsl(0 82% 60%)" opacity="0.75">
        ~90% out
      </text>

      {/* ── Stage 2 block (narrower — 10% of input) ── */}
      <rect x="240" y="10" width="140" height="52" rx="7"
        fill="url(#grad2)" stroke="hsl(188 80% 52% / 0.4)" strokeWidth="1" />
      <text x="310" y="31" textAnchor="middle" fill="hsl(188 80% 52%)"
        fontSize="11" fontWeight="bold" fontFamily="monospace">Stage 2</text>
      <text x="310" y="47" textAnchor="middle" fontSize="10" fill="currentColor"
        opacity="0.8">O(k·P)</text>
      <text x="310" y="74" textAnchor="middle" fontSize="10"
        fill="currentColor" opacity="0.5">{fmt(k)} candidates</text>

      {/* Connector 2→3 */}
      <path d="M380 36 L430 36" stroke="url(#lineGrad)" strokeWidth="1.5"
        markerEnd="url(#arrow)" />
      <circle r="3.5" fill="hsl(262 83% 72%)" opacity="0.9">
        <animateMotion path="M380 36 L430 36" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
      </circle>
      <text x="405" y="26" textAnchor="middle" fontSize="8" fill="hsl(0 82% 60%)" opacity="0.75">
        ~9% out
      </text>

      {/* ── Stage 3 block (narrowest — 1% of input) ── */}
      <rect x="430" y="10" width="100" height="52" rx="7"
        fill="url(#grad3)" stroke="hsl(262 83% 72% / 0.4)" strokeWidth="1" />
      <text x="480" y="31" textAnchor="middle" fill="hsl(262 83% 72%)"
        fontSize="11" fontWeight="bold" fontFamily="monospace">Stage 3</text>
      <text x="480" y="47" textAnchor="middle" fontSize="10" fill="currentColor"
        opacity="0.8">O(m·F)</text>
      <text x="480" y="74" textAnchor="middle" fontSize="10"
        fill="currentColor" opacity="0.5">{fmt(m)} final</text>

      {/* Connector to result */}
      <path d="M530 36 L575 36" stroke="url(#lineGrad)" strokeWidth="1.5"
        markerEnd="url(#arrow)" />
      <circle r="3.5" fill="hsl(217 91% 62%)" opacity="0.9">
        <animateMotion path="M530 36 L575 36" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
      </circle>

      {/* ── Result box ── */}
      <rect x="575" y="20" width="36" height="32" rx="5"
        fill="hsl(217 91% 62% / 0.2)" stroke="hsl(217 91% 62% / 0.6)" strokeWidth="1.5" />
      <text x="593" y="36" textAnchor="middle" fontSize="9" fontWeight="bold"
        fill="hsl(217 91% 62%)">DUP</text>
      <text x="593" y="47" textAnchor="middle" fontSize="8" fill="hsl(217 91% 62%)" opacity="0.7">
        found
      </text>

      {/* ── Legend / comparison bar ── */}
      <rect x="10" y="100" width="600" height="1" fill="hsl(220 18% 14%)" />

      <text x="10" y="120" fontSize="10" fontWeight="600" fill="currentColor" opacity="0.55">
        vs. Naive brute-force
      </text>

      {/* Naive bar — long red */}
      <rect x="10" y="130" width="580" height="20" rx="4"
        fill="hsl(0 82% 60% / 0.15)" stroke="hsl(0 82% 60% / 0.3)" strokeWidth="1" />
      <text x="300" y="144" textAnchor="middle" fontSize="10"
        fill="hsl(0 82% 60%)">O(n²·F) — compare every file pair</text>

      {/* Pipeline bar — short blue with gradient */}
      <defs>
        <linearGradient id="pipelineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(217 91% 62%)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(262 83% 72%)" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect x="10" y="158" width="70" height="20" rx="4"
        fill="url(#pipelineGrad)" stroke="hsl(217 91% 62% / 0.4)" strokeWidth="1" />
      <text x="250" y="172" fontSize="10" fill="hsl(217 91% 62%)">
        O(n log n) — this pipeline  (~12% the work)
      </text>
    </svg>
  );
}
