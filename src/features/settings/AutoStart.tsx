import { useState } from "react";

import commands from "~/commands";
import { Switch } from "~/components/ui/switch";

import { SettingRow } from "./SettingRow";

export function AutoStart({ autoStartEnabled }: { autoStartEnabled: boolean }) {
  const [isEnabled, setIsEnabled] = useState(autoStartEnabled);
  return (
    <SettingRow
      label="Launch on login"
      description="Start Git Pal when you log in."
    >
      <Switch
        checked={isEnabled}
        onCheckedChange={async (checked) => {
          try {
            setIsEnabled(checked);
            await (checked
              ? commands.enableAutoStart()
              : commands.disableAutoStart());
          } catch (e) {
            console.log(e);
          }
        }}
      />
    </SettingRow>
  );
}
