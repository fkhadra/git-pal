import { cn } from "cn";
import {
  Folder,
  FolderOpen,
  List,
  ListTree,
  MessageSquare,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { ListView } from "~/components/list-view";
import { TreeView, type TreeNode } from "~/components/tree-view";
import { Button } from "~/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { ancestorIds, buildPathTree, folderIds } from "~/libs/path-tree";
import type { PullRequestFile } from "~/models";
import type { ReviewComment } from "~/models/code-review";

import { type FileView, store, useCodeReviewSnapshot } from "./store";
import { severityConfig } from "./ReviewCommentWidget";
import { getFileStatusColor, getFileStatusIcon } from "./utils";

const FILES_FOCUS_TARGET =
  '[role="treeitem"][tabindex="0"], [role="option"][tabindex="0"]';

// Past this, folders open and close without animating
const MAX_ANIMATED_FILES = 500;

interface DiffFileTreeProps {
  files: PullRequestFile[];
  /** Before the owner filter */
  totalFiles: number;
  /** `null` without a CODEOWNERS file */
  ownedFiles: Set<string> | null;
  selectedFile: string | null;
  onSelectFile: (filename: string) => void;
  fileComments: Map<string, ReviewComment[]>;
  viewedFiles: Set<string>;
  additions: number;
  deletions: number;
  searchRef?: React.Ref<HTMLInputElement>;
}

export function fileTree(files: PullRequestFile[]) {
  return buildPathTree(files, (f) => f.filename);
}

export function DiffFileTree({
  files,
  totalFiles,
  ownedFiles,
  selectedFile,
  onSelectFile,
  fileComments,
  viewedFiles,
  additions,
  deletions,
  searchRef,
}: DiffFileTreeProps) {
  const { fileView, isOwnedOnly } = useCodeReviewSnapshot();
  const fileCount =
    files.length === totalFiles ? totalFiles : `${files.length}/${totalFiles}`;
  const [filter, setFilter] = useState("");
  const query = filter.trim().toLowerCase();
  const visibleFiles = useMemo(() => {
    if (!query) return files;

    return files.filter((f) => f.filename.toLowerCase().includes(query));
  }, [files, query]);

  const filesRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const focusSearch = () =>
    searchBoxRef.current?.querySelector("input")?.focus();

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setFilter("");
    if (e.key !== "ArrowDown") return;

    e.preventDefault();
    filesRef.current?.querySelector<HTMLElement>(FILES_FOCUS_TARGET)?.focus();
  };

  const fileContent = (file: PullRequestFile, label: string) => (
    <FileContent
      file={file}
      label={label}
      isViewed={viewedFiles.has(file.filename)}
      comments={fileComments.get(file.filename) ?? []}
    />
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-4 text-xs font-medium tracking-wide text-muted-foreground">
        <span className="uppercase">Files changed ({fileCount})</span>
        <FileViewToggle value={fileView} />
        <span className="ml-auto font-mono text-success">+{additions}</span>
        <span className="font-mono text-destructive">-{deletions}</span>
      </div>
      <div
        ref={searchBoxRef}
        className="flex shrink-0 items-center gap-1 px-2 pt-2"
      >
        <InputGroup className="h-7">
          <InputGroupAddon align="inline-start">
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search files..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="text-xs"
          />
          {filter && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" onClick={() => setFilter("")}>
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        {ownedFiles && <OwnedToggle isActive={isOwnedOnly} />}
      </div>
      <div
        ref={filesRef}
        className="flex flex-1 flex-col gap-px overflow-y-auto p-2"
      >
        {visibleFiles.length === 0 && (
          <p className="p-2 text-center text-xs text-muted-foreground">
            {query ? "No matching files" : "No files owned by you"}
          </p>
        )}

        {fileView === "tree" && (
          <FileTreeView
            files={visibleFiles}
            query={query}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            renderFile={fileContent}
            onExitTop={focusSearch}
          />
        )}

        {fileView === "list" && (
          <ListView
            aria-label="Files changed"
            items={visibleFiles}
            getId={(file) => file.filename}
            getLabel={(file) => file.filename}
            selectedId={selectedFile}
            onSelect={(file) => onSelectFile(file.filename)}
            renderItem={(file) => fileContent(file, file.filename)}
            onExitTop={focusSearch}
            selectionFollowsFocus
          />
        )}
      </div>
    </div>
  );
}

function FileViewToggle({ value }: { value: FileView }) {
  const isTree = value === "tree";

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      title={isTree ? "Show as list" : "Show as tree"}
      aria-label={isTree ? "Show as list" : "Show as tree"}
      onClick={() => store.setFileView(isTree ? "list" : "tree")}
    >
      {isTree ? <List /> : <ListTree />}
    </Button>
  );
}

