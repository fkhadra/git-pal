import { useLocation } from "@tanstack/react-router";

export function useGhSearchActive() {
  const location = useLocation();
  return location.pathname.startsWith("/palette/search");
}
