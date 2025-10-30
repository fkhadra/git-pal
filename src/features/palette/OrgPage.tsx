import { useLoaderData } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import commands from "~/commands";
import { CommandGroup, CommandItem } from "~/components/Cmdk";
import { nil } from "~/libs/utils";
import type { Repository } from "~/models";
import { RepositoryItem } from "./Github";
import { state } from "./state";

interface Params {
	deps: {
		query?: string;
	};
	params: {
		name: string;
	};
}

export async function orgPageLoader({ deps, params }: Params) {
	const { data } = await commands.findRepositories({
		owner: params.name,
		query: deps.query || "",
	});

	queueMicrotask(() => {
		data.search.nodes?.forEach((repo) => {
			if (repo && repo.__typename === "Repository") {
				state.setItem(repo.id, { kind: "repo", data: repo });
			}
		});
	});

	return data;
}

export function OrgPage() {
	const data = useLoaderData({ from: "/palette/org/$name" });
	return (
		<CommandGroup heading="Repositories">
			{data.search?.nodes?.filter(nil).map((repo) => {
				const v = repo as Repository;

				return (
					<CommandItem
						value={v.id}
						key={v.id}
						keywords={[v.name]}
						onSelect={() => {
							openUrl(v.url);
						}}
					>
						<RepositoryItem repository={v} />
					</CommandItem>
				);
			})}
		</CommandGroup>
	);
}
