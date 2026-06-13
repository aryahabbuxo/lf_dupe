/**
 * AlgorithmPanel — condensed 3-stage visualization for the home page.
 *
 * Shows real SSE timing if a scan has just completed; otherwise shows
 * the educational animation triggered by scroll.
 */

import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageVisualizer } from "@/components/StageVisualizer";
import { useScanContext } from "@/context/ScanContext";

const STAGES = [
  {
    key: "size_grouping" as const,
    title: "Stage 1 — Size Grouping",
    complexity: "O(n log n)",
    description:
      "Group all n files by byte-size. Files with unique sizes are eliminated instantly — no disk reads required.",
  },
  {
    key: "partial_hash" as const,
    title: "Stage 2 — Partial Hash",
    complexity: "O(k·P)",
    description:
      "Read the first 64 KB of each remaining candidate and compute xxHash-64. Filters most same-size false positives before full reads.",
  },
  {
    key: "full_hash" as const,
    title: "Stage 3 — Full SHA-256",
    complexity: "O(m·F)",
    description:
      "Stream-hash the m survivors with SHA-256. Collision probability: 1/2¹²⁸. Confirms true duplicates.",
  },
];

export function AlgorithmPanel() {
  const { scanStatus, progress } = useScanContext();
  const times = progress?.stage_times;
  const currentStage = progress?.stage;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">How It Works</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/algorithm">
            <BookOpen className="h-4 w-4" />
            Full Explanation
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {STAGES.map((s) => (
          <StageVisualizer
            key={s.key}
            title={s.title}
            complexity={s.complexity}
            description={s.description}
            realTime={times?.[s.key]}
            active={scanStatus === "running" && currentStage === s.key}
            completed={scanStatus === "completed" || times?.[s.key] != null}
          />
        ))}
      </div>
    </div>
  );
}
