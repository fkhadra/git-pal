import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Command, useCommandState } from "cmdk";
import { CommandEmpty } from "~/components/Cmdk";
import { CommandInput } from "~/features/palette/CommandInput";
import { Keybinds } from "~/features/palette/Keybinds";
import { useGhSearchActive } from "~/features/palette/useGhSearchActive";
import { usePreloadRoutes } from "~/features/palette/usePreloadRoutes";
import { useFullHeightRef } from "~/libs/useFullHeight";
import { Navigation } from "./-Navigation";

export const Route = createFileRoute("/palette")({
	component,
	validateSearch(p): { p?: string | undefined } {
		return {
			p: p.p as string,
		};
	},
});

function component() {
	const listBox = useFullHeightRef<HTMLDivElement>({ bottomPadding: 52 });
	const isGhSearchActive = useGhSearchActive();

	usePreloadRoutes();

	return (
		<div
			className={"h-screen bg-gradient-to-tl from-pink-300/10 to-purple-500/10"}
		>
			<Navigation />
			<Command
				loop
				className="relative h-full overflow-hidden"
				shouldFilter={!isGhSearchActive}
			>
				<CommandInput />
				<Command.List ref={listBox.setRef} className="px-2">
					<EmptySearchResults />
					<Outlet />
				</Command.List>
				<Keybinds />
			</Command>
		</div>
	);
}

function EmptySearchResults() {
	const search = useCommandState((s) => s.search);
	const isGhSearchActive = useGhSearchActive();
	// const isPending = useRouterState({
	// 	select: (s) => s.status === "pending",
	// });

	if (isGhSearchActive || search.length === 0) return null;

	// if (isPending) return <span>LOADING FTW</span>;

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
