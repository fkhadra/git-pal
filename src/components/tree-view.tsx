import { cn } from "cn";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";

import { FOCUSED_ROW_CLASS, useRovingFocus } from "~/hooks/useRovingFocus";

export interface TreeNode<T> {
  id: string;
  label: string;
  children?: TreeNode<T>[];
  data?: T;
}

export interface TreeNodeState {
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
}

interface Props<T> {
  nodes: TreeNode<T>[];
  expandedIds: ReadonlySet<string>;
  onExpandedChange: (ids: Set<string>) => void;
  selectedId?: string | null;
  onSelect?: (node: TreeNode<T>) => void;
  renderNode: (node: TreeNode<T>, state: TreeNodeState) => React.ReactNode;
  "aria-label": string;
  animate?: boolean;
  onExitTop?: () => void;
  selectionFollowsFocus?: boolean;
  className?: string;
}

interface VisibleNode<T> {
  node: TreeNode<T>;
  parentId: string | null;
  level: number;
}

const INDENT_PX = 12;
const ROW_PADDING_PX = 8;
const GROUP_TRANSITION = { duration: 0.15, ease: "easeOut" } as const;

function flatten<T>(
  nodes: TreeNode<T>[],
  expandedIds: ReadonlySet<string>,
  parentId: string | null = null,
  level = 1,
): VisibleNode<T>[] {
  return nodes.flatMap((node) => {
    const visible = { node, parentId, level };
    if (!node.children || !expandedIds.has(node.id)) return [visible];

    return [
      visible,
      ...flatten(node.children, expandedIds, node.id, level + 1),
    ];
  });
}

export function TreeView<T>({
  nodes,
  expandedIds,
  onExpandedChange,
  selectedId,
  onSelect,
  renderNode,
  animate = true,
  onExitTop,
  selectionFollowsFocus = false,
  className,
  ...aria
}: Props<T>) {
  const visible = useMemo(
    () => flatten(nodes, expandedIds),
    [nodes, expandedIds],
  );
  const visibleIds = visible.map((v) => v.node.id);
  const roving = useRovingFocus<HTMLLIElement>(
    visible.map((v) => v.node),
    selectedId,
  );
  const { tabStopId, focus } = roving;

  const moveTo = (id: string) => {
    focus(id);
    if (!selectionFollowsFocus) return;

    const target = visible.find((v) => v.node.id === id)?.node;
    if (target && !target.children) onSelect?.(target);
  };

  const setExpanded = (id: string, isExpanded: boolean) => {
    const next = new Set(expandedIds);
    if (isExpanded) next.add(id);
    else next.delete(id);

    onExpandedChange(next);
  };

  const activate = (node: TreeNode<T>) => {
    if (node.children) {
      setExpanded(node.id, !expandedIds.has(node.id));
      return;
    }

    onSelect?.(node);
  };

  const expandSiblings = (current: VisibleNode<T>) => {
    const siblings = visible.filter((v) => v.parentId === current.parentId);
    const next = new Set(expandedIds);
    for (const { node } of siblings) {
      if (node.children) next.add(node.id);
    }

    onExpandedChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    roving.markKeyboard();

    const index = visible.findIndex((v) => v.node.id === tabStopId);
    const current = visible[index];
    if (!current) return;

    const { node } = current;
    const isExpanded = expandedIds.has(node.id);

    switch (e.key) {
      case "ArrowDown": {
        const next = visible[index + 1];
        if (next) moveTo(next.node.id);
        break;
      }
      case "ArrowUp": {
        const previous = visible[index - 1];
        if (previous) moveTo(previous.node.id);
        else onExitTop?.();
        break;
      }
      case "ArrowRight": {
        if (!node.children) break;
        if (!isExpanded) {
          setExpanded(node.id, true);
          break;
        }

        const [firstChild] = node.children;
        if (firstChild) moveTo(firstChild.id);
        break;
      }
      case "ArrowLeft": {
        if (node.children && isExpanded) {
          setExpanded(node.id, false);
          break;
        }

        if (current.parentId) moveTo(current.parentId);
        break;
      }
      case "Home":
        moveTo(visibleIds[0]);
        break;
      case "End":
        moveTo(visibleIds[visibleIds.length - 1]);
        break;
      case "Enter":
      case " ":
        activate(node);
        break;
      case "*":
        expandSiblings(current);
        break;
      default: {
        const isPrintable = e.key.length === 1 && !e.metaKey && !e.ctrlKey;
        if (!isPrintable) return;

        const match = roving.matchTypeahead(e.key, index);
        if (match) moveTo(match);
      }
    }

    e.preventDefault();
  };

  const renderNodes = (list: TreeNode<T>[], level: number) =>
    list.map((node, index) => {
      const isExpanded = !!node.children && expandedIds.has(node.id);
      const isSelected = node.id === selectedId;

      return (
        <li
          key={node.id}
          {...roving.itemProps(node.id)}
          role="treeitem"
          aria-level={level}
          aria-setsize={list.length}
          aria-posinset={index + 1}
          aria-expanded={node.children ? isExpanded : undefined}
          aria-selected={isSelected}
          className="outline-none"
        >
          <div
            data-row
            data-focused={roving.isFocusVisible(node.id) ? "" : undefined}
            onClick={() => {
              focus(node.id);
              activate(node);
            }}
            style={{ paddingLeft: ROW_PADDING_PX + (level - 1) * INDENT_PX }}
            className={cn(
              "flex cursor-pointer items-center gap-1 rounded-md py-1.5 pr-2 text-xs transition-colors select-none hover:bg-accent/60",
              FOCUSED_ROW_CLASS,
              isSelected && "bg-accent hover:bg-accent",
            )}
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                isExpanded && "rotate-90",
                !node.children && "invisible",
              )}
            />
            {renderNode(node, { level, isExpanded, isSelected })}
          </div>

          <AnimatePresence initial={false}>
            {isExpanded && node.children && (
              <motion.ul
                role="group"
                className="flex flex-col gap-px overflow-hidden"
                initial={animate ? { height: 0, opacity: 0 } : false}
                animate={{ height: "auto", opacity: 1 }}
                exit={animate ? { height: 0, opacity: 0 } : undefined}
                transition={GROUP_TRANSITION}
              >
                {renderNodes(node.children, level + 1)}
              </motion.ul>
            )}
          </AnimatePresence>
        </li>
      );
    });

  return (
    <ul
      role="tree"
      {...aria}
      onKeyDown={handleKeyDown}
      {...roving.containerProps}
      className={cn("flex flex-col gap-px", className)}
    >
      {renderNodes(nodes, 1)}
    </ul>
  );
}
