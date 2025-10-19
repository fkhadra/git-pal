import { useLocation } from "@tanstack/react-router";

export function useGhSearchActive() {
	const pathname = useLocation({ select: (s) => s.pathname });
	return pathname.startsWith("/palette/search");
}
