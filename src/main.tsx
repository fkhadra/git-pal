import { StrictMode, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { TooltipProvider } from "~/components/ui/tooltip";

import "./style.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";

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
