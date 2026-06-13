/**
 * StageVisualizer — one pipeline stage card with animated progress bar.
 *
 * The "fake" animated bar auto-plays when the card scrolls into view via
 * IntersectionObserver. On the homepage it uses real SSE times; on the
 * algorithm page it shows the educational animation only.
 */

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatTime } from "@/lib/utils";

interface Props {
  title: string;
  complexity: string;
  description: string;
  realTime?: number | null;
  active?: boolean;
  completed?: boolean;
}

export function StageVisualizer({
  title,
  complexity,
  description,
  realTime,
  active = false,
  completed = false,
}: Props) {
  const [animPct, setAnimPct] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          // Animate to 100% over 1.4 seconds via RAF loop
          const start = performance.now();
          const duration = 1400;
          const tick = (now: number) => {
            const pct = Math.min(((now - start) / duration) * 100, 100);
            setAnimPct(pct);
            if (pct < 100) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Real scan progress overrides the animation once available
  const displayPct = active ? Math.min(animPct, 90) : completed ? 100 : animPct;

  return (
    <Card
      ref={cardRef}
      className={`transition-all ${active ? "ring-2 ring-primary" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant="outline" className="font-mono text-xs shrink-0">
            {complexity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={displayPct} className="h-1.5" />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          {realTime != null && (
            <span className="text-xs font-mono text-primary shrink-0 ml-4">
              {formatTime(realTime)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
