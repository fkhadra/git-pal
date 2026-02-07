import { type SlotableComponent, Typography } from "~/components";

interface Props {
  icon?: SlotableComponent;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ icon: Icon, title, children, className }: Props) {
  return (
    <section className={className}>
      <Typography.h4 className="text-muted-foreground mb-4 flex items-center border-b border-b-pink-400/10">
        {Icon && <Icon className="mr-1 size-4" />}
        {title}
      </Typography.h4>
      {children}
    </section>
  );
}
