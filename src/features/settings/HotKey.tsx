import { Keybind } from "~/components";
import { FormControl, Input } from "~/components/Form";

export function HotKey() {
  return (
    <FormControl className="flex-row items-center">
      <Keybind label="Global shortcut to open Git Pal" keys={["⌘", "G"]} />
      <div className="ml-auto">
        <Input placeholder="⌘G" />
      </div>
    </FormControl>
  );
}
