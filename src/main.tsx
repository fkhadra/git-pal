import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

import { routeTree } from "./routeTree.gen";

const router = createRouter({
	routeTree,
	defaultPendingMs: 0,
	defaultPendingMinMs: 0,
	history: createMemoryHistory({
		initialEntries: [`${window.initialPath}`],
	}),
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("root")!;

const root = ReactDOM.createRoot(rootElement);
root.render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
