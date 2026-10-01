use git_pal_harness::Harness;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;
use ts_rs::TS;

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
    pub status: ReviewStatus,
    pub comment_count: usize,
    pub error_count: usize,
    pub warning_count: usize,
    pub harness: Option<Harness>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[ts(export, export_to = "code-review.ts")]
pub enum ReviewStatus {
    #[default]
    Todo,
    Done,
    Submitted,
}

impl TryFrom<String> for ReviewStatus {
    type Error = String;

    fn try_from(s: String) -> std::result::Result<Self, Self::Error> {
        match s.as_str() {
            "Todo" => Ok(Self::Todo),
            "Done" => Ok(Self::Done),
            "Submitted" => Ok(Self::Submitted),
            other => Err(format!("unknown ReviewStatus: {other}")),
        }
    }
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
    #[sqlx(try_from = "String")]
    pub status: ReviewStatus,
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

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct UpdateReviewCommentsRequest {
    pub owner: String,
    pub repository: String,
    pub pr_number: i64,
    pub comments: Vec<ReviewComment>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub struct UpdateReviewStatusRequest {
    pub owner: String,
    pub repository: String,
    pub pr_number: i64,
    pub status: ReviewStatus,
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
