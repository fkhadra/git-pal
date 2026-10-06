use std::{
    collections::{HashMap, HashSet},
    sync::Mutex,
};

use anyhow::anyhow;
use tauri::{AppHandle, Manager, State};

use crate::{
    core::{AppState, notification},
    window::{self, ReviewActivity},
};

use git_pal_agent::models::PullRequestKey;
use git_pal_code_review::{
    git,
    models::{
        CodeReview, GetSavedReviewRequest, PullRequestReview, PullRequestSummary, ReviewComment,
        ReviewListEntry, ReviewPullRequestRequest, SetFileViewedRequest, USER_SEVERITY,
        UpdateReviewCommentsRequest, ViewedFile,
    },
    review, templates,
};
use git_pal_github::rest::{GetPullRequestRequest, SubmitReviewRequest};
use git_pal_harness::{Harness, shell};
use git_pal_job_runner::{Job, JobKind, JobStatus};

use super::Result;
use super::github::discussion_summary;

/// Starts a review job in the background and returns its id.
#[tauri::command]
pub async fn review_pull_request(
    app_handle: tauri::AppHandle,
    request: ReviewPullRequestRequest,
) -> Result<String> {
    let ReviewPullRequestRequest {
        owner,
        repository,
        template,
        pr_number,
        incremental,
    } = request;
    let job_id = review_job_id(&owner, &repository, pr_number);
    let state: State<'_, AppState> = app_handle.state();

    if let Some(JobStatus::Running | JobStatus::Queued) = state.job_runner.status(&job_id) {
        return Err(anyhow!("Pull request already in review").into());
    }

    let pr_request = GetPullRequestRequest {
        owner: owner.clone(),
        repository: repository.clone(),
        number: pr_number,
    };
    let pr = state.github_client.get_pull_request(&pr_request).await?;
    let description = pr.prompt_description();
    let base_ref = pr.base_ref.clone();
    let mut discussion = discussion_summary(&state, &pr_request).await;

    let store = state.code_review_store.clone();
    let existing = store.get_review(&owner, &repository, pr_number).await?;

    // commits already reviewed, an incremental review only looks past them
    let since = match (&existing, incremental) {
        (_, false) => None,
        (Some(review), true) if review.reviewed && review.head_sha == pr.head_sha => {
            return Err(anyhow!("No new commits since the last review").into());
        }
        (Some(review), true) if review.reviewed => Some(review.head_sha.clone()),
        _ => return Err(anyhow!("No previous review to build on").into()),
    };

    if since.is_some()
        && let Some(review) = &existing
    {
        discussion.push_str(&previous_comments(&review.comments));
    }

    let resolved = store
        .resolve_template(
            &template,
            existing.as_ref().and_then(|r| r.template.as_ref()),
            &format!("{owner}/{repository}"),
        )
        .await?;
    let used_template = templates::used_choice(resolved.as_ref());
    let settings = state.get_settings();
    let harness = settings.harness;
    let model = settings.model(harness);
    let (skills, warning) = installed_skills(
        harness,
        resolved
            .as_ref()
            .map(|t| t.skills.clone())
            .unwrap_or_default(),
    );
    let instructions = resolved
        .map(|t| t.content)
        .unwrap_or_else(|| review::BUILT_IN_INSTRUCTIONS.to_string());

    // keep the submission and user notes while re-reviewing, an incremental review keeps everything.
    // The reviewed commit only moves once the review succeeds.
    let head_sha = pr.head_sha;
    let reviewed = existing.as_ref().is_some_and(|r| r.reviewed);
    let placeholder = CodeReview {
        id: 0,
        owner,
        repository,
        pr_number,
        pr_title: pr.title,
        branch: pr.head_ref,
        head_sha: existing
            .as_ref()
            .map(|r| r.head_sha.clone())
            .unwrap_or_else(|| head_sha.clone()),
        submitted_head_sha: existing.as_ref().and_then(|r| r.submitted_head_sha.clone()),
        submitted_event: existing.as_ref().and_then(|r| r.submitted_event.clone()),
        summary: existing
            .as_ref()
            .filter(|_| incremental)
            .map(|r| r.summary.clone())
            .unwrap_or_default(),
        comments: existing
            .map(|r| kept_comments(r.comments, incremental))
            .unwrap_or_default(),
        reviewed_at: chrono::Utc::now().to_rfc3339(),
        template: Some(used_template),
        harness: Some(harness),
        model: model.clone(),
        error: None,
        warning,
        cancelled: false,
        reviewed,
    };
    store.upsert_review(&placeholder).await?;

    let repositories_dir = state.repositories_dir();
    let job_name = format!("Review - {}", placeholder.pr_title);
    let app = app_handle.clone();
    let pr_url = pr.html_url.clone();

    state.job_runner.run(
        job_id.clone(),
        job_name,
        JobKind::Review,
        move || async move {
            let owner = placeholder.owner.clone();
            let repository = placeholder.repository.clone();
            let pr_title = placeholder.pr_title.clone();

            let result = async {
                let owner = owner.clone();
                let repository = repository.clone();

                let scope = since.clone();
                let review =
                    tokio::task::spawn_blocking(move || -> anyhow::Result<PullRequestReview> {
                        let env_vars = shell::get_shell_env()?;
                        let worktree_dir =
                            git::prepare_worktree(&repositories_dir, &owner, &repository, pr_number)?;

                        if let Some(since) = &scope
                            && !git::is_ancestor(&worktree_dir, since)?
                        {
                            anyhow::bail!(
                                "The branch history was rewritten since the last review, re-review everything instead"
                            );
                        }

                        review::review(
                            harness,
                            &worktree_dir,
                            env_vars,
                            &instructions,
                            &base_ref,
                            &skills,
                            &description,
                            &discussion,
                            scope.as_deref(),
                            model.as_deref(),
                        )
                    })
                    .await
                    .map_err(|e| format!("Task join error: {e}"))?
                    .map_err(|e| e.to_string())?;

                // notes may have been added while the job was running
                let existing = store
                    .get_review(&placeholder.owner, &placeholder.repository, pr_number)
                    .await
                    .map_err(|e| e.to_string())?;

                let mut comments = review.comments.clone();
                if let Some(existing) = existing {
                    comments.extend(kept_comments(existing.comments, incremental));
                }

                let summary = match &since {
                    Some(since) => incremental_summary(&placeholder.summary, since, &review.summary),
                    None => review.summary.clone(),
                };

                // new notes take the review back from submitted
                let saved = CodeReview {
                    submitted_head_sha: None,
                    submitted_event: None,
                    comments,
                    summary,
                    head_sha,
                    reviewed_at: chrono::Utc::now().to_rfc3339(),
                    reviewed: true,
                    ..placeholder
                };
                store
                    .upsert_review(&saved)
                    .await
                    .map_err(|e| format!("Failed to save review: {e}"))?;

                serde_json::to_value(&review).map_err(|e| format!("Serialization error: {e}"))
            }
            .await;

            // shown on the review until the next one starts
            if let Err(error) = &result
                && let Err(e) = store.set_error(&owner, &repository, pr_number, error).await
            {
                log::error!("Failed to save review error: {e}");
            }

            let message = match &result {
                Ok(_) => format!("Pull request {pr_title} reviewed"),
                Err(_) => format!("Pull request {pr_title} review failed"),
            };
            let metadata = notification::review_metadata(pr_url, owner, repository, pr_number);
            notify_review(&app, &message, metadata).await;

            result
        },
    );

    Ok(job_id)
}

