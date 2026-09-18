import { useCallback, useState } from "react";
import commands from "~/commands";
import { Typography } from "~/components/typography";
import { Vortex } from "~/components/vortex";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Keybind } from "~/components/keybind";

import { useWindowReady } from "~/hooks";
import { Beams } from "./Beams";
import { PATForm } from "./PATForm";

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
      className="relative grid h-dvh place-items-center"
    >
      <Vortex
        rangeY={800}
        particleCount={500}
        className="flex h-full w-full flex-col items-center justify-center px-2 py-4 md:px-10"
      />
      <div className="absolute z-10 flex min-w-[75%] flex-col items-center justify-center rounded-md border border-fuchsia-300/10 bg-zinc-900/45 p-8 backdrop-blur-md">
        <Typography.h1>
          Welcome to{" "}
          <span className="bg-linear-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Git Pal
          </span>
        </Typography.h1>
        <Typography.h4 className="mt-2 italic">
          GitHub in your flow, not in your way
        </Typography.h4>
        <Beams />
        {isAuthenticated ? (
          <Typography.h4 className="mt-4 flex gap-2">
            <div>
              <span aria-hidden="true">🎉</span> You’re in!
            </div>
            <Keybind label="Press" keys={["⌘", "G"]} />
            <span className="-ml-1">anytime to bring up Git Pal.</span>
          </Typography.h4>
        ) : (
          <div className="flex flex-col content-center justify-center">
            <Button
              className="mt-2 bg-linear-to-r from-pink-500 to-purple-600 font-bold"
              onClick={() => {
                commands.startAuthFlow();
              }}
            >
              Login with GitHub
            </Button>
            <p className="mt-2 text-sm">
              Using GitHub Enterprise?{" "}
              <button
                type="button"
                onClick={() => togglePATDialog(true)}
                className="cursor-pointer font-semibold underline hover:text-indigo-400"
              >
                Configure via PAT
              </button>
            </p>
          </div>
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
