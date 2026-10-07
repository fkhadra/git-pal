import { Palette, Smile } from "lucide-react";

import { ThemePicker } from "~/components/theme-picker";

import { AvatarPicker } from "./AvatarPicker";
import { Section } from "./Section";

export function AppearanceSection() {
  return (
    <>
      <Section
        icon={Palette}
        title="Theme"
        description="Applies to every window."
      >
        <ThemePicker />
      </Section>
      <Section
        icon={Smile}
        title="Agent avatar"
        description="Represents the agent across the app."
      >
        <AvatarPicker />
      </Section>
    </>
  );
}
