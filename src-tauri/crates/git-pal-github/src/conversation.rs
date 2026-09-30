//! Existing discussion on a pull request: reviews, conversation and inline comments.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{
    api_client::{Client, Error, Result},
    attachments::sign_attachments,
    rest::{API_URL, FULL_MEDIA_TYPE, GetPullRequestRequest, pull_request_url},
};

/// Keeps prompts small, long comments rarely add much past this point.
const MAX_BODY_CHARS: usize = 1000;
const MAX_SUMMARY_CHARS: usize = 20_000;
const GHOST_AUTHOR: &str = "ghost";
/// Side of the diff holding the new version of a file.
const NEW_SIDE: &str = "RIGHT";

#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "conversation.ts")]
pub struct InlineComment {
    pub id: i64,
    pub author: String,
    pub path: String,
    /// `None` when the comment is outdated or on the file itself
    pub line: Option<u32>,
    pub start_line: Option<u32>,
    /// Whether `line` refers to the new version of the file
    pub on_new_side: bool,
    pub is_file_comment: bool,
    pub in_reply_to_id: Option<i64>,
    pub body: String,
    pub signed_body: String,
    pub created_at: String,
    pub html_url: String,
}

#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "conversation.ts")]
pub struct IssueComment {
    pub id: i64,
    pub author: String,
    pub body: String,
    pub signed_body: String,
    pub created_at: String,
    pub html_url: String,
}

#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "conversation.ts")]
pub struct Review {
    pub id: i64,
    pub author: String,
    /// APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED or PENDING
    pub state: String,
    pub body: String,
    pub signed_body: String,
    pub submitted_at: Option<String>,
    pub html_url: String,
}

#[derive(Debug, Clone, Default, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "conversation.ts")]
pub struct PullRequestConversation {
    pub reviews: Vec<Review>,
    pub comments: Vec<IssueComment>,
    pub inline_comments: Vec<InlineComment>,
}

/// Which endpoint a comment lives under.
#[derive(Debug, Clone, Copy, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "conversation.ts")]
pub enum CommentKind {
    Inline,
    Issue,
    /// Summary of a submitted review, it can be edited but not deleted
    Review,
}

#[derive(Debug, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "conversation.ts")]
pub struct EditCommentRequest {
    pub owner: String,
    pub repository: String,
    pub number: i64,
    pub kind: CommentKind,
    pub id: i64,
    pub body: String,
}

#[derive(Debug, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "conversation.ts")]
pub struct DeleteCommentRequest {
    pub owner: String,
    pub repository: String,
    pub kind: CommentKind,
    pub id: i64,
}

#[derive(Debug, Deserialize)]
struct User {
    login: String,
}

fn author(user: Option<User>) -> String {
    user.map(|u| u.login)
        .unwrap_or_else(|| GHOST_AUTHOR.to_string())
}

#[derive(Debug, Deserialize)]
struct RawInlineComment {
    id: i64,
    user: Option<User>,
    path: String,
    line: Option<u32>,
    start_line: Option<u32>,
    side: Option<String>,
    subject_type: Option<String>,
    in_reply_to_id: Option<i64>,
    body: String,
    #[serde(default)]
    body_html: String,
    created_at: String,
    html_url: String,
}

#[derive(Debug, Deserialize)]
struct RawIssueComment {
    id: i64,
    user: Option<User>,
    #[serde(default)]
    body: String,
    #[serde(default)]
    body_html: String,
    created_at: String,
    html_url: String,
}

#[derive(Debug, Deserialize)]
struct RawReview {
    id: i64,
    user: Option<User>,
    state: String,
    #[serde(default)]
    body: String,
    #[serde(default)]
    body_html: String,
    submitted_at: Option<String>,
    html_url: String,
}

impl Client {
    pub async fn get_pull_request_conversation(
        &self,
        request: &GetPullRequestRequest,
    ) -> Result<PullRequestConversation> {
        let pr_url = pull_request_url(request);
        let issue_url = format!(
            "{API_URL}repos/{}/{}/issues/{}/comments",
            request.owner, request.repository, request.number
        );

        let reviews_url = format!("{pr_url}/reviews");
        let inline_url = format!("{pr_url}/comments");

        let (reviews, comments, inline_comments) = tokio::try_join!(
            self.get_all_pages_as::<RawReview>(&reviews_url, Some(FULL_MEDIA_TYPE)),
            self.get_all_pages_as::<RawIssueComment>(&issue_url, Some(FULL_MEDIA_TYPE)),
            self.get_all_pages_as::<RawInlineComment>(&inline_url, Some(FULL_MEDIA_TYPE)),
        )?;

        Ok(PullRequestConversation {
            reviews: reviews
                .into_iter()
                .map(|r| Review {
                    id: r.id,
                    author: author(r.user),
                    state: r.state,
                    signed_body: sign_attachments(&r.body, &r.body_html),
                    body: r.body,
                    submitted_at: r.submitted_at,
                    html_url: r.html_url,
                })
                .collect(),
            comments: comments
                .into_iter()
                .map(|c| IssueComment {
                    id: c.id,
                    author: author(c.user),
                    signed_body: sign_attachments(&c.body, &c.body_html),
                    body: c.body,
                    created_at: c.created_at,
                    html_url: c.html_url,
                })
                .collect(),
            inline_comments: inline_comments
                .into_iter()
                .map(|c| InlineComment {
                    id: c.id,
                    author: author(c.user),
                    path: c.path,
                    line: c.line,
                    start_line: c.start_line,
                    on_new_side: c.side.as_deref() == Some(NEW_SIDE),
                    is_file_comment: c.subject_type.as_deref() == Some("file"),
                    in_reply_to_id: c.in_reply_to_id,
                    signed_body: sign_attachments(&c.body, &c.body_html),
                    body: c.body,
                    created_at: c.created_at,
                    html_url: c.html_url,
                })
                .collect(),
        })
    }

