import { useSuspenseQuery } from "@tanstack/react-query";

import {
	BookOpenText,
	CircleDot,
	CirclePlay,
	GitPullRequestArrow,
	MessageCircleMore,
	PanelsTopLeft,
	Tag,
	Workflow,
} from "lucide-react";
import commands from "~/commands";
import { CommandGroup, CommandItem } from "~/components/ui/command";
import { RepositoryIcon } from "./Github/RepositoryIcon";
import { Container } from "./Layout";
import { state, useCurrentPage } from "./state";
import { openUrl } from "./utils";
import { IconWrapper } from "~/components/icon-wrapper";

function useRepositoryQuery() {
	const page = useCurrentPage("repository");

	return useSuspenseQuery({
		queryKey: ["repository", page.params.id],
		queryFn: async () => {
			const item = state.getItem(page.params.id);

			if (item?.kind !== "repo") return null;

			const repository = item.data;

			const workflows = await commands.findWorkflows({
				owner: repository.owner.login,
				repository: repository.name,
			});

			return {
				repository,
				workflows,
			};
		},
	});
}

function Count({ value }: { value: number | bigint }) {
	return <span className="text-muted-foreground ml-1 text-xs">({value})</span>;
}

export function RepositoryPage() {
	const { data } = useRepositoryQuery();

	if (!data) return;

	const { repository, workflows } = data;

	return (
		<CommandGroup heading="Pages">
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
				value={`${repository.id}-actions`}
				onSelect={() => {
					openUrl(`${repository.url}/actions`);
				}}
			>
				<Container>
					<IconWrapper>
						<CirclePlay className="text-success" />
					</IconWrapper>
					<div>Actions</div>
				</Container>
			</CommandItem>
			{workflows.data.total_count > 0 && (
				<CommandItem value={`${repository.id}-workflows`}>
					<Container>
						<IconWrapper>
							<Workflow className="text-orange-400" />
						</IconWrapper>
						<div>Workflows</div>
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
