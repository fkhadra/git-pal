import { useEffect } from "react";

import commands from "~/commands";

export function useWindowReady() {
  useEffect(() => {
    commands.showCurrentWindow();
  }, []);
}
