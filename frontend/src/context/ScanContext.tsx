import React, { createContext, useContext, useState } from "react";

export type ScanStatus = "idle" | "running" | "completed" | "error" | "cancelled";

export interface StageTiming {
  size_grouping: number | null;
  partial_hash: number | null;
  full_hash: number | null;
}

export interface Progress {
  stage: string;
  stage_times: StageTiming;
  total_elapsed: number;
  files_scanned: number;
  total_files: number;
  stage1_total: number;
  stage2_total: number | null;
  stage3_total: number | null;
  percent: number;
  status: ScanStatus;
  error: string | null;
}

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface DuplicateGroup {
  hash: string;
  size: number;
  count: number;
  files: string[];
  wasted_bytes: number;
}

export interface ScanResults {
  scanned_at: string;
  path: string;
  total_files: number;
  stage_times: StageTiming;
  total_elapsed: number;
  duplicate_groups: DuplicateGroup[];
  skipped_files: SkippedFile[];
  total_wasted_bytes: number;
}

interface ScanContextValue {
  scanStatus: ScanStatus;
  setScanStatus: (s: ScanStatus) => void;
  progress: Progress | null;
  setProgress: (p: Progress | null) => void;
  results: ScanResults | null;
  setResults: (r: ScanResults | null) => void;
  error: string | null;
  setError: (e: string | null) => void;
}

const ScanContext = createContext<ScanContextValue>({
  scanStatus: "idle",
  setScanStatus: () => {},
  progress: null,
  setProgress: () => {},
  results: null,
  setResults: () => {},
  error: null,
  setError: () => {},
});

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [results, setResults] = useState<ScanResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <ScanContext.Provider
      value={{
        scanStatus,
        setScanStatus,
        progress,
        setProgress,
        results,
        setResults,
        error,
        setError,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScanContext(): ScanContextValue {
  return useContext(ScanContext);
}
