import { useState } from "react";
import commands from "~/commands";
import { FormControl, Label, Switch } from "~/components/Form";

export function AutoStart({ autoStartEnabled }: { autoStartEnabled: boolean }) {
  const [isEnabled, setIsEnabled] = useState(autoStartEnabled);
  return (
    <FormControl className="flex-row items-center">
      <Label className="font-normal">
        Automatically start Git Pal when you login
      </Label>
      <Switch
        className="ml-auto"
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
    </FormControl>
  );
}