const REVIEWED_TITLE: &str = "Agent Review";

async fn notify_review(app: &AppHandle, message: &str, metadata: HashMap<String, String>) {
    if window::is_review_focused(app) {
        return;
    }

    let state: State<'_, AppState> = app.state();
    state
        .notification_manager
        .push_notification(
            REVIEWED_TITLE,
            message,
            Some(notification::Category::ReviewCompleted),
            Some(metadata),
        )
        .await;
}

/// Review the review window was opened for, taken once.
#[tauri::command]
pub fn take_requested_review(state: State<'_, AppState>) -> Option<GetSavedReviewRequest> {
    state.requested_review.lock().unwrap().take()
}

/// Requested skills still installed, and a warning naming the missing ones.
fn installed_skills(harness: Harness, requested: Vec<String>) -> (Vec<String>, Option<String>) {
    let available = harness.adapter().skills();
    let (skills, missing): (Vec<_>, Vec<_>) = requested
        .into_iter()
        .partition(|name| available.iter().any(|s| &s.name == name));

    if missing.is_empty() {
        return (skills, None);
    }

    let warning = format!("Skills not installed, skipped: {}", missing.join(", "));
    log::warn!("{warning}");

    (skills, Some(warning))
}

fn user_comments(comments: Vec<ReviewComment>) -> Vec<ReviewComment> {
    comments
        .into_iter()
        .filter(|c| c.severity == USER_SEVERITY)
        .collect()
}