    pub async fn edit_comment(&self, request: &EditCommentRequest) -> Result<()> {
        let repo_url = format!("{API_URL}repos/{}/{}", request.owner, request.repository);
        let body = serde_json::json!({ "body": request.body });

        let req = match request.kind {
            CommentKind::Inline => self
                .http
                .patch(format!("{repo_url}/pulls/comments/{}", request.id)),
            CommentKind::Issue => self
                .http
                .patch(format!("{repo_url}/issues/comments/{}", request.id)),
            CommentKind::Review => self.http.put(format!(
                "{repo_url}/pulls/{}/reviews/{}",
                request.number, request.id
            )),
        }
        .json(&body);

        self.do_request(req).await?;

        Ok(())
    }

    pub async fn delete_comment(&self, request: &DeleteCommentRequest) -> Result<()> {
        let repo_url = format!("{API_URL}repos/{}/{}", request.owner, request.repository);

        let url = match request.kind {
            CommentKind::Inline => format!("{repo_url}/pulls/comments/{}", request.id),
            CommentKind::Issue => format!("{repo_url}/issues/comments/{}", request.id),
            CommentKind::Review => {
                return Err(Error::BadRequest(
                    "a submitted review can't be deleted".to_string(),
                ));
            }
        };

        self.do_request(self.http.delete(url)).await?;

        Ok(())
    }
}

pub(crate) fn truncate(text: &str, max_chars: usize) -> String {
    let text = text.trim();

    if text.chars().count() <= max_chars {
        return text.to_string();
    }

    let mut truncated: String = text.chars().take(max_chars).collect();
    truncated.push('…');
    truncated
}

/// Indents follow-up lines so multi-line bodies stay inside their list item.
fn quote(body: &str) -> String {
    truncate(body, MAX_BODY_CHARS).replace('\n', "\n  ")
}

fn location(comment: &InlineComment) -> String {
    match (comment.start_line, comment.line) {
        _ if comment.is_file_comment => String::new(),
        (Some(start), Some(end)) => format!(" lines {start}-{end}"),
        (None, Some(line)) => format!(" line {line}"),
        _ => " (outdated)".to_string(),
    }
}

impl PullRequestConversation {
    pub fn summarize(&self) -> String {
        let mut sections = Vec::new();

        let reviews: Vec<String> = self
            .reviews
            .iter()
            .filter(|r| r.state != "PENDING")
            .map(|r| {
                let body = if r.body.trim().is_empty() {
                    String::new()
                } else {
                    format!(": {}", quote(&r.body))
                };
                format!("- @{} {}{body}", r.author, r.state)
            })
            .collect();

        if !reviews.is_empty() {
            sections.push(format!("### Reviews\n{}", reviews.join("\n")));
        }

        let comments: Vec<String> = self
            .comments
            .iter()
            .map(|c| format!("- @{}: {}", c.author, quote(&c.body)))
            .collect();

        if !comments.is_empty() {
            sections.push(format!("### Conversation\n{}", comments.join("\n")));
        }

        let threads: Vec<String> = self
            .inline_comments
            .iter()
            .filter(|c| c.in_reply_to_id.is_none())
            .map(|root| {
                let mut thread = format!(
                    "- `{}`{} @{}: {}",
                    root.path,
                    location(root),
                    root.author,
                    quote(&root.body)
                );
                for reply in self
                    .inline_comments
                    .iter()
                    .filter(|c| c.in_reply_to_id == Some(root.id))
                {
                    thread.push_str(&format!("\n  - @{}: {}", reply.author, quote(&reply.body)));
                }
                thread
            })
            .collect();

        if !threads.is_empty() {
            sections.push(format!("### Inline comments\n{}", threads.join("\n")));
        }

        truncate(&sections.join("\n\n"), MAX_SUMMARY_CHARS)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn inline(id: i64, reply_to: Option<i64>, line: Option<u32>) -> InlineComment {
        InlineComment {
            id,
            author: "bob".into(),
            path: "src/a.rs".into(),
            line,
            start_line: None,
            on_new_side: true,
            is_file_comment: false,
            in_reply_to_id: reply_to,
            body: format!("comment {id}"),
            signed_body: String::new(),
            created_at: String::new(),
            html_url: String::new(),
        }
    }

    #[test]
    fn summarizes_sections_and_threads() {
        let conversation = PullRequestConversation {
            reviews: vec![Review {
                id: 1,
                author: "alice".into(),
                state: "CHANGES_REQUESTED".into(),
                body: "Needs tests".into(),
                signed_body: String::new(),
                submitted_at: None,
                html_url: String::new(),
            }],
            comments: vec![],
            inline_comments: vec![
                inline(10, None, Some(4)),
                inline(11, Some(10), None),
                inline(12, None, None),
            ],
        };

        assert_eq!(
            conversation.summarize(),
            "### Reviews\n- @alice CHANGES_REQUESTED: Needs tests\n\n\
             ### Inline comments\n\
             - `src/a.rs` line 4 @bob: comment 10\n  - @bob: comment 11\n\
             - `src/a.rs` (outdated) @bob: comment 12"
        );
    }

    #[test]
    fn empty_conversation_has_empty_summary() {
        assert_eq!(PullRequestConversation::default().summarize(), "");
    }
}
