import { useCallback, useState } from "react";

import commands from "~/commands";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useWindowReady } from "~/hooks";
import appIcon from "~/icon.png";

import { PATForm } from "./PATForm";
import { SetupComplete } from "./SetupComplete";
import { SetupDemo } from "./SetupDemo";

// fractal noise, breaks up the flat background
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function SetupPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [openPATDialog, togglePATDialog] = useState(false);
  const closeDialog = useCallback(() => togglePATDialog(false), []);
  const onAuthSuccess = useCallback(() => {
    togglePATDialog(false);
    setIsAuthenticated(true);
  }, []);

  useWindowReady();

  commands.useOnAuthMessage((event) => {
    if (event.payload.authMessage.ok) {
      setIsAuthenticated(true);
    }
  });

  return (
    <main
      data-with-decoration
      className="relative grid h-dvh place-items-center overflow-hidden bg-background"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="relative z-10 flex w-full animate-in flex-col items-center gap-6 px-8 duration-500 fade-in slide-in-from-bottom-2">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src={appIcon}
            alt=""
            className="size-16 rounded-2xl ring-1 ring-white/10"
          />
          <h1 className="text-4xl font-semibold tracking-tight">Git Pal</h1>
          <p className="text-muted-foreground">
            GitHub in your flow, not in your way
          </p>
        </div>

        {isAuthenticated ? (
          <SetupComplete />
        ) : (
          <>
            <SetupDemo />
            <div className="mt-4 flex flex-col items-center gap-3">
              <Button
                size="lg"
                className="h-10 w-64 bg-foreground px-6 font-medium text-background hover:bg-foreground/90"
                onClick={() => {
                  commands.startAuthFlow();
                }}
              >
                Continue with GitHub
              </Button>
              <p className="text-xs text-muted-foreground">
                GitHub Enterprise?{" "}
                <button
                  type="button"
                  onClick={() => togglePATDialog(true)}
                  className="cursor-pointer text-foreground underline-offset-4 hover:underline"
                >
                  Use a token
                </button>
              </p>
            </div>
          </>
        )}
        <Dialog modal open={openPATDialog} onOpenChange={togglePATDialog}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Configure via PAT</DialogTitle>
            </DialogHeader>
            <PATForm onCancel={closeDialog} onAuthSuccess={onAuthSuccess} />
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
