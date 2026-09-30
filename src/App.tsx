import { useSuspenseQuery } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";

import { PalettePage, state } from "~/features/palette";

import commands from "./commands";
import { ReviewPage } from "./features/review";
import { SettingsPage } from "./features/settings";
import { SetupPage } from "./features/setup";
import { AppProvider } from "./features/shared";
import { useColorScheme } from "./libs/useColorScheme";

function useAppQuery() {
  return useSuspenseQuery({
    queryKey: ["app"],
    queryFn: async () => {
      if (globalThis.currentView === "setup") {
        return {};
      }

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
  review: ReviewPage,
};

export function App() {
  const { data } = useAppQuery();
  useColorScheme(globalThis.settings.theme);

  if (!data?.userProfile) {
    return <SetupPage />;
  }

  const View = Views[window.currentView];

  return (
    <AppProvider
      value={{ userProfile: data.userProfile, settings: globalThis.settings }}
    >
      <View />
      <ToastContainer />
    </AppProvider>
  );
}
