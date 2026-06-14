import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatTime } from "@/lib/utils";

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
          const start = performance.now();
          const tick = (now: number) => {
            const pct = Math.min(((now - start) / 1400) * 100, 100);
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

  const displayPct = active ? Math.min(animPct, 90) : completed ? 100 : animPct;

  return (
    <Card
      ref={cardRef}
      className={cn(
        "transition-all duration-300 dark:card-glow",
        active && "dark:card-glow-active ring-1 ring-primary/40"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {completed && !active && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="h-3 w-3" />
              </span>
            )}
            {active && (
              <span className="h-2 w-2 rounded-full bg-primary animate-ping-slow shrink-0" />
            )}
            <CardTitle
              className={cn(
                "text-sm",
                active && "text-foreground",
                !active && !completed && "text-muted-foreground"
              )}
            >
              {title}
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-xs shrink-0",
              active && "border-primary/50 text-primary bg-primary/5"
            )}
          >
            {complexity}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Gradient shimmer bar when active, solid blue otherwise */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              active ? "progress-shimmer" : "bg-primary"
            )}
            style={{ width: `${displayPct}%` }}
          />
        </div>

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
