import { useQuery } from "@tanstack/react-query";
import { Check, Clock, Copy, Eye, EyeOff, KeyRound, Trash } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

import commands from "~/commands";
import { FormControl, Input, Label } from "~/components/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { PATForm } from "../setup";
import { Section } from "./Section";

function formatDate(value: string) {
  const date = new Date(value.replace(" ", "T").replace(" UTC", "Z"));

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function SecuritySection() {
  const [openPATDialog, togglePATDialog] = useState(false);
  const { data, refetch } = useQuery({
    queryKey: ["get_token"],
    queryFn: commands.getToken,
  });

  commands.useOnAuthMessage((e) => {
    if (e.payload.authMessage.ok) {
      refetch();
    }
  });

  const closeDialog = useCallback(() => {
    togglePATDialog(false);
  }, [refetch]);

  const handleAuthSuccess = () => {
    refetch();
    closeDialog();
  };

  return (
    <Section
      title="Authentication"
      icon={KeyRound}
      className="flex h-full flex-col"
    >
      <FormControl>
        <Label>GitHub Token</Label>
        <div className="flex flex-col gap-3">
          <Token value={data?.value || ""} />
          {data?.expire_at && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 size-4" />
              <span>Expires on {formatDate(data.expire_at)}</span>
            </div>
          )}
        </div>
      </FormControl>
      <Separator className="my-4" />
      <FormControl>
        <span className="leading-none font-medium text-foreground">
          Update Authentication
        </span>
        <div className="flex items-center">
          <div className="flex items-center gap-2">
            <Button onClick={commands.startAuthFlow}>Login with GitHub</Button>{" "}
            or
            <Button variant="outline" onClick={() => togglePATDialog(true)}>
              Configure via PAT
            </Button>
          </div>
        </div>
      </FormControl>
      <Dialog modal open={openPATDialog} onOpenChange={togglePATDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Configure via PAT</DialogTitle>
          </DialogHeader>
          <PATForm onCancel={closeDialog} onAuthSuccess={handleAuthSuccess} />
        </DialogContent>
      </Dialog>

      <div className="mt-auto flex flex-col gap-2">
        <Separator />
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" className="ml-auto">
                <Trash />
                Delete Token
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete GitHub Token?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone and you will need to
                re-authenticate.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel render={<Button variant="secondary" />}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                render={<Button variant="destructive" />}
                onClick={commands.deleteToken}
              >
                <Trash />
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Section>
  );
}

function Token({ value }: { value: string }) {
  const [displayToken, setDisplayToken] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const copyToken = async () => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(value);
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
      <Input disabled type={displayToken ? "text" : "password"} value={value} />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDisplayToken(!displayToken)}
            >
              {!displayToken ? <EyeOff /> : <Eye />}
            </Button>
          }
        />
        <TooltipContent>Show password</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
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
          }
        />
        <TooltipContent>Copy password</TooltipContent>
      </Tooltip>
    </div>
  );
}
