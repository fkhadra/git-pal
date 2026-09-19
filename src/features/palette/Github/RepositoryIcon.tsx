import { BookMarked, Lock } from "lucide-react";

import { IconWrapper } from "~/components/icon-wrapper";

interface Props {
  isInOrganization?: boolean;
  isPrivate?: boolean;
  avatarUrl: string;
}

export function RepositoryIcon({
  avatarUrl,
  isInOrganization,
  isPrivate,
}: Props) {
  let component: React.ReactNode;

  if (isInOrganization) {
    component = <img alt="Avatar" src={avatarUrl} className="size-6" />;
  } else if (isPrivate) {
    component = <Lock className="size-5 text-warning" />;
  } else {
    component = <BookMarked className="size-5 text-info" />;
  }

  return <IconWrapper>{component}</IconWrapper>;
}
