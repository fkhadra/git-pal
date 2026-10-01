import { useRef, useState } from "react";

interface RovingItem {
  id: string;
  label: string;
}

const TYPEAHEAD_RESET_MS = 500;

export const FOCUSED_ROW_CLASS =
  "outline-ring data-focused:bg-accent/60 data-focused:outline-2 data-focused:-outline-offset-2";

export function useRovingFocus<E extends HTMLElement>(
  items: RovingItem[],
  selectedId?: string | null,
) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hasFocus, setHasFocus] = useState(false);
  const [isKeyboardFocus, setIsKeyboardFocus] = useState(false);
  const isPointerFocus = useRef(false);
  const elements = useRef(new Map<string, E>());
  const typeahead = useRef({ text: "", timeout: 0 });

  const ids = items.map((item) => item.id);

  // a hidden or removed item can't hold the tab stop
  const tabStopId =
    [focusedId, selectedId].find((id) => id && ids.includes(id)) ?? ids[0];

  const focus = (id: string) => {
    setFocusedId(id);
    elements.current.get(id)?.focus();
  };

  const matchTypeahead = (key: string, from: number) => {
    window.clearTimeout(typeahead.current.timeout);
    typeahead.current.text += key.toLowerCase();
    typeahead.current.timeout = window.setTimeout(() => {
      typeahead.current.text = "";
    }, TYPEAHEAD_RESET_MS);

    const ordered = [...items.slice(from + 1), ...items.slice(0, from + 1)];

    return ordered.find((item) =>
      item.label.toLowerCase().startsWith(typeahead.current.text),
    )?.id;
  };

  return {
    tabStopId,
    focus,
    matchTypeahead,
    markKeyboard: () => setIsKeyboardFocus(true),
    isFocusVisible: (id: string) =>
      hasFocus && isKeyboardFocus && id === focusedId,
    itemProps: (id: string) => ({
      ref: (el: E | null) => {
        if (el) elements.current.set(id, el);
        else elements.current.delete(id);
      },
      tabIndex: id === tabStopId ? 0 : -1,
      onFocus: (e: React.FocusEvent<E>) => {
        // focus bubbles up from nested items
        if (e.target === e.currentTarget) setFocusedId(id);
      },
    }),
    containerProps: {
      onPointerDown: () => {
        isPointerFocus.current = true;
        setIsKeyboardFocus(false);
      },
      onFocus: () => {
        setHasFocus(true);
        if (!isPointerFocus.current) setIsKeyboardFocus(true);
        isPointerFocus.current = false;
      },
      onBlur: (e: React.FocusEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHasFocus(false);
      },
    },
  };
}
