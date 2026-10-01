import { Channel, invoke } from "@tauri-apps/api/core";
import { type Event, listen } from "@tauri-apps/api/event";
import { useEffect, useEffectEvent } from "react";

import type {
  AuthenticatedPayload,
  CommitComparison,
  CompareCommitsRequest,
  FileSourceRequest,
  FileRequest,
  FindPullRequestsFilter,
  FindWorkflowsRequest,
  GetPullRequestRequest,
  JobMessagePayload,
  PullRequestDetails,
  PullRequestDiff,
  ReviewSelectedPayload,
  RunWorkflowRequest,
  SettingChangedPayload,
  SubmitReviewRequest,
  settings,
  ThemeChangedPayload,
  WorkflowInput,
  Workflows,
} from "./models";
import type {
  AgentEvent,
  AgentMessage,
  Conversation,
  PullRequestKey,
  SendMessageRequest,
} from "./models/agent";
import type { GraphQLResponse, RestResponse, Token } from "./models/api";
import type {
  CodeReview,
  GetSavedReviewRequest,
  ReviewListEntry,
  ReviewPullRequestRequest,
  ReviewTemplate,
  ReviewTemplateInput,
  SetFileViewedRequest,
  UpdateReviewCommentsRequest,
  UpdateReviewStatusRequest,
  ViewedFile,
} from "./models/code-review";
import type {
  DeleteCommentRequest,
  EditCommentRequest,
  PullRequestConversation,
} from "./models/conversation";
import type { NewFeedback } from "./models/feedback";
import type { ResponseData as FindRepositoriesResponse } from "./models/find-repositories";
import type { PullRequest as PullRequestWithStatus } from "./models/get-pull-request";
import type { FindRepositoriesRequest } from "./models/graphql";
import type { Harness, Model, Skill } from "./models/harness";
import type { ResponseData as HomepageResponse } from "./models/homepage";
import type { Job } from "./models/jobs";
import type { ResponseData as SearchPullRequestsResponse } from "./models/search-pull-request";
import type { EntryKind } from "./models/scope";
import { AppUpdate } from "./models/updater";
import type {
  UserProfile,
  ResponseData as UserProfileResponse,
} from "./models/user-profile";

function authenticate(token: string) {
  return invoke<GraphQLResponse<UserProfileResponse>>("authenticate", {
    token,
  });
}

function isAuthenticated() {
  return invoke<UserProfile>("is_authenticated");
}

function homepage() {
  return invoke<GraphQLResponse<HomepageResponse>>("homepage");
}

function findPullRequests(filter: FindPullRequestsFilter) {
  return invoke<GraphQLResponse<SearchPullRequestsResponse>>(
    "find_pull_requests",
    {
      filter,
    },
  );
}

function findRepositories(params: FindRepositoriesRequest) {
  return invoke<GraphQLResponse<FindRepositoriesResponse>>(
    "find_repositories",
    {
      params,
    },
  );
}

/** Rejects with a message naming the unknown owner or repository. */
function checkScopeEntry(entry: string) {
  return invoke<EntryKind>("check_scope_entry", { entry });
}

function isAutoStartEnabled() {
  return invoke<boolean>("is_autostart_enabled");
}

function enableAutoStart() {
  return invoke<void>("enable_autostart");
}

function disableAutoStart() {
  return invoke<void>("disable_autostart");
}

function showCurrentWindow() {
  return invoke<void>("show_window");
}

function startAuthFlow() {
  return invoke<void>("start_oauth_flow");
}

function onAuthMessage(cb: (event: Event<AuthenticatedPayload>) => void) {
  return listen<AuthenticatedPayload>("AuthMessage", cb);
}

function onAppUpdated(cb: (event: Event<AppUpdate>) => void) {
  return listen<AppUpdate>("UpdateInstalled", cb);
}

function onThemeChanged(cb: (event: Event<ThemeChangedPayload>) => void) {
  return listen<ThemeChangedPayload>("ThemeChanged", cb);
}

function onSettingChanged(cb: (event: Event<SettingChangedPayload>) => void) {
  return listen<SettingChangedPayload>("SettingChanged", cb);
}

function findWorkflows(params: FindWorkflowsRequest) {
  return invoke<RestResponse<Workflows>>("find_workflows", { params });
}

function extractWorkflowVariables(params: FileRequest) {
  return invoke<RestResponse<WorkflowInput[]>>("extract_workflow_variables", {
    params,
  });
}

