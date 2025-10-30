import { type RouterState, useRouterState } from "@tanstack/react-router";

function selector(v: RouterState) {
	if (
		v.location.pathname.startsWith("/palette/org") &&
		v.location.search?.query
	) {
		return false;
	}

	return v.status === "pending";
}

export function usePendingRoute() {
	return useRouterState({
		select: selector,
	});
}
