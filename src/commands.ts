import { invoke } from "@tauri-apps/api/core";
import { type Event, listen } from "@tauri-apps/api/event";
import type {
	AuthenticatedPayload,
	FileRequest,
	FindWorkflowsRequest,
	RunWorkflowRequest,
	settings,
	ThemeChangedPayload,
	WorkflowInput,
	Workflows,
} from "./models";
import type { ApiResponse } from "./models/api";
import type { ResponseData as FindRepositoriesResponse } from "./models/find-repositories";
import type { FindRepositoriesRequest } from "./models/graphql";
import type { ResponseData as HomepageResponse } from "./models/homepage";
import type { ResponseData as SearchPullRequestsResponse } from "./models/search-pull-request";
import type {
	ResponseData as UserProfileResponse,
	UserProfileViewer,
} from "./models/user-profile";

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

function findRepositories(params: FindRepositoriesRequest) {
	return invoke<ApiResponse<FindRepositoriesResponse>>("find_repositories", {
		params,
	});
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
	return listen<AuthenticatedPayload>("Authenticated", cb);
}

function onThemeChanged(cb: (event: Event<ThemeChangedPayload>) => void) {
	return listen<ThemeChangedPayload>("ThemeChanged", cb);
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

function updateSetting(params: settings.Value) {
	return invoke<void>("update_setting", { params });
}

function getSetting(params: settings.Key) {
	return invoke<string>("get_setting", { params });
}

export default {
	authenticate,
	homepage,
	isAuthenticated,
	searchPullRequests,
	findRepositories,
	isAutoStartEnabled,
	enableAutoStart,
	disableAutoStart,
	showCurrentWindow,
	startAuthFlow,
	onAuthMessage,
	onThemeChanged,
	findWorkflows,
	extractWorkflowVariables,
	runWorkflow,
	updateSetting,
	getSetting,
};
