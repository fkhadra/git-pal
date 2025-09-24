import { SlotableComponent, Typography } from "~/components";

interface Props {
  icon: SlotableComponent;
  title: string;
  children: React.ReactNode;
}

export function Section({ icon: Icon, title, children }: Props) {
  return (
    <section>
      <Typography.h4 className="mb-2 flex items-center">
        <Icon className="mr-2" />
        {title}
      </Typography.h4>
      {children}
    </section>
  );
}