/// Comments surviving a new review: all of them for an incremental one, user notes otherwise.
fn kept_comments(comments: Vec<ReviewComment>, incremental: bool) -> Vec<ReviewComment> {
    if incremental {
        return comments;
    }

    user_comments(comments)
}

/// Earlier AI comments, so an incremental review doesn't repeat them.
fn previous_comments(comments: &[ReviewComment]) -> String {
    let lines = comments
        .iter()
        .filter(|c| c.severity != USER_SEVERITY)
        .map(|c| match c.line {
            Some(line) => format!("- `{}` line {line}: {}", c.file, c.comment),
            None => format!("- `{}`: {}", c.file, c.comment),
        })
        .collect::<Vec<_>>();

    if lines.is_empty() {
        return String::new();
    }

    format!(
        "\n\nComments from the previous review:\n{}",
        lines.join("\n")
    )
}

const SHORT_SHA_LEN: usize = 7;

/// Previous summary followed by the one covering the new commits.
fn incremental_summary(previous: &str, since: &str, summary: &str) -> String {
    if previous.is_empty() {
        return summary.to_string();
    }

    let short = &since[..since.len().min(SHORT_SHA_LEN)];

    format!("{previous}\n\nSince {short}: {summary}")
}

#[tauri::command]
pub async fn list_reviews(state: State<'_, AppState>) -> Result<Vec<ReviewListEntry>> {
    Ok(state.code_review_store.list_reviews().await?)
}

#[tauri::command]
pub async fn get_review(
    state: State<'_, AppState>,
    request: GetSavedReviewRequest,
) -> Result<CodeReview> {
    state
        .code_review_store
        .get_review(&request.owner, &request.repository, request.pr_number)
        .await?
        .ok_or_else(|| anyhow!("Review not found").into())
}

#[tauri::command]
pub async fn update_review_comments(
    app: AppHandle,
    state: State<'_, AppState>,
    request: UpdateReviewCommentsRequest,
) -> Result<()> {
    state
        .code_review_store
        .update_comments(
            &request.owner,
            &request.repository,
            request.pr_number,
            &request.comments,
        )
        .await?;

    refresh_review_badge(&app);

    Ok(())
}

#[tauri::command]
pub async fn list_viewed_files(
    state: State<'_, AppState>,
    request: GetSavedReviewRequest,
) -> Result<Vec<ViewedFile>> {
    Ok(state
        .code_review_store
        .viewed_files(&request.owner, &request.repository, request.pr_number)
        .await?)
}

#[tauri::command]
pub async fn set_file_viewed(
    state: State<'_, AppState>,
    request: SetFileViewedRequest,
) -> Result<()> {
    state.code_review_store.set_file_viewed(&request).await?;

    Ok(())
}

#[tauri::command]
pub async fn submit_review(
    app: AppHandle,
    state: State<'_, AppState>,
    request: SubmitReviewRequest,
) -> Result<()> {
    state.github_client.submit_review(&request).await?;

    state
        .code_review_store
        .mark_submitted(
            &request.owner,
            &request.repository,
            request.number,
            &request.commit_id,
            &request.event,
        )
        .await?;

    refresh_review_badge(&app);

    Ok(())
}

static WORKTREE_REMOVAL: Mutex<()> = Mutex::new(());

#[tauri::command]
pub async fn delete_reviews(
    app: AppHandle,
    state: State<'_, AppState>,
    ids: Vec<i64>,
) -> Result<()> {
    let prs = state.code_review_store.delete_reviews(&ids).await?;
    refresh_review_badge(&app);

    for pr in &prs {
        state
            .agent_store
            .delete_for_pr(&PullRequestKey {
                owner: pr.owner.clone(),
                repository: pr.repository.clone(),
                pr_number: pr.pr_number,
            })
            .await?;
    }

    let repositories_dir = state.repositories_dir();
    tokio::task::spawn_blocking(move || {
        let _removing = WORKTREE_REMOVAL
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());

        for pr in prs {
            let bare_dir = git::bare_dir(&repositories_dir, &pr.owner, &pr.repository);
            let worktree_dir =
                git::worktree_dir(&repositories_dir, &pr.owner, &pr.repository, pr.pr_number);

            if let Err(e) = git::remove_worktree(&bare_dir, &worktree_dir) {
                log::error!("Failed to remove {}: {e}", worktree_dir.display());
            }
        }
    });

    Ok(())
}

