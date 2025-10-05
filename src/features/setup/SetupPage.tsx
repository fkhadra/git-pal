import { Github } from "lucide-react";
import { useEffect, useState } from "react";
import commands from "~/commands";
import { Button, Keybind, Typography, Vortex } from "~/components";

import { useWindowReady } from "~/hooks";
import { Beams } from "./Beams";

export function SetupPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useWindowReady();

  useEffect(() => {
    const listener = commands.onAuthMessage((event) => {
      if (event.payload.ok) {
        setIsAuthenticated(true);
      }
    });

    return () => {
      listener.then((unsub) => unsub());
    };
  }, []);

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
          <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Git Pal
          </span>
        </Typography.h1>
        <Typography.h4 className="mt-2 italic">
          GitHub in your flow, not in your way.
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
          <Button
            color="primary"
            className="mt-2"
            leftSlot={Github}
            onClick={() => {
              commands.startAuthFlow();
            }}
          >
            Login with Github
          </Button>
        )}
      </div>
    </main>
  );
}
