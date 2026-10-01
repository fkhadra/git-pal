import { useQuery } from "@tanstack/react-query";

import { Spinner } from "~/components/spinner";

import { repositoryClonedKey } from "./data-loader";

interface Props {
  owner: string;
  repository: string;
  changedFiles: number;
}

function noticeText(
  { owner, repository, changedFiles }: Props,
  isCloned?: boolean,
) {
  const files = `${changedFiles.toLocaleString()} files`;

  if (isCloned === false) {
    return `Cloning ${owner}/${repository} to load ${files}, the first time can take a few minutes.`;
  }

  if (isCloned) return `Fetching ${files} with git…`;

  return `Loading ${files} with git…`;
}

export function LargeDiffNotice(props: Props) {
  // filled by the diff query right before it starts
  const { data: isCloned } = useQuery<boolean>({
    queryKey: repositoryClonedKey(props.owner, props.repository),
    enabled: false,
  });

  return (
    <div className="flex items-center gap-2 border-b px-4 py-2 text-sm text-muted-foreground">
      <Spinner className="size-4 shrink-0" />
      {noticeText(props, isCloned)}
    </div>
  );
}
