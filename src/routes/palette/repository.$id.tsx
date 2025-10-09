import { createFileRoute, useParams } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import { CommandGroup } from "cmdk";
import {
  BookOpenText,
  CircleDot,
  GitPullRequestArrow,
  MessageCircleMore,
  PanelsTopLeft,
  Tag,
} from "lucide-react";
import { CommandItem } from "~/components/Cmdk";
import { Container, IconWrapper } from "~/features/palette/Github/Layout";
import { RepositoryIcon } from "~/features/palette/Github/RepositoryIcon";
import { Store } from "~/store";

export const Route = createFileRoute("/palette/repository/$id")({
  component: RouteComponent,
});

function Count({ value }: { value: number | bigint }) {
  return <span className="text-muted-foreground ml-1 text-xs">({value})</span>;
}

function RouteComponent() {
  const params = useParams({ from: "/palette/repository/$id" });
  const item = Store.get(params.id);

  if (item?.kind !== "repo") return null;

  const repository = item.data;

  return (
    <CommandGroup>
      <CommandItem
        value={`${repository.id}-home`}
        onSelect={() => {
          openUrl(repository.url);
        }}
      >
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
      <CommandItem
        value={`${repository.id}-pull-requests`}
        onSelect={() => {
          openUrl(`${repository.url}/pulls`);
        }}
      >
        <Container>
          <IconWrapper>
            <GitPullRequestArrow className="text-blue-500" />
          </IconWrapper>
          <div>
            Pull Requests
            <Count value={repository.pullRequests.totalCount} />
          </div>
        </Container>
      </CommandItem>
      {repository.hasIssuesEnabled && (
        <CommandItem
          value={`${repository.id}-issues`}
          onSelect={() => {
            openUrl(`${repository.url}/issues`);
          }}
        >
          <Container>
            <IconWrapper>
              <CircleDot className="text-warning" />
            </IconWrapper>
            <div>
              Issues
              <Count value={repository.issues.totalCount} />
            </div>
          </Container>
        </CommandItem>
      )}
      {repository.hasDiscussionsEnabled && (
        <CommandItem
          value={`${repository.id}-discussions`}
          onSelect={() => {
            openUrl(`${repository.url}/discussions`);
          }}
        >
          <Container>
            <IconWrapper>
              <MessageCircleMore className="text-pink-400" />
            </IconWrapper>
            <div>
              Discussions
              <Count value={repository.discussions.totalCount} />
            </div>
          </Container>
        </CommandItem>
      )}
      {repository.hasProjectsEnabled && (
        <CommandItem
          value={`${repository.id}-project`}
          onSelect={() => {
            openUrl(`${repository.url}/projects`);
          }}
        >
          <Container>
            <IconWrapper>
              <PanelsTopLeft className="text-teal-500" />
            </IconWrapper>
            <div>Project</div>
          </Container>
        </CommandItem>
      )}
      {repository.hasWikiEnabled && (
        <CommandItem
          value={`${repository.id}-wiki`}
          onSelect={() => {
            openUrl(`${repository.url}/wiki`);
          }}
        >
          <Container>
            <IconWrapper>
              <BookOpenText className="text-info" />
            </IconWrapper>
            <div>Wiki</div>
          </Container>
        </CommandItem>
      )}
      <CommandItem
        value={`${repository.id}-releases`}
        onSelect={() => {
          openUrl(`${repository.url}/releases`);
        }}
      >
        <Container>
          <IconWrapper>
            <Tag className="text-violet-500" />
          </IconWrapper>
          <div>Releases</div>
        </Container>
      </CommandItem>
    </CommandGroup>
  );
}
