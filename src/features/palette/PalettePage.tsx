import { useRouterState } from "@tanstack/react-router";
import { Command, useCommandState } from "cmdk";
import { Suspense, useState } from "react";
import { SkeletonRows } from "~/components";
import { CommandEmpty } from "~/components/Cmdk";
import { useFullHeightRef } from "~/libs/useFullHeight";
import { CommandInput } from "./CommandInput";
import { HomePage } from "./HomePage";
import { Keybinds } from "./Keybinds";
import { useGhSearchActive } from "./useGhSearchActive";
import { usePreloadRoutes } from "./usePreloadRoutes";

export function PalettePage() {
	const listBox = useFullHeightRef<HTMLDivElement>({ bottomPadding: 52 });
	const isGhSearchActive = useGhSearchActive();
	const [v, setV] = useState("");

	usePreloadRoutes();

	return (
		<div
			className={"h-screen bg-gradient-to-tl from-pink-300/10 to-purple-500/10"}
		>
			<Command
				loop
				className="relative h-full overflow-hidden"
				shouldFilter={!isGhSearchActive}
				value={v}
				onValueChange={(value) => {
					setV(value);
				}}
			>
				<CommandInput />
				<Command.List ref={listBox.setRef} className="px-2">
					<EmptySearchResults />
					<Suspense fallback={<SkeletonRows />}>
						<HomePage />
					</Suspense>
					{/*<Outlet />*/}
				</Command.List>
				<Keybinds />
			</Command>
		</div>
	);
}

function EmptySearchResults() {
	const search = useCommandState((s) => s.search);
	const isGhSearchActive = useGhSearchActive();
	const isPending = useRouterState({
		select: (s) => s.status === "pending",
	});

	if (isPending || isGhSearchActive || search.length === 0) return null;

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
