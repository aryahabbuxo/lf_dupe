import { useScanContext } from "@/context/ScanContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_N = 200_000;
const W = 340;
const H = 200;
const PAD = { top: 16, right: 20, bottom: 38, left: 44 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

// Log-scale Y so both curves are visible despite O(n²) dominating linearly.
// We plot log₁₀(ops) normalized to [0,1] across the y range.
const LOG_MIN = 0;
const LOG_MAX = Math.log10(MAX_N * MAX_N); // ≈ 10.6

function logOps(n: number, naive: boolean): number {
  if (n <= 1) return 0;
  const ops = naive ? n * n : n * Math.log2(n);
  return Math.log10(Math.max(ops, 1));
}

function toScreenX(n: number): number {
  return (n / MAX_N) * CW;
}

function toScreenY(logVal: number): number {
  return CH - ((logVal - LOG_MIN) / (LOG_MAX - LOG_MIN)) * CH;
}

function buildPath(naive: boolean, steps = 120): string {
  return Array.from({ length: steps }, (_, i) => {
    const n = Math.max(1, (MAX_N / steps) * (i + 1));
    const x = toScreenX(n).toFixed(1);
    const y = toScreenY(logOps(n, naive)).toFixed(1);
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");
}

const NAIVE_PATH = buildPath(true);
const PIPELINE_PATH = buildPath(false);

// Y-axis tick marks at log₁₀ powers: 2, 4, 6, 8, 10
const Y_TICKS = [2, 4, 6, 8, 10].map((v) => ({
  log: v,
  label: `10^${v}`,
  y: toScreenY(v),
}));

// X-axis ticks
const X_TICKS = [50_000, 100_000, 150_000, 200_000].map((n) => ({
  n,
  label: `${n / 1000}k`,
  x: toScreenX(n),
}));

export function ComplexityGraph() {
  const { results } = useScanContext();
  const actualN = results?.total_files ?? null;

  const markerX = actualN ? toScreenX(actualN) : null;
  const markerYPipeline = actualN ? toScreenY(logOps(actualN, false)) : null;
  const markerYNaive = actualN ? toScreenY(logOps(actualN, true)) : null;

  // ratio at actual n
  const ratio =
    actualN
      ? Math.round((actualN * actualN) / (actualN * Math.log2(actualN)))
      : null;

  return (
    <Card className="dark:card-glow h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Time Complexity</CardTitle>
        <p className="text-xs text-muted-foreground">
          Log scale · operations vs. file count
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          aria-label="Time complexity comparison chart"
        >
          <g transform={`translate(${PAD.left},${PAD.top})`}>
            {/* Grid + Y ticks */}
            {Y_TICKS.map(({ log, label, y }) => (
              <g key={log}>
                <line
                  x1={0}
                  y1={y}
                  x2={CW}
                  y2={y}
                  stroke="hsl(220 18% 14%)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={-6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="8"
                  fill="currentColor"
                  opacity="0.4"
                  fontFamily="monospace"
                >
                  {label}
                </text>
              </g>
            ))}

            {/* X ticks */}
            {X_TICKS.map(({ n, label, x }) => (
              <g key={n}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={CH}
                  stroke="hsl(220 18% 14%)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={CH + 12}
                  textAnchor="middle"
                  fontSize="8"
                  fill="currentColor"
                  opacity="0.4"
                >
                  {label}
                </text>
              </g>
            ))}

            {/* Axes */}
            <line x1={0} y1={0} x2={0} y2={CH} stroke="hsl(220 18% 20%)" strokeWidth="1" />
            <line x1={0} y1={CH} x2={CW} y2={CH} stroke="hsl(220 18% 20%)" strokeWidth="1" />

            {/* Axis labels */}
            <text
              x={CW / 2}
              y={CH + 28}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              opacity="0.45"
            >
              n (files)
            </text>
            <text
              x={-CH / 2}
              y={-32}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              opacity="0.45"
              transform="rotate(-90)"
            >
              operations (log₁₀)
            </text>

            {/* Naive curve — red */}
            <path
              d={NAIVE_PATH}
              fill="none"
              stroke="hsl(0 82% 60%)"
              strokeWidth="2"
              opacity="0.75"
            />

            {/* Pipeline curve — blue */}
            <path
              d={PIPELINE_PATH}
              fill="none"
              stroke="hsl(217 91% 62%)"
              strokeWidth="2"
            />

            {/* Curve labels */}
            <text
              x={CW - 4}
              y={toScreenY(logOps(MAX_N, true)) - 5}
              textAnchor="end"
              fontSize="8"
              fill="hsl(0 82% 60%)"
              fontWeight="600"
            >
              O(n²·F)
            </text>
            <text
              x={CW - 4}
              y={toScreenY(logOps(MAX_N, false)) - 5}
              textAnchor="end"
              fontSize="8"
              fill="hsl(217 91% 62%)"
              fontWeight="600"
            >
              O(n log n)
            </text>

            {/* Actual scan marker */}
            {markerX !== null && markerYPipeline !== null && markerYNaive !== null && (
              <>
                <line
                  x1={markerX}
                  y1={0}
                  x2={markerX}
                  y2={CH}
                  stroke="hsl(188 80% 52%)"
                  strokeDasharray="4 2"
                  strokeWidth="1"
                  opacity="0.7"
                />
                {/* Dot on pipeline curve */}
                <circle cx={markerX} cy={markerYPipeline} r="4" fill="hsl(217 91% 62%)" />
                {/* Dot on naive curve */}
                <circle cx={markerX} cy={markerYNaive} r="4" fill="hsl(0 82% 60%)" />
                {/* Label */}
                <text
                  x={markerX + 4}
                  y={CH - 4}
                  fontSize="8"
                  fill="hsl(188 80% 52%)"
                  opacity="0.9"
                >
                  your scan
                </text>
              </>
            )}
          </g>
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-1 px-1">
          <LegendDot color="hsl(0 82% 60%)" label="Brute force" />
          <LegendDot color="hsl(217 91% 62%)" label="This pipeline" />
          {ratio && (
            <span className="ml-auto text-[10px] font-mono text-primary">
              ~{ratio.toLocaleString()}× faster
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-0.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
