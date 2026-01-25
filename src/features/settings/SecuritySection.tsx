import { useQuery } from "@tanstack/react-query";
import { Check, Clock, Copy, Eye, EyeOff, KeyRound, Trash } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import commands from "~/commands";
import { Button, Dialog, Hr, Tooltip } from "~/components";
import { AlertDialog } from "~/components/AlertDialog";
import { FormControl, Input, Label } from "~/components/Form";
import { PATForm } from "../setup";
import { useAppContext } from "../shared";
import { Section } from "./Section";

export function SecuritySection() {
  const { userProfile } = useAppContext();
  const [openPATDialog, togglePATDialog] = useState(false);
  const closeDialog = useCallback(() => togglePATDialog(false), []);
  const tokenExpireAt = useMemo(() => {
    if (!userProfile.tokenExpireAt) return null;
    const date = new Date(
      userProfile.tokenExpireAt.replace(" ", "T").replace(" UTC", "Z"),
    );

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [userProfile.tokenExpireAt]);

  return (
    <>
      <Section
        title="Authentication"
        icon={KeyRound}
        className="flex h-full flex-col"
      >
        <FormControl>
          <Label>GitHub Token</Label>
          <div className="flex flex-col gap-3">
            <Token />
            <div className="text-muted-foreground flex items-center text-sm">
              <Clock className="mr-1 size-4" />
              <span>Expires on {tokenExpireAt}</span>
            </div>
          </div>
        </FormControl>
        <Hr className="my-4" />
        <FormControl>
          <span className="text-foreground leading-none font-medium">
            Update Authentication
          </span>
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <Button>Login with GitHub</Button> or
              <Button variant="outline" onClick={() => togglePATDialog(true)}>
                Configure via PAT
              </Button>
            </div>
          </div>
        </FormControl>
        <Dialog
          modal
          open={openPATDialog}
          onOpenChange={togglePATDialog}
          title="Configure via PAT"
          content={
            <PATForm onCancel={closeDialog} onAuthSuccess={closeDialog} />
          }
        />

        <div className="mt-auto flex flex-col gap-2">
          <Hr />
          <AlertDialog
            title="Delete GitHub Token?"
            trigger={
              <Button variant="destructive" className="ml-auto">
                <Trash />
                Delete Token
              </Button>
            }
            description="This action cannot be undone and you will need to re-authenticate."
            action={
              <Button variant="destructive">
                <Trash />
                Delete
              </Button>
            }
          />
        </div>
      </Section>
    </>
  );
}

function Token() {
  const [displayToken, setDisplayToken] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const { data = "" } = useQuery({
    queryKey: ["get_token"],
    queryFn: commands.getToken,
  });

  const copyToken = async () => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(data);
    } catch (err) {
      console.error("Failed to copy:", err);
    } finally {
      setTimeout(() => {
        setIsCopying(false);
      }, 600);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input disabled type={displayToken ? "text" : "password"} value={data} />
      <Tooltip content="Show password">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDisplayToken(!displayToken)}
        >
          {!displayToken ? <EyeOff /> : <Eye />}
        </Button>
      </Tooltip>
      <Tooltip content="Copy password">
        <Button
          size="icon"
          variant="outline"
          onClick={copyToken}
          className="relative overflow-hidden"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              initial={{ opacity: 0, y: -25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 25 }}
              key={`${isCopying}`}
            >
              {isCopying ? <Check className="text-success" /> : <Copy />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </Tooltip>
    </div>
  );
}
