import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import EngineEditor from "./engine/EngineEditor";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: '#111116',
                border: '1px solid #2a2a38',
                color: '#c8d0e0',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
              },
            }}
          />
          <EngineEditor />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
