import { Keyboard } from "lucide-react";

import { GlobalShortcut } from "./GlobalShortcut";
import { PaletteShortcuts } from "./PaletteShortcuts";
import { ReviewShortcuts } from "./ReviewShortcuts";
import { Section } from "./Section";

export function ShortcutsSection() {
  return (
    <Section icon={Keyboard} title="Shortcuts">
      <GlobalShortcut />
      <PaletteShortcuts />
      <ReviewShortcuts />
    </Section>
  );
}
