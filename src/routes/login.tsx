import { createFileRoute } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { useEffect } from "react";
import commands from "~/commands";
import { Button, Typography, WavyBackground } from "~/components";
import { AnimatedBeamDemo } from "~/components/demo";
import { useWindowReady } from "~/hooks";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  useWindowReady();
  useEffect(() => {
    const listener = commands.onAuthMessage((event) => {
      console.log(event.payload);
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
      <WavyBackground />
      {/*<Vortex
        rangeY={800}
        particleCount={500}
        className="flex h-full w-full flex-col items-center justify-center px-2 py-4 md:px-10"
      />*/}
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
        <AnimatedBeamDemo />
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
      </div>
    </main>
  );
}
