import { Clock } from "lucide-react";
import { useState } from "react";

import commands from "~/commands";
import { FormControl, Input, Label } from "~/components/form";
import { Switch } from "~/components/ui/switch";
import { useAppContext } from "~/features/shared";
import { digitsOnly } from "~/libs/utils";

import { Section } from "./Section";

const MIN_INTERVAL_S = 5;
const MAX_INTERVAL_S = 300;

export function MonitoringSection() {
  const appContext = useAppContext();
  const [monitorPullRequests, setMonitorPullRequests] = useState(
    appContext.settings.monitorPullRequests,
  );
  // text so the field can be cleared while typing
  const [monitorInterval, setMonitorInterval] = useState(
    String(appContext.settings.monitorInterval),
  );

  return (
    <Section icon={Clock} title="Pull Request Monitoring">
      <FormControl className="flex-row items-center">
        <Switch
          checked={monitorPullRequests}
          onCheckedChange={async (checked) => {
            setMonitorPullRequests(checked);
            await commands.updateSetting({ monitorPullRequests: checked });
          }}
        />
        <Label className="font-normal">
          Notify me when my review is requested
        </Label>
      </FormControl>
      <FormControl>
        <Label>Check interval (seconds)</Label>
        <Input
          inputMode="numeric"
          disabled={!monitorPullRequests}
          value={monitorInterval}
          onChange={(e) => setMonitorInterval(digitsOnly(e.target.value))}
          onBlur={async () => {
            const val = Math.max(
              MIN_INTERVAL_S,
              Math.min(MAX_INTERVAL_S, Number(monitorInterval)),
            );
            setMonitorInterval(String(val));
            await commands.updateSetting({ monitorInterval: val });
          }}
        />
      </FormControl>
    </Section>
  );
}