function runWorkflow(params: RunWorkflowRequest) {
  return invoke<void>("run_workflow", { params });
}

function updateSetting(params: settings.SettingValue) {
  return invoke<settings.Settings>("update_setting", { params });
}

function getSettings() {
  return invoke<settings.Settings>("get_settings");
}

function defaultSettings() {
  return invoke<settings.Settings>("default_settings");
}

function monitorPullRequests() {
  return invoke<void>("monitor_review_requested");
}

function stopMonitoring() {
  return invoke<void>("stop_monitoring");
}

function replaceGlobalShortcut(shortcut: string) {
  return invoke<void>("replace_global_shortcut", { params: shortcut });
}

function getToken() {
  return invoke<Token>("get_token");
}

function restartApp() {
  return invoke<void>("restart_app");
}

function deleteToken() {
  return invoke<void>("delete_token");
}

function notificationAskPermission() {
  return invoke<void>("notification_ask_permissions");
}

function submitFeedback(data: NewFeedback) {
  return invoke<void>("submit_feedback", { data });
}

function reviewPullRequest(request: ReviewPullRequestRequest) {
  return invoke<string>("review_pull_request", { request });
}

function getPullRequest(request: GetPullRequestRequest) {
  return invoke<PullRequestDetails>("get_pull_request", { request });
}

function getPullRequestStatus(request: GetPullRequestRequest) {
  return invoke<PullRequestWithStatus>("get_pull_request_status", {
    request,
  });
}

function compareCommits(request: CompareCommitsRequest) {
  return invoke<CommitComparison>("compare_commits", { request });
}

function getFileSource(request: FileSourceRequest) {
  return invoke<string>("get_file_source", { request });
}

function getPullRequestDiff(request: GetPullRequestRequest) {
  return invoke<PullRequestDiff>("get_pull_request_diff", { request });
}

function getPullRequestDescription(request: GetPullRequestRequest) {
  return invoke<string | null>("get_pull_request_description", { request });
}

function getPullRequestConversation(request: GetPullRequestRequest) {
  return invoke<PullRequestConversation>("get_pull_request_conversation", {
    request,
  });
}

function editComment(request: EditCommentRequest) {
  return invoke<void>("edit_comment", { request });
}

function deleteComment(request: DeleteCommentRequest) {
  return invoke<void>("delete_comment", { request });
}

function listReviews() {
  return invoke<ReviewListEntry[]>("list_reviews");
}

function getReview(request: GetSavedReviewRequest) {
  return invoke<CodeReview>("get_review", { request });
}

function updateReviewComments(request: UpdateReviewCommentsRequest) {
  return invoke<void>("update_review_comments", { request });
}

function updateReviewStatus(request: UpdateReviewStatusRequest) {
  return invoke<void>("update_review_status", { request });
}

function deleteReview(request: GetSavedReviewRequest) {
  return invoke<void>("delete_review", { request });
}

function worktreePath(request: GetSavedReviewRequest) {
  return invoke<string>("worktree_path", { request });
}

function listEditors() {
  return invoke<string[]>("list_editors");
}

function openInEditor(request: GetSavedReviewRequest, editor: string) {
  return invoke<void>("open_in_editor", { request, editor });
}

function listViewedFiles(request: GetSavedReviewRequest) {
  return invoke<ViewedFile[]>("list_viewed_files", { request });
}

function setFileViewed(request: SetFileViewedRequest) {
  return invoke<void>("set_file_viewed", { request });
}

function submitReview(request: SubmitReviewRequest) {
  return invoke<void>("submit_review", { request });
}

function listReviewTemplates() {
  return invoke<ReviewTemplate[]>("list_review_templates");
}

function createReviewTemplate(input: ReviewTemplateInput) {
  return invoke<ReviewTemplate>("create_review_template", { input });
}

function updateReviewTemplate(id: number, input: ReviewTemplateInput) {
  return invoke<ReviewTemplate>("update_review_template", { id, input });
}

function deleteReviewTemplate(id: number) {
  return invoke<void>("delete_review_template", { id });
}

function reorderReviewTemplates(ids: number[]) {
  return invoke<void>("reorder_review_templates", { ids });
}

function builtInReviewInstructions() {
  return invoke<string>("built_in_review_instructions");
}

