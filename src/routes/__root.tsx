import {
	createRootRoute,
	Outlet,
	redirect,
	useLoaderData,
} from "@tanstack/react-router";
import commands from "~/commands";
import { AppContext } from "~/common";
import { useColorScheme } from "~/libs/useColorScheme";
import { state } from "~/store";

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
			<AppContext value={{ userProfile: data.userProfile, theme: data.theme }}>
				<Outlet />
			</AppContext>
		);
	},
});