function OwnedToggle({ isActive }: { isActive: boolean }) {
  const label = isActive ? "Show all files" : "Only files owned by me";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={isActive ? "secondary" : "ghost"}
            size="icon-xs"
            aria-label={label}
            aria-pressed={isActive}
            onClick={store.toggleOwnedOnly}
          >
            <UserRound />
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function FileContent({
  file,
  label,
  isViewed,
  comments,
}: {
  file: PullRequestFile;
  label: string;
  isViewed: boolean;
  comments: ReviewComment[];
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        isViewed && "opacity-50",
      )}
    >
      <span
        className={cn(
          "shrink-0 font-mono text-[10px] font-bold",
          getFileStatusColor(file.status),
        )}
      >
        {getFileStatusIcon(file.status)}
      </span>
      <span className="min-w-0 truncate" title={file.filename}>
        {label}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[10px]">
        {file.additions > 0 && (
          <span className="text-success">+{file.additions}</span>
        )}
        {file.deletions > 0 && (
          <span className="text-destructive">-{file.deletions}</span>
        )}
      </span>
      {comments.length > 0 && <CommentCount comments={comments} />}
    </span>
  );
}

type Severity = keyof typeof severityConfig;

const SEVERITIES: Severity[] = ["error", "warning", "info", "user"];

function severityLabel(severity: Severity, count: number) {
  const label = severityConfig[severity].label.toLowerCase();
  if (count === 1 || severity === "info") return label;

  return `${label}s`;
}

function CommentCount({ comments }: { comments: ReviewComment[] }) {
  const counts = SEVERITIES.map((severity) => ({
    severity,
    count: comments.filter((c) => c.severity === severity).length,
  })).filter(({ count }) => count > 0);

  const worst = counts[0]?.severity ?? "info";
  const summary = counts
    .map(({ severity, count }) => `${count} ${severityLabel(severity, count)}`)
    .join(" · ");

  return (
    <span
      title={summary}
      className={cn(
        "flex shrink-0 items-center gap-0.5 font-mono text-[10px]",
        severityConfig[worst].text,
      )}
    >
      <MessageSquare className="size-3" />
      {comments.length}
    </span>
  );
}

function without(ids: Set<string>, removed: string[]) {
  return new Set([...ids].filter((id) => !removed.includes(id)));
}

function FileTreeView({
  files,
  query,
  selectedFile,
  onSelectFile,
  renderFile,
  onExitTop,
}: {
  files: PullRequestFile[];
  query: string;
  selectedFile: string | null;
  onSelectFile: (filename: string) => void;
  renderFile: (file: PullRequestFile, label: string) => React.ReactNode;
  onExitTop: () => void;
}) {
  const tree = useMemo(() => fileTree(files), [files]);
  const folders = useMemo(() => folderIds(tree), [tree]);
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const [searchCollapsed, setSearchCollapsed] = useState(new Set<string>());
  const [searchedQuery, setSearchedQuery] = useState(query);

  if (query !== searchedQuery) {
    setSearchedQuery(query);
    setSearchCollapsed(new Set());
  }

  const currentCollapsed = query ? searchCollapsed : collapsed;
  const setCurrentCollapsed = query ? setSearchCollapsed : setCollapsed;

  // a file picked elsewhere, e.g. the next file shortcut, gets its folders opened
  const [revealedFile, setRevealedFile] = useState(selectedFile);
  if (selectedFile !== revealedFile) {
    setRevealedFile(selectedFile);

    const ancestors = selectedFile ? ancestorIds(tree, selectedFile) : [];
    if (ancestors.some((id) => currentCollapsed.has(id))) {
      setCurrentCollapsed(without(currentCollapsed, ancestors));
    }
  }

  const expandedIds = useMemo(
    () => new Set(folders.filter((id) => !currentCollapsed.has(id))),
    [folders, currentCollapsed],
  );

  const renderNode = (
    node: TreeNode<PullRequestFile>,
    { isExpanded }: { isExpanded: boolean },
  ) => {
    if (node.data) return renderFile(node.data, node.label);

    const FolderIcon = isExpanded ? FolderOpen : Folder;

    return (
      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <FolderIcon className="size-3.5 shrink-0" />
        <span className="truncate" title={node.label}>
          {node.label}
        </span>
      </span>
    );
  };

  return (
    <TreeView
      aria-label="Files changed"
      nodes={tree}
      expandedIds={expandedIds}
      onExpandedChange={(ids) =>
        setCurrentCollapsed(new Set(folders.filter((id) => !ids.has(id))))
      }
      selectedId={selectedFile}
      onSelect={(node) => node.data && onSelectFile(node.data.filename)}
      renderNode={renderNode}
      animate={files.length <= MAX_ANIMATED_FILES}
      onExitTop={onExitTop}
      selectionFollowsFocus
    />
  );
}
