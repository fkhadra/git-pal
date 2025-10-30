import { useCallback, useRef } from "react";

export type NodeRef<T extends HTMLElement> = ReturnType<
	typeof useFullHeightRef<T>
>;

export function useFullHeightRef<T extends HTMLElement>(
	{ bottomPadding = 0 }: { bottomPadding?: number } = { bottomPadding: 0 },
) {
	const nodeRef = useRef<T>(null);
	const setRef = useCallback(
		(el: T) => {
			if (el) {
				nodeRef.current = el;
				el.style.height = `calc(100dvh - ${el.getBoundingClientRect().top + bottomPadding}px)`;
			}
		},
		[bottomPadding],
	);

	return {
		setRef,
		node: nodeRef.current,
	};
}
