export type { Repository } from "./homepage";
export * from "./rest";
export type {
	PullRequest,
	PullRequestReviewDecision,
	PullRequestState,
} from "./search-pull-request";
export type { Theme } from "./settings";
export * as settings from "./settings";
export type {
	Organization,
	UserProfileViewer as UserProfile,
} from "./user-profile";

import type * as events from "./events";

export type AuthenticatedPayload = Extract<
	events.Event,
	{ authenticated: unknown }
>;

export type ThemeChangedPayload = Extract<
	events.Event,
	{ themeChanged: unknown }
>;
