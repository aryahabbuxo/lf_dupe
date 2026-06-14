import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/85 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-8">
          <NavLink to="/" className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-primary">
              <circle cx="7.5" cy="7.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M7.5 5.5V9.5M5.5 7.5H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="font-bold text-sm gradient-text">DupeScan</span>
          </NavLink>

          <nav className="flex items-center gap-1">
            {(
              [
                { to: "/", label: "Home", end: true },
                { to: "/results", label: "Results", end: false },
                { to: "/algorithm", label: "Algorithm", end: false },
              ] as const
            ).map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "relative px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                    isActive
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {label}
                    {isActive && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-primary" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
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
