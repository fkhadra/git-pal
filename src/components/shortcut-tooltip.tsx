import { Keybind } from "~/components/keybind";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { parseShortcut } from "~/libs/keymap";

interface Props {
  label?: string;
  shortcut: string;
  children: React.ReactElement;
}

export function ShortcutTooltip({ label, shortcut, children }: Props) {
  const { modifiers, mainKey } = parseShortcut(shortcut);
  const keys = [...modifiers.map((m) => m.symbol), mainKey.symbol];

  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>
        <Keybind label={label} keys={keys} className="text-inherit" />
      </TooltipContent>
    </Tooltip>
  );
}
