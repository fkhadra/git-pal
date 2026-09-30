export * from "./graphql";
export type { Repository } from "./homepage";
export * from "./rest";
export type {
  PullRequest,
  PullRequestReviewDecision,
  PullRequestState,
} from "./search-pull-request";
export type { Theme } from "./settings";
export * as settings from "./settings";
export type { Organization, UserProfile } from "./user-profile";

import type { ContextItem } from "./agent";
import type * as events from "./events";

export type AuthenticatedPayload = Extract<
  events.Event,
  { authMessage: unknown }
>;

export type ThemeChangedPayload = Extract<
  events.Event,
  { themeChanged: unknown }
>;

export type SettingChangedPayload = Extract<
  events.Event,
  { settingChanged: unknown }
>;

export type JobMessagePayload = Extract<events.Event, { jobMessage: unknown }>;

export type ReviewSelectedPayload = Extract<
  events.Event,
  { reviewSelected: unknown }
>;

export type CommentContext = Extract<ContextItem, { type: "comment" }>;
