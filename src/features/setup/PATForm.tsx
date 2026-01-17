import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "~/components";
import { Input } from "~/components/Form";

interface Props {
  closeDialog: () => void;
}

export function PATForm({ closeDialog }: Props) {
  return (
    <form className="flex flex-col">
      <p className="text-secondary-foreground mb-2 text-base">
        <button
          type="button"
          className="cursor-pointer text-sm font-semibold text-indigo-400 underline"
          onClick={() => {
            openUrl(
              "https://github.com/settings/tokens/new?description=Git Pal&scopes=repo,read:org,gist,read:user,user:email",
            );
          }}
        >
          Create Token
        </button>{" "}
        and paste it below.
      </p>
      <Input placeholder="Paste your token" />

      <div className="mt-4 flex items-center justify-between">
        <Button color="secondary" onClick={closeDialog}>
          Cancel
        </Button>
        <Button color="primary">Submit</Button>
      </div>
    </form>
  );
}
