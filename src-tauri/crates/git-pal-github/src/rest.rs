use std::collections::HashMap;
use std::fmt::Debug;

use reqwest::RequestBuilder;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::api_client::{Client, Error, Response, Result};
use crate::conversation::truncate;
use crate::github::Metadata;

pub(crate) const API_URL: &str = "https://api.github.com/";

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "api.ts")]
pub struct RestResponse<T> {
    pub metadata: Metadata,
    pub data: T,
}

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export, export_to = "rest.ts")]
pub struct Workflow {
    pub id: i32,
    pub node_id: String,
    pub name: String,
    pub path: String,
    pub state: String,
    pub created_at: String,
    pub updated_at: String,
    pub url: String,
    pub html_url: String,
    pub badge_url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export, export_to = "rest.ts")]
pub struct Workflows {
    pub total_count: i32,
    pub workflows: Vec<Workflow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rest.ts")]
pub struct WorkflowInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub default: Option<String>,
    pub required: Option<bool>,
    #[serde(rename = "type")]
    pub input_type: Option<String>,
}

pub type WorkflowInputs = Vec<WorkflowInput>;

type WorkflowInputName = String;

#[derive(Debug, Deserialize)]
struct WorkflowFile {
    on: WorkflowFileOnField,
}

#[derive(Debug, Deserialize)]
struct WorkflowFileOnField {
    workflow_call: Option<WorkflowTrigger>,
    workflow_dispatch: Option<WorkflowTrigger>,
}

#[derive(Debug, Deserialize)]
struct WorkflowTrigger {
    inputs: Option<HashMap<WorkflowInputName, WorkflowInput>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rest.ts")]
pub struct FileRequest<'a> {
    pub owner: &'a str,
    pub repository: &'a str,
    pub file_path: &'a str,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rest.ts")]
pub struct RunWorkflowRequest<'a> {
    pub owner: &'a str,
    pub repository: &'a str,
    pub workflow_id: i32,
    pub branch: &'a str,
    #[ts(type = "Record<string, any>")]
    pub variables: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rest.ts")]
pub struct FindWorkflowsRequest<'a> {
    pub owner: &'a str,
    pub repository: &'a str,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "rest.ts")]
pub struct GetPullRequestRequest {
    pub owner: String,
    pub repository: String,
    pub number: i64,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "rest.ts")]
pub struct PullRequestDetails {
    pub title: String,
    pub html_url: String,
    pub head_ref: String,
    pub head_sha: String,
    pub base_ref: String,
    /// Markdown description, `None` when left empty
    pub body: Option<String>,
}

/// Bot descriptions (e.g. dependency updates) can be huge, prompts only need the gist.
const MAX_PROMPT_DESCRIPTION_CHARS: usize = 4000;

impl PullRequestDetails {
    /// The description sized for a prompt, empty when there is none.
    pub fn prompt_description(&self) -> String {
        self.body
            .as_deref()
            .map(|body| truncate(body, MAX_PROMPT_DESCRIPTION_CHARS))
            .unwrap_or_default()
    }
}

#[derive(Debug, Deserialize)]
struct PullRequestResponse {
    title: String,
    html_url: String,
    body: Option<String>,
    head: PullRequestHead,
    base: PullRequestBase,
}

#[derive(Debug, Deserialize)]
struct PullRequestBase {
    #[serde(rename = "ref")]
    ref_field: String,
}

#[derive(Debug, Deserialize)]
struct PullRequestHead {
    #[serde(rename = "ref")]
    ref_field: String,
    sha: String,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "rest.ts")]
pub struct CompareCommitsRequest {
    pub owner: String,
    pub repository: String,
    pub base: String,
    pub head: String,
}

/// How head relates to base, `Diverged` once the history was rewritten.
#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export, export_to = "rest.ts")]
pub enum CompareStatus {
    Ahead,
    Behind,
    Diverged,
    Identical,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "rest.ts")]
pub struct CommitComparison {
    pub status: CompareStatus,
    pub ahead_by: i64,
}

#[derive(Debug, Deserialize)]
struct CompareResponse {
    status: CompareStatus,
    ahead_by: i64,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "rest.ts")]
pub struct PullRequestFile {
    pub sha: String,
    pub filename: String,
    pub status: String,
    pub additions: i64,
    pub deletions: i64,
    pub changes: i64,
    pub patch: Option<String>,
    pub previous_filename: Option<String>,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "rest.ts")]
pub struct PullRequestDiff {
    pub files: Vec<PullRequestFile>,
    pub raw_diff: String,
    pub total_additions: i64,
    pub total_deletions: i64,
    pub total_files: i64,
}

