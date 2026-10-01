import type { TreeNode } from "~/components/tree-view";

const SEPARATOR = "/";
const FOLDER_PREFIX = "folder:";

interface Folder<T> {
  folders: Map<string, Folder<T>>;
  items: { name: string; item: T }[];
}

function emptyFolder<T>(): Folder<T> {
  return { folders: new Map(), items: [] };
}

function compareNames(a: string, b: string) {
  return a.localeCompare(b);
}

function toNodes<T>(folder: Folder<T>, path: string): TreeNode<T>[] {
  const folders = [...folder.folders.entries()]
    .sort(([a], [b]) => compareNames(a, b))
    .map(([name, child]) => toFolderNode(child, name, `${path}${name}`));

  const items = [...folder.items]
    .sort((a, b) => compareNames(a.name, b.name))
    .map(({ name, item }) => ({
      id: `${path}${name}`,
      label: name,
      data: item,
    }));

  return [...folders, ...items];
}

function toFolderNode<T>(
  folder: Folder<T>,
  label: string,
  path: string,
): TreeNode<T> {
  const [only] = folder.folders.entries();
  const isChain = folder.items.length === 0 && folder.folders.size === 1;

  if (isChain) {
    const [name, child] = only;
    return toFolderNode(
      child,
      `${label}${SEPARATOR}${name}`,
      `${path}${SEPARATOR}${name}`,
    );
  }

  return {
    id: `${FOLDER_PREFIX}${path}`,
    label,
    children: toNodes(folder, `${path}${SEPARATOR}`),
  };
}

export function buildPathTree<T>(
  items: T[],
  getPath: (item: T) => string,
): TreeNode<T>[] {
  const root = emptyFolder<T>();

  for (const item of items) {
    const parts = getPath(item).split(SEPARATOR);
    const name = parts.pop() ?? "";

    let folder = root;
    for (const part of parts) {
      let child = folder.folders.get(part);
      if (!child) {
        child = emptyFolder();
        folder.folders.set(part, child);
      }

      folder = child;
    }

    folder.items.push({ name, item });
  }

  return toNodes(root, "");
}

export function treeItems<T>(nodes: TreeNode<T>[]): T[] {
  return nodes.flatMap((node) => {
    if (node.children) return treeItems(node.children);
    if (node.data === undefined) return [];

    return [node.data];
  });
}

export function folderIds<T>(nodes: TreeNode<T>[]): string[] {
  return nodes.flatMap((node) => {
    if (!node.children) return [];

    return [node.id, ...folderIds(node.children)];
  });
}

export function ancestorIds<T>(nodes: TreeNode<T>[], id: string): string[] {
  for (const node of nodes) {
    if (node.id === id) return [];
    if (!node.children) continue;

    const path = ancestorIds(node.children, id);
    const isInside = path.length > 0 || node.children.some((c) => c.id === id);
    if (isInside) return [node.id, ...path];
  }

  return [];
}
