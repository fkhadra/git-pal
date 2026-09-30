import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, Suspense } from "react";
import ReactDOM from "react-dom/client";

import "./style.css";

import { TooltipProvider } from "~/components/ui/tooltip";

import { App } from "./App";
import { applyTheme } from "./libs/useColorScheme";

// before the first render, avoids a flash of the wrong theme
applyTheme(globalThis.settings.theme);

const rootElement = document.getElementById("root") as HTMLElement;
const queryClient = new QueryClient();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
);
