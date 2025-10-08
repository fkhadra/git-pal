import { invoke } from "@tauri-apps/api/core";
import { ApiResponse } from "./models/api";
import { ResponseData as HomepageResponse } from "./models/homepage";
import {
  ResponseData as UserProfileResponse,
  UserProfileViewer,
} from "./models/user-profile";

import { Event, listen } from "@tauri-apps/api/event";

import {
  FileRequest,
  FindWorkflowsRequest,
  RunWorkflowRequest,
  WorkflowInput,
  Workflows,
} from "./models";
import { ResponseData as SearchPullRequestsResponse } from "./models/search-pull-request";

function authenticate(token: string) {
  return invoke<ApiResponse<UserProfileResponse>>("authenticate", { token });
}

function isAuthenticated() {
  return invoke<UserProfileViewer>("is_authenticated");
}

function homepage() {
  return invoke<ApiResponse<HomepageResponse>>("homepage");
}

function searchPullRequests(filter: "mentions" | "review-requested") {
  return invoke<ApiResponse<SearchPullRequestsResponse>>(
    "search_pull_requests",
    {
      filter,
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

interface AuthMessage {
  msg?: string;
  ok: boolean;
}

function onAuthMessage(cb: (event: Event<AuthMessage>) => void) {
  return listen<AuthMessage>("AuthMessage", cb);
}

function findWorkflows(params: FindWorkflowsRequest) {
  return invoke<ApiResponse<Workflows>>("find_workflows", { params });
}

function extractWorkflowVariables(params: FileRequest) {
  return invoke<ApiResponse<WorkflowInput[]>>("extract_workflow_variables", {
    params,
  });
}

function runWorkflow(params: RunWorkflowRequest) {
  return invoke<void>("run_workflow", { params });
}

export default {
  authenticate,
  homepage,
  isAuthenticated,
  searchPullRequests,
  isAutoStartEnabled,
  enableAutoStart,
  disableAutoStart,
  showCurrentWindow,
  startAuthFlow,
  onAuthMessage,

  findWorkflows,
  extractWorkflowVariables,
  runWorkflow,
};
