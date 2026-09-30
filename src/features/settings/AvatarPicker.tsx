import { BotAvatar } from "bot-avatars";
import { cn } from "cn";

import commands from "~/commands";
import { useAvatar } from "~/components/agent-avatar";
import type { settings } from "~/models";

const TYPES: settings.AvatarType[] = [
  "mech",
  "droid",
  "alien",
  "cat",
  "ghost",
  "blob",
  "cloud",
  "drop",
  "pill",
  "pebble",
  "puddle",
  "star",
  "clover",
  "flower",
  "circle",
  "square",
  "triangle",
  "hexagon",
];

const COLORS = [
  "#c084fc",
  "#60a5fa",
  "#2dd4bf",
  "#4ade80",
  "#facc15",
  "#fb923c",
  "#f87171",
  "#f472b6",
];

export function AvatarPicker() {
  const avatar = useAvatar();

  const save = (next: settings.Avatar) => {
    commands.updateSetting({ avatar: next });
  };

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="grid grid-cols-9 gap-1">
        <legend className="sr-only">Avatar</legend>
        {TYPES.map((type) => (
          <label
            key={type}
            title={type}
            className={cn(
              "grid cursor-pointer place-items-center rounded-lg border-2 border-transparent p-1 hover:border-border",
              type === avatar.type && "border-primary hover:border-primary",
            )}
          >
            <input
              type="radio"
              name="avatar"
              className="sr-only"
              checked={type === avatar.type}
              onChange={() => save({ ...avatar, type })}
            />
            <BotAvatar
              type={type}
              color={avatar.color}
              size={36}
              paused={type !== avatar.type}
            />
          </label>
        ))}
      </fieldset>

      <fieldset className="flex items-center gap-2">
        <legend className="sr-only">Color</legend>
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            style={{ backgroundColor: color }}
            className={cn(
              "size-6 rounded-full ring-offset-2 ring-offset-background",
              color === avatar.color && "ring-2 ring-primary",
            )}
            onClick={() => save({ ...avatar, color })}
          />
        ))}
        <label
          title="Custom color"
          className={cn(
            "relative size-6 cursor-pointer overflow-hidden rounded-full bg-conic from-red-400 via-green-400 to-red-400 ring-offset-2 ring-offset-background",
            !COLORS.includes(avatar.color) && "ring-2 ring-primary",
          )}
        >
          <input
            type="color"
            value={avatar.color}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => save({ ...avatar, color: e.target.value })}
          />
        </label>
      </fieldset>
    </div>
  );
}
