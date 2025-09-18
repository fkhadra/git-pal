import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  BookOpenText,
  CircleDot,
  GitPullRequest,
  MessageSquare,
  PanelsTopLeft,
} from "lucide-react";
import { CommandItem } from "~/components/Cmdk";
import { Container, IconWrapper } from "~/features/palette/Github/Layout";
import { RepositoryIcon } from "~/features/palette/Github/RepositoryIcon";
import { Store } from "~/store";

export const Route = createFileRoute("/palette/repository/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({ from: "/palette/repository/$id" });
  const item = Store.get(params.id);

  if (item?.kind !== "repo") return null;

  const repository = item.data;

  return (
    <>
      <CommandItem value={`${repository.id}-home`}>
        <Container>
          <RepositoryIcon
            avatarUrl={repository.owner.avatarUrl}
            isPrivate={repository.isPrivate}
            isInOrganization={repository.isInOrganization}
          />
          <span>
            {repository.owner.login}/{repository.name}
          </span>
        </Container>
      </CommandItem>
      <CommandItem value={`${repository.id}-pull-requests`}>
        <Container>
          <IconWrapper>
            <GitPullRequest />
          </IconWrapper>
          <span>Pull Requests ({repository.pullRequests.totalCount})</span>
        </Container>
      </CommandItem>
      {repository.hasIssuesEnabled && (
        <CommandItem value={`${repository.id}-issues`}>
          <Container>
            <IconWrapper>
              <CircleDot />
            </IconWrapper>
            <span>Issues ({repository.issues.totalCount})</span>
          </Container>
        </CommandItem>
      )}
      {repository.hasDiscussionsEnabled && (
        <CommandItem value={`${repository.id}-discussions`}>
          <Container>
            <IconWrapper>
              <MessageSquare />
            </IconWrapper>
            <span>Discussions ({repository.discussions.totalCount})</span>
          </Container>
        </CommandItem>
      )}
      {repository.hasProjectsEnabled && (
        <CommandItem value={`${repository.id}-project`}>
          <Container>
            <IconWrapper>
              <PanelsTopLeft />
            </IconWrapper>
            <span>Project</span>
          </Container>
        </CommandItem>
      )}
      {repository.hasWikiEnabled && (
        <CommandItem value={`${repository.id}-wiki`}>
          <Container>
            <IconWrapper>
              <BookOpenText />
            </IconWrapper>
            <span>Wiki</span>
          </Container>
        </CommandItem>
      )}
    </>
  );
}
