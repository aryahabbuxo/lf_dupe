import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { type DuplicateGroup as DuplicateGroupType } from "@/context/ScanContext";
import { cn, formatBytes, truncateHash } from "@/lib/utils";

interface Props {
  group: DuplicateGroupType;
}

function wasteAccent(bytes: number): string {
  if (bytes >= 50 * 1024 * 1024)  return "border-l-red-500";
  if (bytes >= 5 * 1024 * 1024)   return "border-l-orange-400";
  if (bytes >= 512 * 1024)        return "border-l-yellow-400";
  return "border-l-border";
}

export function DuplicateGroup({ group }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Card
      className={cn(
        "overflow-hidden border-l-2 transition-all duration-200",
        wasteAccent(group.wasted_bytes)
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardContent className="p-3.5">
          <CollapsibleTrigger className="w-full text-left">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                {open ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-muted-foreground truncate">
                    {truncateHash(group.hash)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="secondary" className="gap-1 text-[10px] py-0 h-4">
                      <Copy className="h-2.5 w-2.5" />
                      {group.count} copies
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-[10px] py-0 h-4">
                      <HardDrive className="h-2.5 w-2.5" />
                      {formatBytes(group.size)} each
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-destructive">
                  {formatBytes(group.wasted_bytes)}
                </p>
                <p className="text-[10px] text-muted-foreground">wasted</p>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-3.5">
            <div className="space-y-0.5 border-t border-border/40 pt-3">
              {group.files.map((file, i) => (
                <p
                  key={file}
                  className={cn(
                    "font-mono text-[11px] break-all leading-5 px-2 py-0.5 rounded",
                    i === 0
                      ? "text-foreground/50 bg-muted/30"
                      : "text-foreground/80 hover:bg-muted/20"
                  )}
                >
                  {i === 0 && (
                    <span className="font-sans text-[9px] text-muted-foreground mr-1.5 uppercase">
                      keep
                    </span>
                  )}
                  {file}
                </p>
              ))}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
