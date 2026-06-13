import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Moon, Sun, ScanSearch } from "lucide-react";
import { Toaster } from "sonner";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ScanProvider } from "@/context/ScanContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import HomePage from "@/pages/HomePage";
import ResultsPage from "@/pages/ResultsPage";
import AlgorithmPage from "@/pages/AlgorithmPage";

function NavBar() {
  const { theme, toggle } = useTheme();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "text-sm font-medium transition-colors hover:text-foreground",
      isActive ? "text-foreground" : "text-muted-foreground"
    );

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-2xl mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2 font-semibold text-sm">
            <ScanSearch className="h-4 w-4" />
            DupeScan
          </NavLink>
          <nav className="flex items-center gap-4">
            <NavLink to="/" end className={linkClass}>Home</NavLink>
            <NavLink to="/results" className={linkClass}>Results</NavLink>
            <NavLink to="/algorithm" className={linkClass}>Algorithm</NavLink>
          </nav>
        </div>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ScanProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground">
            <NavBar />
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/algorithm" element={<AlgorithmPage />} />
              </Routes>
            </main>
          </div>
          <Toaster position="bottom-right" richColors />
        </BrowserRouter>
      </ScanProvider>
    </ThemeProvider>
  );
}
