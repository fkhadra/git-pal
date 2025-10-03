import { useLoaderData } from "@tanstack/react-router";
import { Keyboard, Palette, Power } from "lucide-react";
import commands from "~/commands";
import { Button, Hr, ThemePicker } from "~/components";
import { useWindowReady } from "~/hooks";
import { AutoStart } from "./AutoStart";
import { HotKey } from "./HotKey";
import { Section } from "./Section";

export function SettingsPage() {
  const { autoStartEnabled } = useLoaderData({ from: "/settings" });

  useWindowReady();

  return (
    <main data-with-decoration className="flex h-dvh flex-col gap-7 p-4">
      <Section icon={Power} title="Startup">
        <AutoStart autoStartEnabled={autoStartEnabled} />
      </Section>
      <Hr />
      <Section icon={Palette} title="Theme">
        <ThemePicker />
      </Section>
      <Hr />
      <Section icon={Keyboard} title="Hotkey">
        <HotKey />
      </Section>

      <div>
        <span>Test Auth</span>
        <Button
          onClick={() => {
            commands.startAuthFlow();
          }}
        >
          Authorize
        </Button>
      </div>
    </main>
  );
}