const PER_PAGE: usize = 100;

/// Side of the diff a comment applies to, only the new version is supported.
const COMMENT_SIDE: &str = "RIGHT";

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[ts(export, export_to = "rest.ts")]
pub enum ReviewEvent {
    Comment,
    Approve,
    RequestChanges,
}

#[derive(Debug, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "rest.ts")]
pub struct DraftReviewComment {
    pub path: String,
    pub body: String,
    /// `None` for a file level comment
    pub line: Option<u32>,
    pub start_line: Option<u32>,
}

#[derive(Debug, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "rest.ts")]
pub struct SubmitReviewRequest {
    pub owner: String,
    pub repository: String,
    pub number: i64,
    /// Head commit the comment lines refer to
    pub commit_id: String,
    pub body: String,
    pub event: ReviewEvent,
    pub comments: Vec<DraftReviewComment>,
}

impl Client {
    pub async fn find_workflows(
        &self,
        FindWorkflowsRequest { owner, repository }: FindWorkflowsRequest<'_>,
    ) -> Result<RestResponse<Workflows>> {
        let req = self.http.get(format!(
            "{API_URL}repos/{owner}/{repository}/actions/workflows"
        ));

        self.send_request(req).await
    }

    pub async fn file(&self, params: FileRequest<'_>) -> Result<RestResponse<String>> {
        let req = self
            .http
            .get(format!(
                "{API_URL}repos/{owner}/{repository}/contents/{file_path}",
                owner = params.owner,
                repository = params.repository,
                file_path = params.file_path
            ))
            .header("Accept", "application/vnd.github.raw+json");

        let Response { metadata, response } = self.do_request(req).await?;
        let file_content = response.text().await?;

        Ok(RestResponse {
            metadata,
            data: file_content,
        })
    }

