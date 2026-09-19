import { CircleCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type KeyboardEvent, useRef, useState } from "react";

import commands from "~/commands";
import { FormControl, Input, Label } from "~/components/form";
import { Kbd } from "~/components/ui/kbd";
import { useAppContext } from "~/features/shared";
import {
  captureShortcut,
  parseShortcut,
  type Shortcut,
  shortcutToString,
} from "~/libs/keymap";

export function GlobalShortcut() {
  const { settings } = useAppContext();
  const [shortcut, setShortcut] = useState<Shortcut | undefined>(() =>
    parseShortcut(settings.globalShortcut),
  );
  const [showFeedback, setShowFeedback] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldRevert = useRef(true);
  const [error, setError] = useState<string>();

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setError(undefined);
    shouldRevert.current = true;
    const shouldSaveShortcut =
      e.code === "Enter" && shortcut?.mainKey && shortcut.modifiers.length >= 1;

    if (e.code === "Escape") {
      setShortcut(undefined);
      return;
    }

    if (shouldSaveShortcut) {
      try {
        const shortcutStr = shortcutToString(shortcut);

        if (!shortcutStr) return;

        await commands.replaceGlobalShortcut(shortcutStr);
        shouldRevert.current = false;
        inputRef.current?.blur();
        setShowFeedback(true);
        setTimeout(() => {
          setShowFeedback(false);
        }, 1_000);
      } catch (error) {
        setError(`Unable to save shortcut: ${error}`);
      }
      return;
    }

    const keys = captureShortcut(e);

    setShortcut(keys);
  };

  return (
    <FormControl className="mt-4 flex-col">
      <Label htmlFor="shortcut">Show Git Pal</Label>
      <div className="relative flex items-center gap-2">
        <Input
          ref={inputRef}
          error={error}
          id="shortcut"
          name="shortcut"
          onKeyDown={handleKeyDown}
          className="w-60"
          onFocus={() => setIsRecording(true)}
          onBlur={() => {
            if (shouldRevert.current) {
              setShortcut(parseShortcut(settings.globalShortcut));
            }
            setIsRecording(false);
          }}
        />
        {shortcut && (
          <div className="absolute top-0.5 left-2 mt-2 flex items-center gap-1">
            {shortcut.modifiers.map((k) => (
              <Kbd key={k.value}>{k.symbol}</Kbd>
            ))}
            {shortcut.mainKey.symbol && <Kbd>{shortcut.mainKey.symbol}</Kbd>}

            {isRecording && (
              <motion.div
                className="ml-1 h-5 w-0.5 bg-primary"
                animate={{ opacity: [0, 1] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8,
                  repeatType: "loop",
                  ease: "linear",
                }}
              />
            )}
          </div>
        )}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.1, opacity: 0 }}
            >
              <CircleCheck className="fill-success stroke-white dark:fill-transparent dark:stroke-success" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {isRecording && (
        <div className="mt-1 text-xs text-muted-foreground">
          Press desired key combination and press <Kbd>↵</Kbd>
        </div>
      )}
    </FormControl>
  );
}
