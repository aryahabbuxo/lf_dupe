import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getResults, clearResults } from "@/lib/api";
import { useScanContext, type ScanResults } from "@/context/ScanContext";

export function useResults() {
  const { results, setResults } = useScanContext();
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getResults();
      // Backend returns {message: "..."} when no results exist
      if (data && typeof data === "object" && "duplicate_groups" in (data as object)) {
        setResults(data as ScanResults);
      } else {
        setResults(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load results";
      toast.error(msg, { duration: 4000 });
    } finally {
      setLoading(false);
    }
  }, [setResults]);

  const clear = useCallback(async () => {
    try {
      await clearResults();
      setResults(null);
      toast.success("Results cleared");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to clear results";
      toast.error(msg, { duration: 4000 });
    }
  }, [setResults]);

  return { results, load, clear, loading };
}
