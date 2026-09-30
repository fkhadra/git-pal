import { Kbd, KbdGroup } from "~/components/ui/kbd";
import { parseShortcut } from "~/libs/keymap";

export function ShortcutKeys({
  shortcut,
  className,
}: {
  shortcut: string;
  className?: string;
}) {
  const { modifiers, mainKey } = parseShortcut(shortcut);

  return (
    <KbdGroup className={className}>
      {modifiers.map((m) => (
        <Kbd key={m.value}>{m.symbol}</Kbd>
      ))}
      {mainKey.symbol && <Kbd>{mainKey.symbol}</Kbd>}
    </KbdGroup>
  );
}
