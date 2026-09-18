import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import commands from "~/commands";
import { ModifierSymbol } from "~/libs/keymap";
import { AppUpdate } from "~/models/updater";
import { Button } from "~/components/ui/button";
import { Kbd, KbdGroup } from "~/components/ui/kbd";

export function UpdateAppButton() {
  const [appUpdate, setAppUpdate] = useState<AppUpdate>();

  useEffect(() => {
    const listener = commands.onAppUpdated((event) => {
      if (event.payload) {
        setAppUpdate(event.payload);
      }
    });

    return () => {
      listener.then((unsub) => unsub());
    };
  }, []);

  return <AnimatePresence>{appUpdate && <ButtonWrapper />}</AnimatePresence>;
}

function ButtonWrapper() {
  useEffect(() => {
    function handleRestart(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "u") {
        event.preventDefault();
        commands.restartApp();
      }
    }

    document.addEventListener("keydown", handleRestart);

    return () => {
      document.removeEventListener("keydown", handleRestart);
    };
  }, []);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
    >
      <Button
        size="sm"
        variant="outline"
        className={`relative after:absolute after:-inset-0.5 after:-z-10 after:animate-pulse after:rounded-lg after:bg-linear-to-r after:from-pink-600 after:to-violet-600 after:blur-sm`}
        onClick={commands.restartApp}
      >
        Restart to Update
        <KbdGroup>
          <Kbd>{ModifierSymbol.cmd}</Kbd>
          <Kbd>U</Kbd>
        </KbdGroup>
      </Button>
    </motion.div>
  );
}
