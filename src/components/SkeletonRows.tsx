import { Container } from "~/features/palette/Github/Layout";

export function SkeletonRows({ count = 7 }) {
	return (
		<div aria-busy="true" className="flex flex-col gap-4">
			<div className="ml-2 h-4 w-1/3 rounded-md bg-neutral-700/50 animate-pulse" />
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} className="flex min-h-12 items-center gap-2 px-2 py-0">
					<Container>
						<div className="size-9 rounded-md bg-neutral-700/60 animate-pulse" />
						<div>
							<div className="h-4 w-3/4 rounded-md bg-neutral-700/60 animate-pulse mb-2" />
							<div className="h-4 w-1/3 rounded-md bg-neutral-700/50 animate-pulse" />
						</div>
						<div className="h-8 w-24 rounded-md bg-neutral-700/60 animate-pulse" />
					</Container>
				</div>
			))}
		</div>
	);
}
