import { Keybind } from "~/components/keybind";
import { shortcutSymbols } from "~/libs/keymap";

import { useItemActions } from "./actions";
import { ActionsMenu } from "./ActionsMenu";
import { usePaletteKeybind } from "./shortcuts";
import { useGHSearchActive } from "./state";

export function PaletteFooter() {
  const isGhSearchActive = useGHSearchActive();
  const keybind = usePaletteKeybind();
  const actions = useItemActions();

  if (isGhSearchActive) {
    return (
      <Container>
        <Keybind label="Go back" keys={shortcutSymbols(keybind.cancel)} />
        <Keybind
          className="ml-auto"
          label="Search"
          keys={shortcutSymbols(keybind.primaryAction)}
        />
      </Container>
    );
  }

  const [primary, ...others] = actions;

  return (
    <Container>
      <Keybind
        label="Help"
        keys={shortcutSymbols(keybind.help)}
        className="mr-auto"
      />
      <Keybind
        label={primary.label}
        keys={shortcutSymbols(keybind.primaryAction)}
      />
      {others.length > 0 && (
        <>
          <Keybind.Separator />
          <ActionsMenu actions={actions} />
        </>
      )}
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <footer className="mt-1 flex h-12 items-center justify-end gap-2 border-t p-2 text-xs">
      {children}
    </footer>
  );
}
