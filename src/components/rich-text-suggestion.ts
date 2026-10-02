import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import type { ComponentType } from "react";

const POPUP_GAP_PX = 4;
// opens above the caret when this much room is missing below
const POPUP_MAX_HEIGHT_PX = 300;

export interface SuggestionListProps<I> {
  items: I[];
  selected: number;
  onSelect: (item: I) => void;
}

/** Popup at the caret rendering `List`, browsed with the arrows, picked with Enter or Tab. */
export function suggestionPopup<I, S>(
  List: ComponentType<SuggestionListProps<I>>,
  toSelected: (item: I) => S,
): SuggestionOptions<I, S>["render"] {
  return () => {
    let renderer: ReactRenderer<unknown, SuggestionListProps<I>> | null = null;
    let props: SuggestionProps<I, S> | null = null;
    let selected = 0;

    function select(item: I) {
      props?.command(toSelected(item));
    }

    function update() {
      if (!props) return;

      renderer?.updateProps({ items: props.items, selected, onSelect: select });
    }

    function place() {
      const rect = props?.clientRect?.();
      const element = renderer?.element as HTMLElement | undefined;
      if (!rect || !element) return;

      const fitsBelow = rect.bottom + POPUP_MAX_HEIGHT_PX < window.innerHeight;
      element.style.left = `${rect.left}px`;
      element.style.top = fitsBelow ? `${rect.bottom + POPUP_GAP_PX}px` : "";
      element.style.bottom = fitsBelow
        ? ""
        : `${window.innerHeight - rect.top + POPUP_GAP_PX}px`;
    }

    return {
      onStart: (next) => {
        props = next;
        selected = 0;
        renderer = new ReactRenderer(List, {
          props: { items: next.items, selected, onSelect: select },
          editor: next.editor,
        });

        const element = renderer.element as HTMLElement;
        element.style.position = "fixed";
        element.style.zIndex = "50";
        document.body.appendChild(element);
        place();
      },

      onUpdate: (next) => {
        props = next;
        selected = 0;
        update();
        place();
      },

      onKeyDown: ({ event }) => {
        const count = props?.items.length ?? 0;
        if (!props || count === 0) return false;

        if (event.key === "Enter" || event.key === "Tab") {
          select(props.items[selected]);
          return true;
        }

        const offset = { ArrowDown: 1, ArrowUp: -1 }[event.key];
        if (!offset) return false;

        selected = (selected + offset + count) % count;
        update();
        return true;
      },

      onExit: () => {
        renderer?.element.remove();
        renderer?.destroy();
        renderer = null;
        props = null;
      },
    };
  };
}
