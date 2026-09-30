import { openUrl } from "@tauri-apps/plugin-opener";
import { cn } from "cn";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  TriangleAlert,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";

import "react-diff-view/style/index.css";
import { AgentAvatar } from "~/components/agent-avatar";
import { ShortcutTooltip } from "~/components/shortcut-tooltip";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { AgentPanel, agentStore } from "~/features/agent";
import { TemplateManager } from "~/features/templates/TemplateManager";
import { useWindowReady } from "~/hooks";
import type { CommentContext, PullRequestFile } from "~/models";
import type { ReviewComment } from "~/models/code-review";

import { ConversationSheet } from "./ConversationSheet";
import {
  useCodeReviewQuery,
  useConversationQuery,
  useIsReviewing,
  useSaveCommentsMutation,
  useSetFileViewedMutation,
  useViewedFilesQuery,
} from "./data-loader";
import { DiffErrorBoundary } from "./DiffErrorBoundary";
import { DiffFileTree } from "./DiffFileTree";
import { DiffFind } from "./DiffFind";
import { DiffViewer, type NewComment } from "./DiffViewer";

import "./pr-review.css";
import { PullRequestAuthor } from "./PullRequestAuthor";
import { PullRequestStatusBadge } from "./PullRequestStatusBadge";
import { RefreshPullRequestButton } from "./RefreshPullRequestButton";
import { ReviewActionsMenu } from "./ReviewActionsMenu";
import { ReviewEmptyState } from "./ReviewEmptyState";
import { CancelReviewButton, ReviewPrimaryAction } from "./ReviewJobActions";
import { ReviewList } from "./ReviewList";
import { ReviewStatusSelector } from "./ReviewStatusSelector";
import { ReviewSummarySheet } from "./ReviewSummarySheet";
import { ReviewUpdateBanner } from "./ReviewUpdateBanner";
import { matchShortcut, useKeybind, useKeybindSync } from "./shortcuts";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { store, useCodeReviewSnapshot } from "./store";
import { useAgentEvent } from "./useAgentEvent";
import { useRefreshPullRequest } from "./useRefreshPullRequest";
import { buildThreads, reviewCommentContext, threadContext } from "./utils";
import { ViewedProgress } from "./ViewedProgress";

const PANEL_ANIMATION_MS = 200;
const AGENT_PANEL_SIZE = "28%";
const NARROW_DIFF_PX = 675;

