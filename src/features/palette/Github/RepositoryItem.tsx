import { CircleDot, GitPullRequest, Star } from "lucide-react";
import type { Repository } from "~/models";
import { Container } from "../Layout";
import { RepositoryIcon } from "./RepositoryIcon";

export function RepositoryItem({
	repository,
	hideOwner = false,
}: {
	repository: Repository;
	hideOwner?: boolean;
}) {
	return (
		<Container>
			<RepositoryIcon
				avatarUrl={repository.owner.avatarUrl}
				isPrivate={repository.isPrivate}
				isInOrganization={repository.isInOrganization}
			/>
			<div className="flex flex-col">
				<span>
					{hideOwner
						? repository.name
						: `${repository.owner.login}/${repository.name}`}
				</span>
				<div className="flex items-center gap-2 text-xs">
					<span className="flex items-center">
						<Star className="mr-1 size-3 fill-amber-300 stroke-amber-300" />
						<span>{repository.stargazerCount || 0}</span>
					</span>
					<span className="flex items-center">
						<GitPullRequest className="mr-1 size-3" />
						<span>{repository.pullRequests?.totalCount || 0}</span>
					</span>
					<span className="flex items-center">
						<CircleDot className="mr-1 size-3" />
						<span>{repository.issues?.totalCount || 0}</span>
					</span>
				</div>
			</div>
		</Container>
	);
}
