import { createFileRoute } from "@tanstack/react-router";
import { Github } from "lucide-react";
import commands from "~/commands";
import { Button, Typography } from "~/components";
import { Vortex } from "~/components/Vortex";

import appIcon from "~/icon.png";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="relative grid h-dvh place-items-center">
      {/*<WavyBackground />*/}
      <Vortex
        backgroundColor="black"
        rangeY={800}
        particleCount={500}
        className="flex h-full w-full flex-col items-center justify-center px-2 py-4 md:px-10"
      />
      <div className="absolute z-10 flex flex-col items-center justify-center">
        <div className="flex items-center">
          <img src={appIcon} className="size-48" />
        </div>
        <Typography.h4 className="italic">
          Because every dev deserves a pal.
        </Typography.h4>
        <Button
          color="primary"
          className="mt-4"
          leftSlot={Github}
          onClick={() => {
            commands.startAuthFlow();
          }}
        >
          Login with Github
        </Button>
      </div>
    </div>
  );
}
