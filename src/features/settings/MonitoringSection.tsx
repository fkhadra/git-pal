import { Bell } from "lucide-react";
import { useState } from "react";

import commands from "~/commands";
import { Input } from "~/components/form";
import { Switch } from "~/components/ui/switch";
import { useAppContext } from "~/features/shared";
import { digitsOnly } from "~/libs/utils";

import { Section } from "./Section";
import { CONTROL_WIDTH, SettingRow } from "./SettingRow";

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
    <Section icon={Bell} title="Notifications">
      <SettingRow
        label="Review requests"
        description="Notify me when my review is requested."
      >
        <Switch
          checked={monitorPullRequests}
          onCheckedChange={async (checked) => {
            setMonitorPullRequests(checked);
            await commands.updateSetting({ monitorPullRequests: checked });
          }}
        />
      </SettingRow>
      <SettingRow
        label="Check interval"
        description={`Seconds between checks, ${MIN_INTERVAL_S} to ${MAX_INTERVAL_S}.`}
      >
        <Input
          wrapperClassName={CONTROL_WIDTH}
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
      </SettingRow>
    </Section>
  );
}
