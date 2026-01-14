import { Command, useCommandState } from "cmdk";
import { Suspense, useEffect, useRef } from "react";
import commands from "~/commands";
import { SkeletonRows } from "~/components";
import { CommandEmpty } from "~/components/Cmdk";
import { useFullHeightRef } from "~/libs/useFullHeight";
import { CommandInput } from "./CommandInput";
import { HomePage } from "./HomePage";
import { Keybinds } from "./Keybinds";
import { OrgPage } from "./OrgPage";
import {
	PullRequestsPage,
	usePreloadPullRequestsQueries,
} from "./PullRequestsPage";
import { RepositoryPage } from "./RepositoryPage";
import { SearchPage } from "./SearchPage";
import {
	createPageMapper,
	useCurrentPage,
	useDisableEmptySearchResults,
	useGHSearchActive,
} from "./state";

const pages = createPageMapper({
	home: HomePage,
	org: OrgPage,
	"pull-requests": PullRequestsPage,
	repository: RepositoryPage,
	search: SearchPage,
});

export function PalettePage() {
	const listBox = useFullHeightRef<HTMLDivElement>({ bottomPadding: 52 });
	const isGhSearchActive = useGHSearchActive();
	// const [v, setV] = useState("");
	const currentPage = useCurrentPage();
	const Page = pages[currentPage.to];
	const timeoutId = useRef<ReturnType<typeof setTimeout>>(undefined);

	usePreloadPullRequestsQueries();

	useEffect(() => {
		clearTimeout(timeoutId.current);
		timeoutId.current = setTimeout(() => {
			commands.monitorPullRequests();
		}, 20_000);

		return () => {
			commands.stopMonitoring();
		};
	}, []);

	return (
		<div
			className={"h-screen bg-linear-to-tl from-pink-300/10 to-purple-500/10"}
		>
			<Command
				loop
				className="relative h-full overflow-hidden"
				shouldFilter={!isGhSearchActive}
				// value={v}
				// onValueChange={(value) => {
				// 	setV(value);
				// }}
			>
				<CommandInput />
				<Command.List ref={listBox.setRef} className="px-2">
					<Suspense fallback={<SkeletonRows />}>
						<EmptySearchResults />
						<Page />
					</Suspense>
				</Command.List>
				<Keybinds />
			</Command>
		</div>
	);
}

function EmptySearchResults() {
	const search = useCommandState((s) => s.search);
	const isGhSearchActive = useGHSearchActive();
	const disableEmptySearchResults = useDisableEmptySearchResults();

	if (isGhSearchActive || search.length === 0 || disableEmptySearchResults)
		return null;

	return (
		<CommandEmpty>
			<span
				role="img"
				aria-label="dunno what you are looking for"
				className="mr-1"
			>
				🤷‍♂️
			</span>
			No results found.
		</CommandEmpty>
	);
}
