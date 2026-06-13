/**
 * useScan — manages the scan lifecycle.
 *
 * Creates an EventSource for SSE progress updates, handles auto-reconnect
 * with 3-second backoff, and fetches final results when the scan completes.
 */

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { startScan, cancelScan, getResults, type StartScanBody } from "@/lib/api";
import { useScanContext, type Progress, type ScanResults } from "@/context/ScanContext";

const RECONNECT_DELAY_MS = 3000;

export function useScan() {
  const { setScanStatus, setProgress, setResults, setError } = useScanContext();
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeSSE = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const openSSE = useCallback(() => {
    closeSSE();

    const es = new EventSource("/scan/progress");
    esRef.current = es;

    es.onmessage = async (event) => {
      let payload: Progress;
      try {
        payload = JSON.parse(event.data) as Progress;
      } catch {
        return;
      }

      setProgress(payload);
      setScanStatus(payload.status);

      if (payload.status === "completed") {
        closeSSE();
        try {
          const data = await getResults();
          setResults(data as ScanResults);
          toast.success("Scan completed");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to fetch results";
          setError(msg);
          toast.error(msg);
        }
      } else if (payload.status === "error") {
        closeSSE();
        const msg = payload.error ?? "Scan failed";
        setError(msg);
        toast.error(msg, { duration: 4000 });
      } else if (payload.status === "cancelled") {
        closeSSE();
        setScanStatus("cancelled");
      }
    };

    es.onerror = () => {
      // Don't close immediately — auto-reconnect with backoff.
      closeSSE();
      reconnectTimer.current = setTimeout(openSSE, RECONNECT_DELAY_MS);
    };
  }, [closeSSE, setScanStatus, setProgress, setResults, setError]);

  const start = useCallback(
    async (body: StartScanBody) => {
      setError(null);
      setProgress(null);
      setResults(null);
      setScanStatus("running");
      try {
        await startScan(body);
        openSSE();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start scan";
        setError(msg);
        setScanStatus("error");
        toast.error(msg, { duration: 4000 });
      }
    },
    [openSSE, setError, setProgress, setResults, setScanStatus]
  );

  const cancel = useCallback(async () => {
    try {
      await cancelScan();
      closeSSE();
      setScanStatus("cancelled");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to cancel";
      toast.error(msg, { duration: 4000 });
    }
  }, [closeSSE, setScanStatus]);

  return { start, cancel };
}