// serializes the counts, a stale one can't land last
static BADGE_REFRESH: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

/// In progress without a running agent, mirrors the frontend `reviewStatus`.
fn is_waiting(review: &ReviewListEntry) -> bool {
    let is_submitted = review.submitted_head_sha.is_some()
        && review.submitted_event.is_some()
        && review.pending_count == 0;
    if is_submitted {
        return false;
    }

    review.reviewed || review.comment_count > 0
}

/// Recounts the running reviews and those waiting on the user, for the tray and the Dock.
pub(crate) fn refresh_review_badge(app: &AppHandle) {
    let app = app.clone();

    tauri::async_runtime::spawn(async move {
        let _refreshing = BADGE_REFRESH.lock().await;
        let state = app.state::<AppState>();

        let reviews = match state.code_review_store.list_reviews().await {
            Ok(reviews) => reviews,
            Err(err) => {
                log::warn!("Unable to count the reviews in progress: {err}");
                return;
            }
        };

        // a finished job stays listed until the runner forgets it
        let running: HashSet<String> = state
            .job_runner
            .tasks()
            .into_iter()
            .filter(|job| job.kind == JobKind::Review)
            .filter(|job| matches!(job.status, JobStatus::Queued | JobStatus::Running))
            .map(|job| job.job_id)
            .collect();

        let mut activity = ReviewActivity::default();
        for review in &reviews {
            let job_id = review_job_id(&review.owner, &review.repository, review.pr_number);
            if running.contains(&job_id) {
                activity.running += 1;
                continue;
            }

            if is_waiting(review) {
                activity.waiting += 1;
            }
        }

        window::show_review_activity(&app, &activity);
    });
}

#[tauri::command]
pub fn list_jobs(state: State<'_, AppState>) -> Vec<Job> {
    state.job_runner.tasks()
}

fn review_job_id(owner: &str, repository: &str, pr_number: i64) -> String {
    format!("review-{owner}-{repository}-{pr_number}")
}

/// Stops the running review, the review remembers it so it can be started again.
#[tauri::command]
pub async fn cancel_review(
    state: State<'_, AppState>,
    request: GetSavedReviewRequest,
) -> Result<()> {
    let job_id = review_job_id(&request.owner, &request.repository, request.pr_number);
    if !state.job_runner.cancel(&job_id) {
        return Ok(());
    }

    state
        .code_review_store
        .set_cancelled(&request.owner, &request.repository, request.pr_number)
        .await?;

    Ok(())
}

/// Shows a pull request in the review window. Unknown ones are saved as not reviewed,
/// without cloning or running the AI, so the user decides whether to review.
#[tauri::command]
pub async fn view_pull_request(
    app_handle: tauri::AppHandle,
    request: GetSavedReviewRequest,
    summary: Option<PullRequestSummary>,
) -> Result<()> {
    let state: State<'_, AppState> = app_handle.state();
    let store = &state.code_review_store;
    let existing = store
        .get_review(&request.owner, &request.repository, request.pr_number)
        .await?;

    if existing.is_none() {
        let pr = match summary {
            Some(summary) => summary,
            None => {
                let details = state
                    .github_client
                    .get_pull_request(&GetPullRequestRequest {
                        owner: request.owner.clone(),
                        repository: request.repository.clone(),
                        number: request.pr_number,
                    })
                    .await?;

                PullRequestSummary {
                    title: details.title,
                    branch: details.head_ref,
                    head_sha: details.head_sha,
                }
            }
        };

        store
            .upsert_review(&CodeReview {
                id: 0,
                owner: request.owner.clone(),
                repository: request.repository.clone(),
                pr_number: request.pr_number,
                pr_title: pr.title,
                branch: pr.branch,
                head_sha: pr.head_sha,
                submitted_head_sha: None,
                submitted_event: None,
                summary: String::new(),
                comments: vec![],
                reviewed_at: chrono::Utc::now().to_rfc3339(),
                template: None,
                harness: None,
                model: None,
                error: None,
                warning: None,
                cancelled: false,
                reviewed: false,
            })
            .await?;
    }

    window::show_review(&app_handle, Some(request))?;

    Ok(())
}

#[tauri::command]
pub fn show_review(
    app_handle: tauri::AppHandle,
    target: Option<GetSavedReviewRequest>,
) -> Result<()> {
    window::show_review(&app_handle, target)?;

    Ok(())
}
