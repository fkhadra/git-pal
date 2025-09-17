import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export function usePreloadRoutes() {
  const router = useRouter();
  const ran = useRef(false);
  useEffect(() => {
    async function preload() {
      try {
        await Promise.all([
          router.preloadRoute({
            to: "/palette/pull-requests",
            search: {
              filter: "mentions",
            },
          }),
          router.preloadRoute({
            to: "/palette/pull-requests",
            search: {
              filter: "review-requested",
            },
          }),
        ]);
      } catch (error) {
        console.error(error);
      }
    }

    if (!ran.current) {
      preload();
      ran.current = true;
    }
  }, [router]);
}