    pub async fn extract_workflow_variables(
        &self,
        params: FileRequest<'_>,
    ) -> Result<RestResponse<WorkflowInputs>> {
        let res = self.file(params).await?;

        let workflow: WorkflowFile = serde_yaml::from_str(&res.data)
            .map_err(|e| Error::InvalidWorkflowFile(e.to_string()))?;

        let trigger = match workflow.on.workflow_call.or(workflow.on.workflow_dispatch) {
            Some(trigger) => trigger,
            None => {
                return Err(Error::InvalidWorkflowFile(
                    "not a workflow file".to_string(),
                ));
            }
        };

        let variables: Vec<WorkflowInput> = trigger
            .inputs
            .map(|inputs| {
                inputs
                    .into_iter()
                    .map(|(name, input)| WorkflowInput {
                        name: Some(name),
                        description: input.description,
                        default: input.default,
                        required: input.required,
                        input_type: input.input_type,
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(RestResponse {
            metadata: res.metadata,
            data: variables,
        })
    }

    pub async fn run_workflow(&self, params: RunWorkflowRequest<'_>) -> Result<()> {
        #[derive(Debug, Serialize, Clone)]
        struct Body {
            #[serde(rename = "ref")]
            ref_field: String,
            #[serde(skip_serializing_if = "Option::is_none")]
            inputs: Option<HashMap<String, serde_json::Value>>,
        }

        let req = self
            .http
            .post(format!(
                "{API_URL}repos/{owner}/{repository}/actions/workflows/{workflow_id}/dispatches",
                owner = params.owner,
                repository = params.repository,
                workflow_id = params.workflow_id
            ))
            .json(&Body {
                ref_field: params.branch.to_string(),
                inputs: params.variables,
            });

        let _ = self.do_request(req).await?;

        Ok(())
    }

    pub async fn get_pull_request(
        &self,
        request: &GetPullRequestRequest,
    ) -> Result<PullRequestDetails> {
        let req = self.http.get(pull_request_url(request));

        let Response { response, .. } = self.do_request(req).await?;
        let pr: PullRequestResponse = response.json().await?;

        Ok(PullRequestDetails {
            title: pr.title,
            html_url: pr.html_url,
            head_ref: pr.head.ref_field,
            head_sha: pr.head.sha,
            base_ref: pr.base.ref_field,
            body: pr.body,
        })
    }

    pub async fn compare_commits(
        &self,
        request: &CompareCommitsRequest,
    ) -> Result<CommitComparison> {
        // the commit list isn't needed, only the counters
        let url = format!(
            "{API_URL}repos/{}/{}/compare/{}...{}?per_page=1",
            request.owner, request.repository, request.base, request.head
        );
        let req = self.http.get(url);
        let Response { response, .. } = self.do_request(req).await?;
        let comparison: CompareResponse = response.json().await?;

        Ok(CommitComparison {
            status: comparison.status,
            ahead_by: comparison.ahead_by,
        })
    }

    pub async fn get_pull_request_diff(
        &self,
        request: &GetPullRequestRequest,
    ) -> Result<PullRequestDiff> {
        let files = self.get_pull_request_files(request).await?;
        let raw_diff = self.get_pull_request_raw_diff(request).await?;

        let total_additions = files.iter().map(|f| f.additions).sum();
        let total_deletions = files.iter().map(|f| f.deletions).sum();
        let total_files = files.len() as i64;

        Ok(PullRequestDiff {
            files,
            raw_diff,
            total_additions,
            total_deletions,
            total_files,
        })
    }

    async fn get_pull_request_files(
        &self,
        request: &GetPullRequestRequest,
    ) -> Result<Vec<PullRequestFile>> {
        self.get_all_pages(&format!("{}/files", pull_request_url(request)))
            .await
    }

    /// Follows GitHub's page based pagination until a partial page is returned.
    pub(crate) async fn get_all_pages<T: DeserializeOwned>(&self, url: &str) -> Result<Vec<T>> {
        let mut items = Vec::new();
        let mut page = 1u32;

        loop {
            let req = self
                .http
                .get(format!("{url}?per_page={PER_PAGE}&page={page}"));

            let Response { response, .. } = self.do_request(req).await?;
            let batch: Vec<T> = response.json().await?;
            let is_last_page = batch.len() < PER_PAGE;
            items.extend(batch);

            if is_last_page {
                break;
            }
            page += 1;
        }

        Ok(items)
    }

    async fn get_pull_request_raw_diff(&self, request: &GetPullRequestRequest) -> Result<String> {
        let req = self
            .http
            .get(pull_request_url(request))
            .header("Accept", "application/vnd.github.diff");

        let Response { response, .. } = self.do_request(req).await?;

        Ok(response.text().await?)
    }

    /// Posts line comments as one review, file comments are posted alongside since reviews can't hold them.
    pub async fn submit_review(&self, request: &SubmitReviewRequest) -> Result<()> {
        let (line_comments, file_comments): (Vec<_>, Vec<_>) =
            request.comments.iter().partition(|c| c.line.is_some());

        let url = pull_request_url(&GetPullRequestRequest {
            owner: request.owner.clone(),
            repository: request.repository.clone(),
            number: request.number,
        });

        // GitHub rejects an empty comment review, file comments alone don't need one
        let is_empty = matches!(request.event, ReviewEvent::Comment)
            && request.body.trim().is_empty()
            && line_comments.is_empty();

        if !is_empty {
            let comments: Vec<serde_json::Value> = line_comments
                .iter()
                .map(|c| {
                    let mut comment = serde_json::json!({
                        "path": c.path,
                        "body": c.body,
                        "line": c.line,
                        "side": COMMENT_SIDE,
                    });
                    if let Some(start_line) = c.start_line {
                        comment["start_line"] = start_line.into();
                        comment["start_side"] = COMMENT_SIDE.into();
                    }
                    comment
                })
                .collect();

            let req = self
                .http
                .post(format!("{url}/reviews"))
                .json(&serde_json::json!({
                    "commit_id": request.commit_id,
                    "body": request.body,
                    "event": request.event,
                    "comments": comments,
                }));

            self.do_request(req).await?;
        }

        for comment in file_comments {
            let req = self
                .http
                .post(format!("{url}/comments"))
                .json(&serde_json::json!({
                    "commit_id": request.commit_id,
                    "path": comment.path,
                    "body": comment.body,
                    "subject_type": "file",
                }));

            self.do_request(req).await.map_err(|e| {
                Error::BadRequest(format!("file comment on {} failed: {e}", comment.path))
            })?;
        }

        Ok(())
    }

    async fn send_request<R>(&self, req: RequestBuilder) -> Result<RestResponse<R>>
    where
        R: DeserializeOwned + Clone + Debug,
    {
        let req = req.header("Accept", "application/vnd.github+json");
        let Response { metadata, response } = self.do_request(req).await?;
        let data: R = response.json().await?;

        Ok(RestResponse { metadata, data })
    }
}

pub(crate) fn pull_request_url(request: &GetPullRequestRequest) -> String {
    format!(
        "{API_URL}repos/{}/{}/pulls/{}",
        request.owner, request.repository, request.number
    )
}
