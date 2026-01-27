import { invoke } from "@tauri-apps/api/core";
import { type Event, listen } from "@tauri-apps/api/event";
import type {
  AuthenticatedPayload,
  FileRequest,
  FindPullRequestsFilter,
  FindWorkflowsRequest,
  RunWorkflowRequest,
  settings,
  ThemeChangedPayload,
  WorkflowInput,
  Workflows,
} from "./models";
import type { GraphQLResponse, RestResponse } from "./models/api";
import type { ResponseData as FindRepositoriesResponse } from "./models/find-repositories";
import type { FindRepositoriesRequest } from "./models/graphql";
import type { ResponseData as HomepageResponse } from "./models/homepage";
import type { ResponseData as SearchPullRequestsResponse } from "./models/search-pull-request";
import { AppUpdate } from "./models/updater";
import type {
  ResponseData as UserProfileResponse,
  UserProfileViewer,
} from "./models/user-profile";

function authenticate(token: string) {
  return invoke<GraphQLResponse<UserProfileResponse>>("authenticate", {
    token,
  });
}

function isAuthenticated() {
  return invoke<UserProfileViewer>("is_authenticated");
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
  return invoke<string>("get_token");
}

function restartApp() {
  return invoke<void>("restart_app");
}

export default {
  authenticate,
  homepage,
  isAuthenticated,
  findPullRequests,
  findRepositories,
  isAutoStartEnabled,
  enableAutoStart,
  disableAutoStart,
  showCurrentWindow,
  startAuthFlow,
  onAuthMessage,
  onAppUpdated,
  onThemeChanged,
  findWorkflows,
  extractWorkflowVariables,
  runWorkflow,
  updateSetting,
  getSettings,
  monitorPullRequests,
  stopMonitoring,
  replaceGlobalShortcut,
  getToken,
  restartApp,
};
