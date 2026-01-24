import { Clock, Copy, Info, KeyRound, Trash } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button, Dialog, Hr, Typography } from "~/components";
import { AlertDialog } from "~/components/AlertDialog";
import { FormControl, Label, PasswordInput } from "~/components/Form";
import { useAppContext } from "../shared";
import { Section } from "./Section";
import { Alert, AlertTitle, AlertDescription } from "~/components/Alert";
import { PATForm } from "../setup";

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
          <div className="flex items-center">
            <PasswordInput value={"x".repeat(16)} readOnly />
            <div className="text-muted-foreground ml-4 flex items-center text-sm">
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

          {/* <Alert className="mb-4">
            <Info className="text-info" />
            <AlertDescription>
              Your token is stored securely in the system keychain and never
              leaves this computer.
            </AlertDescription>
          </Alert> */}
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

        {/* <div className="mt-auto">
          <AlertDialog
            title="Delete GitHub Token?"
            trigger={
              <Button className="ml-auto" variant="destructive">
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
        </div> */}
      </Section>
    </>
  );
}
