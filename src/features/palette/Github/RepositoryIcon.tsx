import { BookMarked, Lock } from "lucide-react";
import { IconWrapper } from "./Layout";

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
    component = <img src={avatarUrl} className="size-6" />;
  } else if (isPrivate) {
    component = <Lock className="text-warning size-5" />;
  } else {
    component = <BookMarked className="text-info size-5" />;
  }

  return <IconWrapper>{component}</IconWrapper>;
}
