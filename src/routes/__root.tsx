import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRoute,
	Outlet,
	redirect,
	useLoaderData,
} from "@tanstack/react-router";
import commands from "~/commands";
import { AppContext } from "~/common";
import { state } from "~/features/palette";
import { useColorScheme } from "~/libs/useColorScheme";

export const Route = createRootRoute({
	staleTime: 60_000,
	async loader(props) {
		try {
			if (props.location.pathname === "/setup") return;

			const userProfile = await commands.isAuthenticated();
			const theme = await commands.getSetting("theme");

			userProfile.organizations.nodes?.forEach((org) => {
				if (org?.name) {
					state.setItem(org.name, { kind: "org", data: org });
				}
			});

			return { userProfile, theme };
		} catch {
			throw redirect({
				to: "/setup",
			});
		}
	},
	component() {
		const data = useLoaderData({ from: "__root__" });

		useColorScheme(data?.theme);

		if (!data?.userProfile) {
			return <Outlet />;
		}

		return (
			<QueryClientProvider client={queryClient}>
				<AppContext
					value={{ userProfile: data.userProfile, theme: data.theme }}
				>
					<Outlet />
				</AppContext>
			</QueryClientProvider>
		);
	},
});

const queryClient = new QueryClient();
