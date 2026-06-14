import { useState } from "react";
import { FolderOpen, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScan } from "@/hooks/useScan";
import { useScanContext } from "@/context/ScanContext";

export function ScanForm() {
  const [path, setPath] = useState("");
  const [usePartialHash, setUsePartialHash] = useState(true);
  const [chunkSize, setChunkSize] = useState(65536);

  const { scanStatus } = useScanContext();
  const { start, cancel } = useScan();
  const isRunning = scanStatus === "running";

  const handleStart = () => {
    if (!path.trim()) return;
    start({ path: path.trim(), use_partial_hash: usePartialHash, chunk_size: chunkSize });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isRunning) handleStart();
  };

  return (
    <div className="rounded-xl dark:card-glow dark:card-glow-active">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4 text-primary" />
            Scan Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="scan-path" className="text-sm">
              Directory path
            </Label>
            <Input
              id="scan-path"
              placeholder="/home/user/documents  or  C:\Users\name"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRunning}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="partial-hash-toggle" className="text-sm cursor-pointer">
                Partial hash (Stage 2)
              </Label>
              <p className="text-xs text-muted-foreground">
                Read first 64 KB before full SHA-256 — speeds up large collections
              </p>
            </div>
            <Switch
              id="partial-hash-toggle"
              checked={usePartialHash}
              onCheckedChange={setUsePartialHash}
              disabled={isRunning}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="chunk-size" className="text-sm">
                Chunk size
              </Label>
              <span className="text-xs font-mono text-primary">
                {(chunkSize / 1024).toFixed(0)} KB
              </span>
            </div>
            <input
              id="chunk-size"
              type="range"
              min={4096}
              max={524288}
              step={4096}
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              disabled={isRunning}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>4 KB</span>
              <span>512 KB</span>
            </div>
          </div>

          {isRunning ? (
            <Button variant="destructive" onClick={cancel} className="w-full">
              <Square className="h-4 w-4" />
              Cancel Scan
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              disabled={!path.trim()}
              className="w-full progress-shimmer text-white border-0"
            >
              <Play className="h-4 w-4" />
              Start Scan
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
