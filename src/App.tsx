import { useSuspenseQuery } from "@tanstack/react-query";
import { PalettePage, state } from "~/features/palette";
import commands from "./commands";
import { AppContext } from "./common";
import { SettingsPage } from "./features/settings";
import { SetupPage } from "./features/setup";
import { useColorScheme } from "./libs/useColorScheme";

function useAppQuery() {
	return useSuspenseQuery({
		queryKey: ["app"],
		queryFn: async () => {
			if (globalThis.currentView === "setup") {
				return {};
			}

			console.log(globalThis.settings);

			const userProfile = await commands.isAuthenticated();
			const theme = globalThis.settings.theme;

			userProfile.organizations.nodes?.forEach((org) => {
				if (org?.name) {
					state.setItem(org.name, { kind: "org", data: org });
				}
			});

			return { userProfile, theme };
		},
	});
}

const Views: Record<(typeof globalThis)["currentView"], React.FC> = {
	settings: SettingsPage,
	setup: SetupPage,
	palette: PalettePage,
};

export function App() {
	const { data } = useAppQuery();
	useColorScheme(data?.theme);

	if (!data?.userProfile) {
		return <SetupPage />;
	}

	const View = Views[window.currentView];

	return (
		<AppContext value={{ userProfile: data.userProfile, theme: data.theme }}>
			<View />
		</AppContext>
	);
}
