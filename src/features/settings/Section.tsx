import { type SlotableComponent } from "~/components/types";
import { Typography } from "~/components/typography";

interface Props {
  icon?: SlotableComponent;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ icon: Icon, title, children, className }: Props) {
  return (
    <section className={className}>
      <Typography.h4 className="mb-4 flex items-center border-b border-b-pink-400/10 text-muted-foreground">
        {Icon && <Icon className="mr-1 size-4" />}
        {title}
      </Typography.h4>
      {children}
    </section>
  );
}
