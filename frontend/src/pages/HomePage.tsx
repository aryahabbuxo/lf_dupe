import { ScanForm } from "@/components/ScanForm";
import { ProgressBar } from "@/components/ProgressBar";
import { ResultsPanel } from "@/components/ResultsPanel";
import { AlgorithmPanel } from "@/components/AlgorithmPanel";
import { useScanContext } from "@/context/ScanContext";

export default function HomePage() {
  const { scanStatus } = useScanContext();
  const showResults = scanStatus === "completed";

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">DupeScan</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Multi-stage duplicate file detection · O(n log n) pipeline
        </p>
      </div>

      <ScanForm />

      {(scanStatus === "running" || scanStatus === "error") && (
        <ProgressBar />
      )}

      {showResults && (
        <section>
          <h2 className="text-base font-semibold mb-4">Results</h2>
          <ResultsPanel compact />
        </section>
      )}

      <div className="pt-4 border-t">
        <AlgorithmPanel />
      </div>
    </div>
  );
}
