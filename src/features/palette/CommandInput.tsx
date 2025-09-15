import { Command } from "cmdk";
import { useState } from "react";
import { useGhSearchActive } from "./useGhSearchActive";
import { useKeybinds } from "./useKeybinds";
import { Search } from "lucide-react";

export function CommandInput() {
  const [filter, setFilter] = useState("");
  const isGhSearchActive = useGhSearchActive();
  const handleKeyboard = useKeybinds();

  return (
    <div className="group mb-2 flex w-full items-center gap-1 rounded-none border-b-[1px] border-zinc-800/10 bg-transparent px-3 py-2 dark:border-pink-300/10">
      <Search className="text-muted-foreground transition-colors group-focus-within:text-purple-400" />
      <Command.Input
        autoFocus
        data-search
        placeholder={isGhSearchActive ? "Search code" : "Search"}
        value={filter}
        onKeyDown={handleKeyboard}
        onValueChange={setFilter}
        className="w-full p-2 caret-purple-400 outline-none placeholder:text-gray-600 dark:placeholder:text-gray-500"
      />
    </div>
  );
}
