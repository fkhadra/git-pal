import { cn } from "~/libs/utils";

export function Keybind({
	className,
	label,
	keys,
}: {
	className?: string;
	label?: string;
	keys: React.ReactNode[];
}) {
	return (
		<div className={cn("text-foreground flex items-center gap-1", className)}>
			{label && <span>{label}</span>}
			{keys.length > 1 ? (
				<Group>
					{keys.map((v, i) => (
						<Kbd key={`kbd-${i}`}>{v}</Kbd>
					))}
				</Group>
			) : (
				keys.map((v, i) => <Kbd key={`kbd-${i}`}>{v}</Kbd>)
			)}
		</div>
	);
}

function Separator() {
	return <hr className="h-3 w-px border-0 bg-pink-300/40" />;
}

Keybind.Separator = Separator;

function Group({ children }: { children: React.ReactNode }) {
	return <div className="flex gap-1">{children}</div>;
}

export function Kbd({ children }: { children: React.ReactNode }) {
	return (
		<kbd className="inline-flex max-h-5 w-fit min-w-5 items-center text-sm justify-center rounded-sm border border-pink-300/40 bg-zinc-900 p-1 text-pink-200">
			{children}
		</kbd>
	);
}
