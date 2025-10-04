import {
  createRootRoute,
  Outlet,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";
import commands from "~/commands";
import { UserProfileContext } from "~/contexts/user-profile";
import { useColorScheme } from "~/libs/useColorScheme";
import { UserProfile } from "~/models";
import { Store } from "~/store";

let userProfile: UserProfile | undefined;

export const Route = createRootRoute({
  async beforeLoad(props) {
    try {
      if (userProfile) return userProfile;
      if (props.location.pathname === "/setup") return;

      userProfile = await commands.isAuthenticated();

      userProfile.organizations.nodes?.forEach((org) => {
        if (org && org.name) {
          Store.set(org.name, { kind: "org", data: org });
        }
      });

      return userProfile;
    } catch {
      throw redirect({
        to: "/setup",
      });
    }
  },
  component() {
    useColorScheme();
    const userProfile = useRouteContext({ from: "__root__" });

    if (!userProfile) {
      // TODO: Login form
      return <Outlet />;
    }

    return (
      <UserProfileContext value={userProfile}>
        <Outlet />
      </UserProfileContext>
    );
  },
});
