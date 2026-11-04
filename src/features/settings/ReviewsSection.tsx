import { GitPullRequest } from "lucide-react";
import { useState } from "react";

import commands from "~/commands";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { useAppContext } from "~/features/shared";
import type { settings } from "~/models";

import { Section } from "./Section";
import { CONTROL_WIDTH, SettingRow } from "./SettingRow";

const CLEANUP_LABELS: Record<settings.ReviewCleanup, string> = {
  off: "Off",
  worktree: "Worktree only",
  everything: "Everything",
};

const CLEANUPS = Object.keys(CLEANUP_LABELS) as settings.ReviewCleanup[];

export function ReviewsSection() {
  const appContext = useAppContext();
  const [reviewCleanup, setReviewCleanup] = useState(
    appContext.settings.reviewCleanup,
  );
  const [followPolicies, setFollowPolicies] = useState(
    appContext.settings.followRepositoryPolicies,
  );

  return (
    <Section icon={GitPullRequest} title="Reviews">
      <SettingRow
        label="Cleanup"
        description="What to remove once a reviewed pull request is merged or closed."
      >
        <Select
          value={reviewCleanup}
          onValueChange={async (value) => {
            const cleanup = value as settings.ReviewCleanup;
            setReviewCleanup(cleanup);
            await commands.updateSetting({ reviewCleanup: cleanup });
          }}
        >
          <SelectTrigger size="sm" className={CONTROL_WIDTH}>
            <SelectValue>{CLEANUP_LABELS[reviewCleanup]}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {CLEANUPS.map((cleanup) => (
              <SelectItem key={cleanup} value={cleanup}>
                {CLEANUP_LABELS[cleanup]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        label="Follow repository policies"
        description="Auto review and approve with a repository's git-pal.yml when no template matches it."
      >
        <Switch
          checked={followPolicies}
          onCheckedChange={async (checked) => {
            setFollowPolicies(checked);
            await commands.updateSetting({ followRepositoryPolicies: checked });
          }}
        />
      </SettingRow>
    </Section>
  );
}