export function ReviewPage() {
  useWindowReady();
  useAgentEvent();
  useKeybindSync();

  const reviewsPanelRef = useRef<PanelImperativeHandle>(null);
  const agentPanelRef = useRef<PanelImperativeHandle>(null);
  const [showList, setShowList] = useState(true);
  const [showAgent, setShowAgent] = useState(false);
  const [isAddingFileComment, setIsAddingFileComment] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // bumped on each find shortcut, refocuses an already open find bar
  const [findKey, setFindKey] = useState<number | null>(null);
  const snapshot = useCodeReviewSnapshot();
  const keybind = useKeybind();
  const selectedFile = snapshot.selectedFile;
  const selectedReview = snapshot.selectedReview;
  const isReviewing = useIsReviewing(selectedReview);
  const { handleRefresh } = useRefreshPullRequest();

  const [diffQuery, detailsQuery, savedReviewQuery] =
    useCodeReviewQuery(selectedReview);
  const { mutateAsync: saveComment } = useSaveCommentsMutation();
  const viewedQuery = useViewedFilesQuery(selectedReview);
  const { mutate: setFileViewed } = useSetFileViewedMutation();
  const diffViewerRef = useRef<HTMLDivElement>(null);
  const fileSearchRef = useRef<HTMLInputElement>(null);

  const observeDiffWidth = useCallback((element: HTMLDivElement | null) => {
    diffViewerRef.current = element;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) =>
      store.fitViewType(entry.contentRect.width < NARROW_DIFF_PX),
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const files = diffQuery.data?.files ?? [];
  const currentFile =
    files.find((f) => f.filename === selectedFile) ?? files[0];

  if (files.length > 0 && !selectedFile && !diffQuery.isFetching) {
    store.selectFile(files[0].filename);
  }

  const conversation = useConversationQuery(selectedReview).data;

  // once GitHub threads are loaded, posted comments show up there instead
  const commentsForCurrentFile = useMemo(
    () =>
      savedReviewQuery.data?.comments.filter(
        (c) =>
          currentFile &&
          c.file === currentFile.filename &&
          !(conversation && c.posted),
      ),
    [savedReviewQuery, currentFile, conversation],
  );

  const threadsForCurrentFile = useMemo(
    () =>
      buildThreads(
        (conversation?.inlineComments ?? []).filter(
          (c) => c.path === currentFile?.filename,
        ),
      ),
    [conversation, currentFile],
  );

  const reviewedFiles = useMemo(
    () => new Set(savedReviewQuery.data?.comments.map((c) => c.file)),
    [savedReviewQuery],
  );

  // a file viewed at another sha changed since, it needs another look
  const viewedFiles = useMemo(() => {
    const prFiles = diffQuery.data?.files ?? [];
    const viewed = (viewedQuery.data ?? []).filter((v) =>
      prFiles.some((f) => f.filename === v.filename && f.sha === v.sha),
    );

    return new Set(viewed.map((v) => v.filename));
  }, [diffQuery.data, viewedQuery.data]);

  const saveComments = async (comments: ReviewComment[]) => {
    if (!selectedReview) return;

    try {
      await saveComment({ currentReview: selectedReview, comments });
    } catch (error) {
      console.error("Unable to save comment: ", error);
    }
  };

  const handleAddComment = ({ file, line, startLine, comment }: NewComment) => {
    if (!savedReviewQuery.data) return;

    saveComments([
      ...savedReviewQuery.data.comments,
      {
        file,
        line,
        startLine,
        severity: "user",
        comment,
        publish: false,
        posted: false,
      },
    ]);
  };

  const handleUpdateComment = (
    comment: ReviewComment,
    patch: Partial<ReviewComment>,
  ) => {
    if (!savedReviewQuery.data) return;

    saveComments(
      savedReviewQuery.data.comments.map((c) =>
        c === comment ? { ...c, ...patch } : c,
      ),
    );
  };

  const handleDeleteComment = (comment: ReviewComment) => {
    if (!savedReviewQuery.data) return;

    saveComments(savedReviewQuery.data.comments.filter((c) => c !== comment));
  };

  const currentFileIndex = files.findIndex(
    (f) => f.filename === currentFile?.filename,
  );

  function navigateFile(direction: -1 | 1) {
    const nextIndex = currentFileIndex + direction;
    if (nextIndex < 0 || nextIndex >= files.length) return;

    selectFile(files[nextIndex].filename);
  }

  function selectFile(filename: string) {
    setIsAddingFileComment(false);
    store.selectFile(filename);
    diffViewerRef.current?.scrollTo(0, 0);
  }

  function nextUnviewedFile(from: number) {
    const ordered = [...files.slice(from + 1), ...files.slice(0, from)];

    return ordered.find((f) => !viewedFiles.has(f.filename));
  }

  function handleViewedChange(file: PullRequestFile, viewed: boolean) {
    if (!selectedReview) return;

    setFileViewed({
      owner: selectedReview.owner,
      repository: selectedReview.repository,
      prNumber: selectedReview.prNumber,
      filename: file.filename,
      sha: file.sha,
      viewed,
    });

    if (!viewed) return;

    const next = nextUnviewedFile(files.indexOf(file));
    if (next) selectFile(next.filename);
  }

  /** Expands to `size` when given, otherwise to the panel's previous size. */
  function togglePanel(panel: PanelImperativeHandle | null, size?: string) {
    if (!panel) return;

    setIsAnimating(true);
    if (!panel.isCollapsed()) panel.collapse();
    else if (size) panel.resize(size);
    else panel.expand();
    setTimeout(() => setIsAnimating(false), PANEL_ANIMATION_MS);
  }

  // the agent works on a reviewed pull request
  const isReviewed = !!savedReviewQuery.data?.reviewed;

  useEffect(() => {
    const panel = agentPanelRef.current;
    if (!isReviewed && panel && !panel.isCollapsed()) panel.collapse();
  }, [isReviewed]);

  const toggleReviewsPanel = () => togglePanel(reviewsPanelRef.current);
  const toggleAgentPanel = () =>
    togglePanel(agentPanelRef.current, AGENT_PANEL_SIZE);

  function askAgent(item: CommentContext) {
    agentStore.addContext(item);
    if (agentPanelRef.current?.isCollapsed()) toggleAgentPanel();
  }

  // posted comments show up as GitHub threads once those are loaded
  const agentComments = useMemo(() => {
    const aiComments = (savedReviewQuery.data?.comments ?? [])
      .filter((c) => !(conversation && c.posted))
      .map(reviewCommentContext);
    const threads = buildThreads(conversation?.inlineComments ?? []);

    return [...aiComments, ...threads.map(threadContext)];
  }, [savedReviewQuery.data, conversation]);

  const agentPr = useMemo(
    () =>
      selectedReview && {
        owner: selectedReview.owner,
        repository: selectedReview.repository,
        prNumber: selectedReview.prNumber,
      },
    [selectedReview],
  );
  const filenames = useMemo(
    () => (diffQuery.data?.files ?? []).map((f) => f.filename),
    [diffQuery.data],
  );

  const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
    // already handled, e.g. ⌘B formatting in a text editor
    if (e.defaultPrevented) return;

    const action = matchShortcut(e);
    if (!action) return;

    e.preventDefault();

    switch (action) {
      case "toggleReviews":
        toggleReviewsPanel();
        break;
      case "toggleAgent":
        if (isReviewed) toggleAgentPanel();
        break;
      case "refresh":
        handleRefresh();
        break;
      case "toggleViewType":
        store.toggleViewType();
        break;
      case "nextFile":
        navigateFile(1);
        break;
      case "previousFile":
        navigateFile(-1);
        break;
      case "toggleSubmit":
        if (savedReview && pr && !isReviewing) {
          store.setSubmitOpen(!snapshot.isSubmitOpen);
        }
        break;
      case "openPullRequest":
        if (pr) openUrl(pr.htmlUrl);
        break;
      case "showShortcuts":
        setShowShortcuts((open) => !open);
        break;
      case "findInDiff":
        if (currentFile) setFindKey((key) => (key ?? 0) + 1);
        break;
      case "findFile":
        fileSearchRef.current?.focus();
        fileSearchRef.current?.select();
        break;
    }
  });

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isLoading =
    diffQuery.isLoading || detailsQuery.isLoading || savedReviewQuery.isLoading;
  const pr = detailsQuery.data;
  const savedReview = savedReviewQuery.data;

  return (
    <div
      data-with-decoration
      className="flex h-screen flex-col bg-sidebar text-foreground"
    >
      {/* Top bar */}
      <div className="flex flex-col gap-1 px-3 py-2">
        <div className="flex items-center gap-3">
          <ShortcutTooltip
            label={showList ? "Hide reviews" : "Show reviews"}
            shortcut={keybind.toggleReviews}
          >
            <Button variant="ghost" size="icon-sm" onClick={toggleReviewsPanel}>
              {showList ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
          </ShortcutTooltip>

          {pr && (
            <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
              <span className="truncate">{pr.title}</span>
              <span className="shrink-0 text-muted-foreground">
                (
                <ShortcutTooltip
                  label="Open on GitHub"
                  shortcut={keybind.openPullRequest}
                >
                  <Button
                    variant="link"
                    size="xs"
                    className="h-auto px-0 text-sm"
                    onClick={() => openUrl(pr.htmlUrl)}
                  >
                    #{selectedReview?.prNumber}
                  </Button>
                </ShortcutTooltip>
                )
              </span>
              {selectedReview && (
                <PullRequestStatusBadge review={selectedReview} />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-1">
          {pr && selectedReview && (
            <PullRequestAuthor
              review={selectedReview}
              headRef={pr.headRef}
              baseRef={pr.baseRef}
            />
          )}
          {pr && (
            <>
              <ViewedProgress viewed={viewedFiles.size} total={files.length} />
              <ShortcutTooltip
                label="Previous file"
                shortcut={keybind.previousFile}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => navigateFile(-1)}
                  disabled={currentFileIndex <= 0}
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </ShortcutTooltip>
              <span className="min-w-[4ch] text-center text-xs text-muted-foreground">
                {currentFileIndex + 1}/{files.length}
              </span>
              <ShortcutTooltip label="Next file" shortcut={keybind.nextFile}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => navigateFile(1)}
                  disabled={currentFileIndex >= files.length - 1}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </ShortcutTooltip>
              <HeaderDivider />
              <RefreshPullRequestButton />
              <ConversationSheet
                conversation={conversation}
                description={pr.body}
              />
              {savedReview?.summary && (
                <ReviewSummarySheet key={savedReview.id} review={savedReview} />
              )}
              {savedReview && (
                <ReviewStatusSelector
                  key={`${savedReview.id}-${savedReview.status}`}
                  initialStatus={savedReview.status}
                />
              )}
              <HeaderDivider />
              <ReviewPrimaryAction
                review={savedReview}
                commitId={pr.headSha}
                isReviewing={isReviewing}
              />
              {isReviewing && selectedReview && (
                <CancelReviewButton review={selectedReview} />
              )}
            </>
          )}

          {isReviewed && (
            <ShortcutTooltip label="Agent" shortcut={keybind.toggleAgent}>
              <Button
                variant={showAgent ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={toggleAgentPanel}
              >
                <AgentAvatar size={18} paused={showAgent} />
              </Button>
            </ShortcutTooltip>
          )}
          {selectedReview && <ReviewActionsMenu review={selectedReview} />}
        </div>
      </div>

      {/* Content */}
      <ResizablePanelGroup
        className={cn(
          "min-h-0 flex-1",
          isAnimating &&
          "*:data-panel:transition-[flex-basis,flex-grow,flex-shrink] *:data-panel:duration-200 *:data-panel:ease-in-out",
        )}
        orientation="horizontal"
      >
        {/* Collapsible reviews panel */}
        <ResizablePanel
          panelRef={reviewsPanelRef}
          defaultSize="20%"
          minSize="15%"
          collapsible
          collapsedSize={0}
          onResize={(size) => setShowList(size.asPercentage > 0)}
        >
          <div className="h-full pr-1 pb-2 pl-2">
            <div className="h-full overflow-hidden rounded-xl border bg-background shadow-sm">
              <ReviewList />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-transparent" />

        {/* Main content area */}
        <ResizablePanel defaultSize="80%" minSize="30%" className="px-1 pb-2">
          <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
            {isLoading && <ReviewSkeleton />}

            {diffQuery.error && (
              <div className="flex flex-1 items-center justify-center text-sm text-destructive">
                Failed to load diff: {String(diffQuery.error)}
              </div>
            )}

            {!isLoading && selectedReview == null && <ReviewEmptyState />}

            {!isLoading && savedReview && pr && (
              <ReviewUpdateBanner
                review={savedReview}
                headSha={pr.headSha}
                isReviewing={isReviewing}
              />
            )}

            {!isLoading && savedReview?.warning && (
              <div className="flex items-center gap-2 border-b bg-warning/10 px-4 py-2 text-sm">
                <TriangleAlert className="size-4 shrink-0 text-warning" />
                {savedReview.warning}
              </div>
            )}

            {!isLoading && diffQuery.data && files.length > 0 && (
              <ResizablePanelGroup className="flex-1" orientation="horizontal">
                <ResizablePanel defaultSize="25%" minSize="10%">
                  <DiffFileTree
                    files={files}
                    selectedFile={currentFile?.filename ?? null}
                    onSelectFile={selectFile}
                    reviewedFiles={reviewedFiles}
                    viewedFiles={viewedFiles}
                    additions={diffQuery.data?.totalAdditions ?? 0}
                    deletions={diffQuery.data?.totalDeletions ?? 0}
                    searchRef={fileSearchRef}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="75%" className="relative">
                  {findKey !== null && (
                    <DiffFind
                      containerRef={diffViewerRef}
                      focusKey={findKey}
                      onClose={() => setFindKey(null)}
                    />
                  )}
                  <div ref={observeDiffWidth} className="h-full overflow-auto">
                    {currentFile && selectedReview && pr && (
                      <>
                        <div className="sticky top-0 z-10 flex h-9 items-center gap-2 border-b bg-background/90 px-4 text-xs backdrop-blur">
                          <span className="font-mono font-medium">
                            {currentFile.filename}
                          </span>
                          <span className="font-mono text-muted-foreground">
                            +{currentFile.additions} -{currentFile.deletions}
                          </span>
                          <label className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                            <Checkbox
                              checked={viewedFiles.has(currentFile.filename)}
                              onCheckedChange={(checked) =>
                                handleViewedChange(currentFile, checked)
                              }
                            />
                            Viewed
                          </label>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={!savedReview}
                                  onClick={() => setIsAddingFileComment(true)}
                                >
                                  <MessageSquarePlus />
                                </Button>
                              }
                            />
                            <TooltipContent>
                              Comment on this file
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        <DiffErrorBoundary
                          key={currentFile.filename}
                          filename={currentFile.filename}
                        >
                          <DiffViewer
                            owner={selectedReview.owner}
                            repository={selectedReview.repository}
                            headSha={pr.headSha}
                            file={currentFile}
                            rawDiff={diffQuery.data.rawDiff}
                            viewType={snapshot.viewType}
                            comments={commentsForCurrentFile || []}
                            threads={threadsForCurrentFile}
                            isAddingFileComment={isAddingFileComment}
                            onCloseFileComment={() =>
                              setIsAddingFileComment(false)
                            }
                            onAddComment={handleAddComment}
                            onDeleteComment={handleDeleteComment}
                            onUpdateComment={handleUpdateComment}
                            onAskAgent={isReviewed ? askAgent : undefined}
                          />
                        </DiffErrorBoundary>
                      </>
                    )}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-transparent" />

        {/* Collapsible agent panel, hidden by default */}
        <ResizablePanel
          panelRef={agentPanelRef}
          defaultSize="0%"
          minSize="20%"
          collapsible
          collapsedSize={0}
          onResize={(size) => setShowAgent(size.asPercentage > 0)}
        >
          <div className="h-full pr-2 pb-2 pl-1">
            <div className="h-full overflow-hidden rounded-xl border bg-background shadow-sm">
              <AgentPanel
                pr={agentPr}
                prTitle={pr?.title}
                files={filenames}
                comments={agentComments}
                currentFile={currentFile?.filename}
                disabled={isReviewing}
                onClose={toggleAgentPanel}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <TemplateManager />
    </div>
  );
}

/** Separates the header's groups: files, pull request state, actions. */
function HeaderDivider() {
  return (
    <Separator
      orientation="vertical"
      className="mx-1 h-4 data-vertical:self-center"
    />
  );
}

function ReviewSkeleton() {
  return (
    <div className="flex flex-1">
      {/* File tree skeleton */}
      <div className="flex w-1/4 flex-col gap-2 border-r p-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="size-4 shrink-0" />
            <Skeleton
              className="h-4"
              style={{ width: `${55 + ((i * 17) % 35)}%` }}
            />
          </div>
        ))}
      </div>
      {/* Diff viewer skeleton */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex flex-col gap-1 p-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-4"
              style={{ width: `${30 + ((i * 23) % 60)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
