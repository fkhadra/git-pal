import { AnimatePresence, motion } from "motion/react";
import { FormEvent, useState } from "react";

import commands from "~/commands";
import { Input } from "~/components/form";
import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import { createPAT } from "~/libs/createPAT";
import { withDelay } from "~/libs/utils";

interface Props {
  onCancel: () => void;
  onAuthSuccess: () => void;
}

export function PATForm({ onCancel, onAuthSuccess }: Props) {
  const [token, setToken] = useState("");
  const [formError, setFormError] = useState<string>();
  const [formStatus, setFormStatus] = useState<"idle" | "inFlight">("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormStatus("inFlight");
    setFormError(undefined);

    try {
      await withDelay(commands.authenticate(token));
      onAuthSuccess();
    } catch (error) {
      setFormError(error as unknown as string);
    } finally {
      setFormStatus("idle");
    }
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit}>
      <p className="mb-2 text-base text-secondary-foreground">
        <button
          type="button"
          className="cursor-pointer text-sm font-semibold text-indigo-400 underline"
          onClick={createPAT}
        >
          Create Token
        </button>{" "}
        and paste it below.
      </p>
      <Input
        placeholder="Paste your token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        error={formError}
      />

      <div className="mt-4 flex items-center justify-between">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="relative w-32 overflow-hidden"
          disabled={!!!token || formStatus === "inFlight"}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              initial={{ opacity: 0, y: -25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 25 }}
              key={formStatus}
            >
              {formStatus === "idle" ? "Submit" : <Spinner />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
    </form>
  );
}