/** Template an automatic review would use, `null` for the built-in instructions. */
function resolveReviewTemplate(
  owner: string,
  repository: string,
  prNumber?: number,
) {
  return invoke<ReviewTemplate | null>("resolve_review_template", {
    owner,
    repository,
    prNumber,
  });
}

/** Shows a pull request in the review window without reviewing it. */
function viewPullRequest(request: GetSavedReviewRequest) {
  return invoke<void>("view_pull_request", { request });
}

function isRepositoryCloned(owner: string, repository: string) {
  return invoke<boolean>("is_repository_cloned", { owner, repository });
}

function takeRequestedReview() {
  return invoke<GetSavedReviewRequest | null>("take_requested_review");
}

function showReview(target?: GetSavedReviewRequest) {
  return invoke<void>("show_review", { target });
}

function listJobs() {
  return invoke<Job[]>("list_jobs");
}

function cancelReview(request: GetSavedReviewRequest) {
  return invoke<void>("cancel_review", { request });
}

/** Resolves with the conversation id once the agent is done. */
function agentSend(
  request: SendMessageRequest,
  onEvent: (event: AgentEvent) => void,
) {
  const channel = new Channel<AgentEvent>();
  channel.onmessage = onEvent;

  return invoke<number>("agent_send", { request, onEvent: channel });
}

function listModels(harness?: Harness) {
  return invoke<Model[]>("list_models", { harness });
}

function harnessModel(harness?: Harness) {
  return invoke<string | null>("harness_model", { harness });
}

function listSkills() {
  return invoke<Skill[]>("list_skills");
}

function agentCancel(conversationId: number) {
  return invoke<void>("agent_cancel", { conversationId });
}

function agentListConversations(request: PullRequestKey) {
  return invoke<Conversation[]>("agent_list_conversations", { request });
}

function agentMessages(conversationId: number) {
  return invoke<AgentMessage[]>("agent_messages", { conversationId });
}

function agentDeleteConversation(conversationId: number) {
  return invoke<void>("agent_delete_conversation", { conversationId });
}

function onJobMessage(cb: (event: Event<JobMessagePayload>) => void) {
  return listen<JobMessagePayload>("JobMessage", cb);
}

function onReviewSelected(cb: (event: Event<ReviewSelectedPayload>) => void) {
  return listen<ReviewSelectedPayload>("ReviewSelected", cb);
}

function useOnAuthMessage(cb: Parameters<typeof onAuthMessage>[0]) {
  const handler = useEffectEvent(cb);

  useEffect(() => {
    const listener = onAuthMessage(handler);

    return () => {
      listener.then((unsub) => unsub());
    };
  }, []);
}

export default {
  useOnAuthMessage,
  authenticate,
  homepage,
  isAuthenticated,
  findPullRequests,
  findRepositories,
  checkScopeEntry,
  isAutoStartEnabled,
  enableAutoStart,
  disableAutoStart,
  showCurrentWindow,
  startAuthFlow,
  onAuthMessage,
  onAppUpdated,
  onThemeChanged,
  onSettingChanged,
  findWorkflows,
  extractWorkflowVariables,
  runWorkflow,
  updateSetting,
  getSettings,
  defaultSettings,
  monitorPullRequests,
  stopMonitoring,
  replaceGlobalShortcut,
  getToken,
  restartApp,
  deleteToken,
  notificationAskPermission,
  submitFeedback,
  reviewPullRequest,
  getPullRequest,
  getPullRequestDiff,
  getPullRequestStatus,
  compareCommits,
  getFileSource,
  getPullRequestConversation,
  getPullRequestDescription,
  editComment,
  deleteComment,
  listReviews,
  getReview,
  updateReviewComments,
  updateReviewStatus,
  deleteReview,
  worktreePath,
  listEditors,
  openInEditor,
  listViewedFiles,
  setFileViewed,
  submitReview,
  listReviewTemplates,
  createReviewTemplate,
  updateReviewTemplate,
  deleteReviewTemplate,
  reorderReviewTemplates,
  builtInReviewInstructions,
  resolveReviewTemplate,
  listSkills,
  viewPullRequest,
  takeRequestedReview,
  isRepositoryCloned,
  showReview,
  listJobs,
  cancelReview,
  onJobMessage,
  onReviewSelected,
  agentSend,
  agentCancel,
  listModels,
  harnessModel,
  agentListConversations,
  agentMessages,
  agentDeleteConversation,
};
