import { Activity, Clock } from "lucide-react";
import { useState } from "react";

import commands from "~/commands";
import { FormControl, Input, Label } from "~/components/form";
import { Switch } from "~/components/ui/switch";
import { useAppContext } from "~/features/shared";

import { Section } from "./Section";

export function MonitoringSection() {
  const appContext = useAppContext();
  const [displayRateLimit, setDisplayRateLimit] = useState(
    appContext.settings.displayRateLimit,
  );
  const [monitorInterval, setMonitorInterval] = useState(
    appContext.settings.monitorInterval,
  );

  return (
    <>
      <Section icon={Activity} title="Notifications">
        <FormControl className="flex-row items-center">
          <Switch
            checked={displayRateLimit}
            onCheckedChange={async (checked) => {
              setDisplayRateLimit(checked);
              await commands.updateSetting({ displayRateLimit: checked });
            }}
          />
          <Label className="font-normal">Display rate limiting</Label>
        </FormControl>
      </Section>

      <Section icon={Clock} title="Pull Request Monitoring">
        <FormControl>
          <Label>Check interval (seconds)</Label>
          <Input
            type="number"
            min={5}
            max={300}
            value={monitorInterval}
            onChange={(e) => setMonitorInterval(Number(e.target.value))}
            onBlur={async () => {
              const val = Math.max(5, Math.min(300, monitorInterval));
              setMonitorInterval(val);
              await commands.updateSetting({ monitorInterval: val });
            }}
          />
        </FormControl>
      </Section>
    </>
  );
}
