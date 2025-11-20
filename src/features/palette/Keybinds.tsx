import { Keybind } from "~/components/Keybind";
import { useGHSearchActive, usePaletteItem } from "./state";

export function Keybinds() {
	const { selectedItem, parentItem: rootItem, isPage } = usePaletteItem();
	const isGhSearchActive = useGHSearchActive();

	if (isGhSearchActive) {
		return (
			<Container>
				<Keybind label="Go back" keys={["esc"]} />
				<Keybind className="ml-auto" label="Search" keys={["↵"]} />
			</Container>
		);
	}

	return (
		<Container>
			<Keybind label="Help" keys={["⌘", "?"]} className="mr-auto" />
			{(selectedItem?.supportGithubSearch() ||
				rootItem?.supportGithubSearch()) && (
				<Keybind label="Code Search" keys={["⌘", "/"]} />
			)}
			<Keybind label={isPage ? "View" : "Open"} keys={["↵"]} />
		</Container>
	);
}

function Container({ children }: { children: React.ReactNode }) {
	return (
		<footer className="mt-1 flex h-12 items-center justify-end gap-2 border-t border-zinc-800/10 p-2 text-xs dark:border-pink-300/10">
			{children}
		</footer>
	);
}
