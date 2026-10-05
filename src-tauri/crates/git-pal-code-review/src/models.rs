use git_pal_github::rest::ReviewEvent;
use git_pal_harness::Harness;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;
use ts_rs::TS;

pub const USER_SEVERITY: &str = "user";

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct ReviewListEntry {
    pub id: i64,
    pub owner: String,
    pub repository: String,
    pub pr_number: i64,
    pub pr_title: String,
    pub branch: String,
    pub reviewed_at: String,
    /// False while the pull request was only viewed
    pub reviewed: bool,
    pub head_sha: String,
    pub submitted_head_sha: Option<String>,
    pub submitted_event: Option<ReviewEvent>,
    pub comment_count: usize,
    pub error_count: usize,
    pub warning_count: usize,
    /// Notes posted with the next submitted review
    pub pending_count: usize,
    pub harness: Option<Harness>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct CodeReview {
    #[serde(default)]
    pub id: i64,
    pub owner: String,
    pub repository: String,
    pub pr_number: i64,
    pub pr_title: String,
    pub branch: String,
    pub head_sha: String,
    pub submitted_head_sha: Option<String>,
    #[sqlx(json(nullable))]
    pub submitted_event: Option<ReviewEvent>,
    pub summary: String,
    #[sqlx(json)]
    pub comments: Vec<ReviewComment>,
    pub reviewed_at: String,
    #[sqlx(json(nullable))]
    pub template: Option<TemplateChoice>,
    /// Harness running the AI review
    #[serde(default)]
    #[sqlx(json(nullable))]
    pub harness: Option<Harness>,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub warning: Option<String>,
    #[serde(default)]
    pub cancelled: bool,
    #[serde(default)]
    pub reviewed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct GetSavedReviewRequest {
    pub owner: String,
    pub repository: String,
    pub pr_number: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct PullRequestSummary {
    pub title: String,
    pub branch: String,
    pub head_sha: String,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct UpdateReviewCommentsRequest {
    pub owner: String,
    pub repository: String,
    pub pr_number: i64,
    pub comments: Vec<ReviewComment>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct ReviewComment {
    pub file: String,
    /// Last line of the range, `None` for a file level comment
    pub line: Option<u32>,
    /// First line of a multi-line range
    #[serde(default)]
    pub start_line: Option<u32>,
    pub severity: String,
    pub comment: String,
    /// AI comment selected to be posted on GitHub, user comments always are
    #[serde(default)]
    pub publish: bool,
    /// Already posted on GitHub
    #[serde(default)]
    pub posted: bool,
}

impl ReviewComment {
    /// Posted with the next submitted review
    pub fn is_pending(&self) -> bool {
        !self.posted && (self.severity == USER_SEVERITY || self.publish)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct PullRequestReview {
    pub comments: Vec<ReviewComment>,
    pub summary: String,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct ReviewPullRequestRequest {
    pub owner: String,
    pub repository: String,
    #[serde(default)]
    pub template: TemplateChoice,
    pub pr_number: i64,
    /// Only review the commits pushed since the last review, keeping its comments
    #[serde(default)]
    #[ts(as = "Option<bool>", optional)]
    pub incremental: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct ViewedFile {
    pub filename: String,
    pub sha: String,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct SetFileViewedRequest {
    pub owner: String,
    pub repository: String,
    pub pr_number: i64,
    pub filename: String,
    pub sha: String,
    pub viewed: bool,
}

/// Which instructions a review uses.
#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub enum TemplateChoice {
    /// First matching template, then the default one, then the built-in instructions
    #[default]
    Auto,
    BuiltIn,
    Template {
        id: i64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct ReviewTemplate {
    pub id: i64,
    pub name: String,
    pub content: String,
    /// Regex tested against "owner/repo"
    pub matcher: Option<String>,
    pub is_default: bool,
    /// Skills the review must use
    #[sqlx(json)]
    pub skills: Vec<String>,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct ReviewTemplateInput {
    pub name: String,
    pub content: String,
    pub matcher: Option<String>,
    pub is_default: bool,
    pub skills: Vec<String>,
}
