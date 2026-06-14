import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultsPanel } from "@/components/ResultsPanel";

export default function ResultsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Scan Results</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Last completed scan</p>
        </div>
      </div>

      <ResultsPanel />
    </div>
  );
}
