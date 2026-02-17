export type FeedbackKind = "Bug" | "FeatureRequest" | "Other";

export interface NewFeedback {
  email: string;
  kind: FeedbackKind;
  body: string;
}
