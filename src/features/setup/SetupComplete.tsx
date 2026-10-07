import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import commands from "~/commands";
import { Button } from "~/components/ui/button";
import { shortcutSymbols } from "~/libs/keymap";

import trayIcon from "../../../src-tauri/icons/tray-template.png";

const SHORTCUT = shortcutSymbols(globalThis.settings.keybind.showPalette);

const TRAY_LOCATION = navigator.userAgent.includes("Mac")
  ? "menu bar"
  : "system tray";

/** The real tray icon, tinted with the theme. */
function TrayHint() {
  return (
    <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
      <div className="flex h-7 items-center gap-3 rounded-md border bg-card px-3">
        <span className="h-1.5 w-8 rounded-full bg-muted-foreground/30" />
        <span className="grid size-5 place-items-center rounded bg-foreground/10 ring-1 ring-primary">
          <span
            className="size-4 bg-foreground"
            style={{
              maskImage: `url(${trayIcon})`,
              maskSize: "contain",
            }}
          />
        </span>
        <span className="h-1.5 w-5 rounded-full bg-muted-foreground/30" />
      </div>
      Git Pal lives in your {TRAY_LOCATION}.
    </div>
  );
}

/** Shown once signed in, teaches the shortcut by having it pressed. */
export function SetupComplete() {
  const { data: profile } = useQuery({
    queryKey: ["setup-profile"],
    queryFn: commands.isAuthenticated,
  });

  return (
    <div className="flex animate-in flex-col items-center gap-8 text-center duration-500 zoom-in-95 fade-in">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {profile ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="size-20 rounded-full ring-2 ring-success/40"
            />
          ) : (
            <div className="size-20 rounded-full bg-muted" />
          )}
          <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full bg-success text-background ring-4 ring-background">
            <Check className="size-4" />
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          You’re in{profile && `, ${profile.login}`}
        </h2>
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">Try it now, press</p>
        <div className="flex gap-2">
          {SHORTCUT.map((key, index) => (
            <kbd
              key={index}
              className="grid h-14 min-w-14 animate-pulse place-items-center rounded-xl border border-b-4 bg-card px-3 font-sans text-2xl font-medium"
            >
              {key}
            </kbd>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          to open Git Pal from anywhere.
        </p>
      </div>

      <div className="flex gap-3">
        <Button size="lg" onClick={() => commands.showPalette()}>
          Open palette
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => commands.showReview()}
        >
          Open Review Pal
        </Button>
      </div>

      <TrayHint />
    </div>
  );
}
