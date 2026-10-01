import { cn } from "cn";

import { FOCUSED_ROW_CLASS, useRovingFocus } from "~/hooks/useRovingFocus";

interface Props<T> {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  selectedId?: string | null;
  onSelect?: (item: T) => void;
  renderItem: (item: T, state: { isSelected: boolean }) => React.ReactNode;
  "aria-label": string;
  onExitTop?: () => void;
  selectionFollowsFocus?: boolean;
  className?: string;
}

export function ListView<T>({
  items,
  getId,
  getLabel,
  selectedId,
  onSelect,
  renderItem,
  onExitTop,
  selectionFollowsFocus = false,
  className,
  ...aria
}: Props<T>) {
  const roving = useRovingFocus<HTMLLIElement>(
    items.map((item) => ({ id: getId(item), label: getLabel(item) })),
    selectedId,
  );

  const moveTo = (index: number) => {
    const item = items[index];
    if (!item) return;

    roving.focus(getId(item));
    if (selectionFollowsFocus) onSelect?.(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    roving.markKeyboard();

    const index = items.findIndex((item) => getId(item) === roving.tabStopId);
    const current = items[index];
    if (!current) return;

    switch (e.key) {
      case "ArrowDown":
        moveTo(index + 1);
        break;
      case "ArrowUp":
        if (index === 0) onExitTop?.();
        else moveTo(index - 1);
        break;
      case "Home":
        moveTo(0);
        break;
      case "End":
        moveTo(items.length - 1);
        break;
      case "Enter":
      case " ":
        onSelect?.(current);
        break;
      default: {
        const isPrintable = e.key.length === 1 && !e.metaKey && !e.ctrlKey;
        if (!isPrintable) return;

        const match = roving.matchTypeahead(e.key, index);
        if (match) moveTo(items.findIndex((item) => getId(item) === match));
      }
    }

    e.preventDefault();
  };

  return (
    <ul
      role="listbox"
      {...aria}
      onKeyDown={handleKeyDown}
      {...roving.containerProps}
      className={cn("flex flex-col gap-px", className)}
    >
      {items.map((item) => {
        const id = getId(item);
        const isSelected = id === selectedId;

        return (
          <li
            key={id}
            {...roving.itemProps(id)}
            role="option"
            aria-selected={isSelected}
            className="outline-none"
          >
            <div
              data-focused={roving.isFocusVisible(id) ? "" : undefined}
              onClick={() => {
                roving.focus(id);
                onSelect?.(item);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors select-none hover:bg-accent/60",
                FOCUSED_ROW_CLASS,
                isSelected && "bg-accent hover:bg-accent",
              )}
            >
              {renderItem(item, { isSelected })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
