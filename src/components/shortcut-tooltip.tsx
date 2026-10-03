import { useState } from "react";

import { Keybind } from "~/components/keybind";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useShortcutsHintVisible } from "~/hooks";
import { parseShortcut } from "~/libs/keymap";

const CHIP_OFFSET = 6;

interface Props {
  label?: string;
  shortcut: string;
  children: React.ReactElement;
}

export function ShortcutTooltip({ label, shortcut, children }: Props) {
  const { modifiers, mainKey } = parseShortcut(shortcut);
  const keys = [...modifiers.map((m) => m.symbol), mainKey.symbol];
  const [isOpen, setOpen] = useState(false);
  const isShortcutHintVisible = useShortcutsHintVisible();
  const [wasChip, setWasChip] = useState(false);
  const isShown = isOpen || isShortcutHintVisible;
  const isChip = isShown ? isShortcutHintVisible && !isOpen : wasChip;

  if (isChip !== wasChip) setWasChip(isChip);

  return (
    <Tooltip open={isShown} onOpenChange={setOpen}>
      <TooltipTrigger render={children} />
      <TooltipContent
        className={isChip ? "px-1 py-0.5 has-data-[slot=kbd]:pr-1" : undefined}
        sideOffset={isChip ? CHIP_OFFSET : undefined}
      >
        <Keybind
          label={isChip ? undefined : label}
          keys={keys}
          className="text-inherit"
        />
      </TooltipContent>
    </Tooltip>
  );
}
