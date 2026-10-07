import { Keyboard } from "lucide-react";

import { PaletteShortcuts } from "./PaletteShortcuts";
import { ReviewShortcuts } from "./ReviewShortcuts";
import { Section } from "./Section";

export function ShortcutsSection() {
  return (
    <Section icon={Keyboard} title="Shortcuts">
      <PaletteShortcuts />
      <ReviewShortcuts />
    </Section>
  );
}
