/**
 * DuplicateGroup — expandable card for a single set of confirmed duplicates.
 *
 * Shows summary always; expands to full path list via Collapsible.
 * Wasted space is (count - 1) × size — the "first" copy is considered original.
 */

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
import { formatBytes, truncateHash } from "@/lib/utils";

interface Props {
  group: DuplicateGroupType;
}

export function DuplicateGroup({ group }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardContent className="p-4">
          <CollapsibleTrigger className="w-full text-left">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {open ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground truncate">
                    {truncateHash(group.hash)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary" className="gap-1">
                      <Copy className="h-3 w-3" />
                      {group.count} copies
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <HardDrive className="h-3 w-3" />
                      {formatBytes(group.size)} each
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-destructive">
                  {formatBytes(group.wasted_bytes)}
                </p>
                <p className="text-xs text-muted-foreground">wasted</p>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4">
            <div className="space-y-1 border-t pt-4">
              {group.files.map((file) => (
                <p
                  key={file}
                  className="font-mono text-xs text-foreground/80 break-all leading-5"
                >
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
