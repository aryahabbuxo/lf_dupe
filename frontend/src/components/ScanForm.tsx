/**
 * ScanForm — path input and options panel.
 *
 * Kept intentionally simple: one required field (path), two optional
 * toggles, and start/cancel buttons that mirror scan status.
 */

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderOpen className="h-4 w-4" />
          Scan Directory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="scan-path">Directory path</Label>
          <Input
            id="scan-path"
            placeholder="/home/user/documents  or  C:\Users\demo"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="partial-hash-toggle" className="text-sm">
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
          <Label htmlFor="chunk-size" className="text-sm">
            Chunk size: {(chunkSize / 1024).toFixed(0)} KB
          </Label>
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
        </div>

        <div className="flex gap-2">
          {isRunning ? (
            <Button variant="destructive" onClick={cancel} className="flex-1">
              <Square className="h-4 w-4" />
              Cancel
            </Button>
          ) : (
            <Button onClick={handleStart} disabled={!path.trim()} className="flex-1">
              <Play className="h-4 w-4" />
              Start Scan
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
