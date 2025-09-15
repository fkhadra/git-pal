import { invoke } from "@tauri-apps/api/core";
import { ApiResponse } from "./models/api";
import { ResponseData as HomepageResponse } from "./models/homepage";
import {
  ResponseData as UserProfileResponse,
  UserProfileViewer,
} from "./models/user-profile";

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

export default {
  authenticate,
  homepage,
  isAuthenticated,
  searchPullRequests,
};
