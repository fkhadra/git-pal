import { useId } from "react";

import { ShortcutKeys } from "~/components/shortcut-keys";
import { Typography } from "~/components/typography";
import { Separator } from "~/components/ui/separator";

import { PullRequestStatusIcon } from "./Github";
import {
  PALETTE_SHORTCUT_LABELS,
  type PaletteAction,
  usePaletteKeybind,
} from "./shortcuts";

const INLINE_KEYS = "inline-flex align-middle";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <h3 className="mb-3 text-base text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Item({
  icon: Icon,
  label,
  description,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  description: string;
}) {
  const id = useId();

  return (
    <div className="mb-2 grid grid-cols-2 gap-2">
      <div className="flex items-center gap-2">
        {<Icon aria-labelledby={id} />}
        <span>{label}</span>
      </div>
      <Typography.p id={id}>{description}</Typography.p>
    </div>
  );
}

function Shortcuts() {
  const keybind = usePaletteKeybind();
  const actions = Object.keys(PALETTE_SHORTCUT_LABELS) as PaletteAction[];

  return (
    <Section title="Shortcuts">
      {actions.map((action) => (
        <div key={action} className="mb-2 grid grid-cols-2 gap-2">
          <span>{PALETTE_SHORTCUT_LABELS[action]}</span>
          <ShortcutKeys shortcut={keybind[action]} />
        </div>
      ))}
    </Section>
  );
}

export function Help() {
  return (
    <div className="flex flex-col text-sm">
      <Shortcuts />
      <Separator className="my-3" />

      <Section title="Active Tasks">
        <Item
          icon={PullRequestStatusIcon.Building}
          label="Building"
          description="Running CI/CD checks"
        />
        <Item
          icon={PullRequestStatusIcon.Draft}
          label="Draft"
          description="Work in progress"
        />
      </Section>
      <Separator className="my-3" />

      <Section title="Action Required">
        <Item
          icon={PullRequestStatusIcon.Failed}
          label="Failed"
          description="Some checks failed"
        />
        <Item
          icon={PullRequestStatusIcon.ChangesRequested}
          label="Changes Requested"
          description="Updates requested by reviewer"
        />
        <Item
          icon={PullRequestStatusIcon.Conflict}
          label="Conflict"
          description="Need to resolve merge conflicts"
        />
      </Section>
      <Separator className="my-3" />

      <Section title="Ready for Review">
        <Item
          icon={PullRequestStatusIcon.Ready}
          label="Ready"
          description="All checks passed"
        />
      </Section>
    </div>
  );
}
