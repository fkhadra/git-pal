import {
  createRootRoute,
  Outlet,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";
import commands from "~/commands";
import { UserProfileContext } from "~/contexts/user-profile";
import { useColorScheme } from "~/libs/useColorScheme";
import { Store } from "~/store";

export const Route = createRootRoute({
  async beforeLoad(ctx) {
    try {
      if (ctx.location.pathname === "/login") return;

      const data = await commands.isAuthenticated();

      data.organizations.nodes?.forEach((org) => {
        if (org && org.name) {
          Store.set(org.name, { kind: "org", data: org });
        }
      });

      return data;
    } catch {
      throw redirect({
        to: "/login",
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
