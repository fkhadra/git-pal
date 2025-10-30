import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useRef } from "react";
import { useGhSearchActive } from "./useGhSearchActive";
import { useKeybinds } from "./useKeybinds";

export function CommandInput() {
	const isGhSearchActive = useGhSearchActive();
	const { filter, setFilter, handleKeyboard } = useKeybinds();
	const { p } = useSearch({ from: "/palette" });

	const orgp = useParams({ from: "/palette/org/$name", shouldThrow: false });
	const h = useRef<ReturnType<typeof setTimeout>>(undefined);
	const navigate = useNavigate();

	return (
		<div className="group mb-2 flex w-full items-center gap-1 rounded-none border-b-[1px] border-zinc-800/10 bg-transparent px-3 py-2 dark:border-pink-300/10 ">
			<Search className="text-muted-foreground transition-colors group-focus-within:text-purple-400" />
			{p && (
				<div className="justify-center rounded-md border border-pink-300/40 bg-zinc-900 px-2 text-pink-200 text-sm flex items-center">
					<span>~</span>
					<span>/</span>
					<span>{p}</span>
				</div>
			)}
			<Command.Input
				autoFocus
				data-search
				placeholder={isGhSearchActive ? "Search code" : "Search"}
				value={filter}
				onKeyDown={handleKeyboard}
				onValueChange={(search) => {
					setFilter(search);

					if (orgp) {
						clearTimeout(h.current);

						h.current = setTimeout(() => {
							navigate({
								to: "/palette/org/$name",
								params: {
									name: orgp.name,
								},
								search: {
									query: search,
								},
								replace: true,
							});
						}, 250);
					}
				}}
				className="p-2 caret-purple-400 outline-none placeholder:text-gray-600 dark:placeholder:text-gray-500 flex-1"
			/>
		</div>
	);
}
