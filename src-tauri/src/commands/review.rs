use std::{
    collections::{HashMap, HashSet},
    sync::{
        Mutex,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};

use anyhow::anyhow;
use tauri::{AppHandle, Manager, State};
use tokio::task::JoinHandle;

use crate::{
    core::{AppState, Event, emit_event, notification},
    window::{self, ReviewActivity},
};

use git_pal_agent::models::PullRequestKey;
use git_pal_code_review::{
    git,
    models::{
        AutoApproval, CodeReview, GetSavedReviewRequest, PullRequestReview, PullRequestState,
        PullRequestSummary, ReviewComment, ReviewListEntry, ReviewPullRequestRequest,
        SetFileViewedRequest, TemplateChoice, USER_SEVERITY, UpdateReviewCommentsRequest,
        ViewedFile,
    },
    policy::{self, Policy, PolicySource, RepoPolicy},
    review, templates,
};
use git_pal_github::{
    codeowners::ReviewRequestStatus,
    graphql::PullRequest,
    query::get_pull_request::StatusState,
    rest::{GetPullRequestRequest, ReviewEvent, SubmitReviewRequest},
};
use git_pal_harness::{Harness, shell};
use git_pal_job_runner::{Job, JobKind, JobStatus};
use git_pal_settings::ReviewCleanup;

use super::Result;
use super::github::{discussion_summary, review_state};

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
    let (skills, skills_warning) = installed_skills(
        harness,
        resolved
            .as_ref()
            .map(|t| t.skills.clone())
            .unwrap_or_default(),
    );
    let (repo, policy_warning) = repo_policy(&state, &owner, &repository, &base_ref).await?;
    let policy = policy::effective(
        resolved.as_ref(),
        repo.as_ref(),
        settings.follow_repository_policies,
    );
    let policy_source = policy.as_ref().and_then(|p| p.source);
    let approval_policy = policy.filter(|p| p.auto_approve);
    let warning = join_warnings([skills_warning, policy_warning]);
    let risk_guidelines = resolved.as_ref().and_then(|t| t.risk_guidelines.clone());
    let instructions = resolved
        .map(|t| t.content)
        .unwrap_or_else(|| review::BUILT_IN_INSTRUCTIONS.to_string());

    // keep the submission and user notes while re-reviewing, an incremental review keeps everything.
    // The reviewed commit only moves once the review succeeds.
    let head_sha = pr.head_sha;
    let reviewed = existing.as_ref().is_some_and(|r| r.reviewed);
    let risk = existing.as_ref().and_then(|r| r.risk.clone());
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
        risk,
        auto_approval: None,
        pr_state: None,
        policy: policy_source,
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
                let handle = app.clone();
                let review =
                    tokio::task::spawn_blocking(move || -> anyhow::Result<PullRequestReview> {
                        let env_vars = shell::get_shell_env()?;
                        let worktree_dir =
                            git::prepare_worktree(&repositories_dir, &owner, &repository, pr_number)?;
                        emit_event(&handle, Event::WorktreesChanged);

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
                            risk_guidelines.as_deref(),
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
                    risk: review.risk.clone(),
                    ..placeholder
                };
                store
                    .upsert_review(&saved)
                    .await
                    .map_err(|e| format!("Failed to save review: {e}"))?;

                serde_json::to_value(&review).map_err(|e| format!("Serialization error: {e}"))
            }
            .await;

            let key = GetSavedReviewRequest {
                owner: owner.clone(),
                repository: repository.clone(),
                pr_number,
            };
            match &result {
                Ok(_) => forget_claim(&app, &key),
                Err(_) => release_claim(&app, &key).await,
            }

            // shown on the review until the next one starts
            if let Err(error) = &result
                && let Err(e) = store.set_error(&owner, &repository, pr_number, error).await
            {
                log::error!("Failed to save review error: {e}");
            }

            let approved = match (&result, &approval_policy) {
                (Ok(_), Some(policy)) => {
                    let approval =
                        auto_approve(&app, &owner, &repository, pr_number, policy).await;

                    if let Err(e) = store
                        .set_auto_approval(&owner, &repository, pr_number, &approval)
                        .await
                    {
                        log::error!("Failed to save auto approval: {e}");
                    }

                    matches!(approval, AutoApproval::Approved)
                }
                _ => false,
            };

            let message = match &result {
                Ok(_) if approved => format!("Pull request {pr_title} reviewed and approved"),
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

const AUTO_APPROVAL_BODY: &str = "Approved automatically by Git Pal";

const OVERRIDDEN_NOTE: &str = " (repository policy overridden)";

/// Approves the saved review when it qualifies, failures only skip it.
async fn auto_approve(
    app: &AppHandle,
    owner: &str,
    repository: &str,
    pr_number: i64,
    policy: &Policy,
) -> AutoApproval {
    match try_auto_approve(app, owner, repository, pr_number, policy).await {
        Ok(None) => AutoApproval::Approved,
        Ok(Some(reason)) => AutoApproval::Skipped { reason },
        Err(e) => AutoApproval::Skipped {
            reason: e.to_string(),
        },
    }
}

/// `None` once approved, else why it wasn't.
async fn try_auto_approve(
    app: &AppHandle,
    owner: &str,
    repository: &str,
    pr_number: i64,
    policy: &Policy,
) -> anyhow::Result<Option<String>> {
    let state: State<'_, AppState> = app.state();
    let store = &state.code_review_store;
    let review = store
        .get_review(owner, repository, pr_number)
        .await?
        .ok_or_else(|| anyhow!("Review not found"))?;

    if let Some(reason) =
        review::approval_blocker(review.risk.as_ref(), &review.comments, policy.max_risk)
    {
        return Ok(Some(reason));
    }

    let request = GetPullRequestRequest {
        owner: owner.to_string(),
        repository: repository.to_string(),
        number: pr_number,
    };
    let pr = state.github_client.find_pull_request(&request).await?;

    if pr.head_ref_oid != review.head_sha {
        return Ok(Some("New commits were pushed during the review".into()));
    }

    if policy.require_green_ci
        && let Some(reason) = ci_blocker(&pr)
    {
        return Ok(Some(reason.into()));
    }

    if !policy.skip_paths.is_empty() {
        let files: Vec<String> = state
            .github_client
            .get_pull_request_files(&request)
            .await?
            .into_iter()
            .map(|f| f.filename)
            .collect();

        if let Some(path) = policy::skipped_path(&policy.skip_paths, &files) {
            return Ok(Some(format!("Changes {path}, a skip path")));
        }
    }

    let risk = review
        .risk
        .as_ref()
        .ok_or_else(|| anyhow!("Risk not assessed"))?;
    let reasons = risk.reasons.iter().map(|reason| format!("- {reason}"));
    let note = match policy.source {
        Some(PolicySource::Overridden) => OVERRIDDEN_NOTE,
        _ => "",
    };
    let heading = format!("{AUTO_APPROVAL_BODY}{note}, {} risk:", risk.level.label());
    let body = std::iter::once(heading)
        .chain(reasons)
        .collect::<Vec<_>>()
        .join("\n");

    state
        .github_client
        .submit_review(&SubmitReviewRequest {
            owner: request.owner,
            repository: request.repository,
            number: pr_number,
            commit_id: review.head_sha.clone(),
            body,
            event: ReviewEvent::Approve,
            comments: vec![],
        })
        .await?;

    store
        .mark_submitted(
            owner,
            repository,
            pr_number,
            &review.head_sha,
            &ReviewEvent::Approve,
        )
        .await?;
    refresh_review_badge(app);

    Ok(None)
}

fn ci_blocker(pr: &PullRequest) -> Option<&'static str> {
    let Some(checks) = &pr.status_check_rollup else {
        return Some("No CI checks");
    };

    match checks.state {
        StatusState::SUCCESS => None,
        StatusState::PENDING | StatusState::EXPECTED => Some("CI checks are pending"),
        _ => Some("CI checks failed"),
    }
}

pub(crate) async fn auto_review(
    app: &AppHandle,
    request: GetSavedReviewRequest,
) -> anyhow::Result<bool> {
    let state: State<'_, AppState> = app.state();
    let store = &state.code_review_store;
    let GetSavedReviewRequest {
        owner,
        repository,
        pr_number,
    } = request;

    if store
        .get_review(&owner, &repository, pr_number)
        .await?
        .is_some()
    {
        return Ok(false);
    }

    let template = store
        .resolve_template(
            &TemplateChoice::Auto,
            None,
            &format!("{owner}/{repository}"),
        )
        .await?;
    let follow_repo = state.get_settings().follow_repository_policies;

    // without a template, only a followed repository policy can auto review
    let may_auto_review = match &template {
        Some(template) => template.auto_review,
        None => follow_repo,
    };
    if !may_auto_review {
        return Ok(false);
    }

    let pr = GetPullRequestRequest {
        owner: owner.clone(),
        repository: repository.clone(),
        number: pr_number,
    };
    let status = state.github_client.review_request_status(&pr).await?;
    if !status.as_code_owner {
        return Ok(false);
    }

    let (repo, _) = repo_policy(&state, &owner, &repository, &status.base_ref).await?;
    let Some(policy) =
        policy::effective(template.as_ref(), repo.as_ref(), follow_repo).filter(|p| p.auto_review)
    else {
        return Ok(false);
    };

    if let Some(reason) =
        review::auto_review_blocker(&status, &policy.skip_labels, policy.skip_approved)
    {
        log::info!("Auto review of {owner}/{repository}#{pr_number} skipped: {reason}");
        return Ok(true);
    }

    let key = GetSavedReviewRequest {
        owner: owner.clone(),
        repository: repository.clone(),
        pr_number,
    };

    if policy.claim_for_team
        && let Some(holder) = claim(app, &key, &pr, &status).await?
    {
        log::info!("Auto review of {owner}/{repository}#{pr_number} skipped: Claimed by {holder}");
        return Ok(true);
    }

    let reviewed = review_pull_request(
        app.clone(),
        ReviewPullRequestRequest {
            owner,
            repository,
            template: template.map_or(TemplateChoice::BuiltIn, |t| TemplateChoice::Template {
                id: t.id,
            }),
            pr_number,
            incremental: false,
        },
    )
    .await;

    if let Err(e) = reviewed {
        release_claim(app, &key).await;
        return Err(anyhow!(e.to_string()));
    }

    refresh_review_badge(app);

    Ok(false)
}

/// `git-pal.yml` on `base_ref`, an invalid one is skipped with a warning.
async fn repo_policy(
    state: &AppState,
    owner: &str,
    repository: &str,
    base_ref: &str,
) -> anyhow::Result<(Option<RepoPolicy>, Option<String>)> {
    let Some(text) = state
        .github_client
        .policy_file(owner, repository, base_ref)
        .await?
    else {
        return Ok((None, None));
    };

    match policy::parse(&text) {
        Ok(repo) => Ok((Some(repo), None)),
        Err(e) => {
            let warning = format!("Invalid git-pal.yml in {owner}/{repository}, ignored: {e}");
            log::warn!("{warning}");

            Ok((None, Some(warning)))
        }
    }
}

fn join_warnings<const N: usize>(warnings: [Option<String>; N]) -> Option<String> {
    let warnings: Vec<String> = warnings.into_iter().flatten().collect();
    if warnings.is_empty() {
        return None;
    }

    Some(warnings.join(". "))
}

/// Assigns the viewer so their code owner teammates skip the pull request,
/// `Some(teammate)` when one holds it already.
async fn claim(
    app: &AppHandle,
    key: &GetSavedReviewRequest,
    pr: &GetPullRequestRequest,
    status: &ReviewRequestStatus,
) -> anyhow::Result<Option<String>> {
    let state: State<'_, AppState> = app.state();
    let client = &state.github_client;
    let members = client.team_members(&status.code_owner_teams).await?;
    let viewer = client.viewer_login().await?;

    if let Some(holder) = review::claim_holder(&status.assignees, &members, &status.author, &viewer)
    {
        return Ok(Some(holder.clone()));
    }

    // requested as code owner directly, or already assigned by someone else
    if members.is_empty() || status.assignees.contains(&viewer) {
        return Ok(None);
    }

    client.assign(pr, &viewer).await?;

    let assignments = client.assignments(pr).await?;
    let winner = review::claim_winner(
        &assignments.assigned,
        &assignments.assignees,
        &members,
        &status.author,
    );

    if let Some(winner) = winner.filter(|w| **w != viewer) {
        client.unassign(pr, &viewer).await?;
        return Ok(Some(winner.clone()));
    }

    state.claimed_reviews.lock().unwrap().insert(key.clone());

    Ok(None)
}

/// Keeps the viewer assigned, the review is done.
fn forget_claim(app: &AppHandle, key: &GetSavedReviewRequest) {
    let state: State<'_, AppState> = app.state();
    state.claimed_reviews.lock().unwrap().remove(key);
}

/// Unassigns the viewer from a pull request they claimed, so teammates pick it up.
async fn release_claim(app: &AppHandle, key: &GetSavedReviewRequest) {
    let state: State<'_, AppState> = app.state();
    if !state.claimed_reviews.lock().unwrap().remove(key) {
        return;
    }

    let client = &state.github_client;
    let pr = GetPullRequestRequest {
        owner: key.owner.clone(),
        repository: key.repository.clone(),
        number: key.pr_number,
    };
    let released = match client.viewer_login().await {
        Ok(viewer) => client.unassign(&pr, &viewer).await,
        Err(e) => Err(e),
    };

    if let Err(e) = released {
        log::error!(
            "Failed to unassign {}/{}#{}: {e}",
            key.owner,
            key.repository,
            key.pr_number
        );
    }
}

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
    remove_reviews(&app, &state, &ids).await?;

    Ok(())
}

/// Deletes the reviews, their agent conversations and worktrees, returns the deleted pull requests.
async fn remove_reviews(
    app: &AppHandle,
    state: &AppState,
    ids: &[i64],
) -> anyhow::Result<Vec<GetSavedReviewRequest>> {
    let prs = state.code_review_store.delete_reviews(ids).await?;
    refresh_review_badge(app);

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

    remove_worktrees(app, prs.clone());

    Ok(prs)
}

// removals in flight, the status bar shows them
static CLEANINGS: AtomicUsize = AtomicUsize::new(0);

fn remove_worktrees(app: &AppHandle, prs: Vec<GetSavedReviewRequest>) -> JoinHandle<()> {
    let repositories_dir = app.state::<AppState>().repositories_dir();
    let app = app.clone();

    tokio::task::spawn_blocking(move || {
        let prs: Vec<_> = prs
            .into_iter()
            .filter(|pr| {
                git::worktree_dir(&repositories_dir, &pr.owner, &pr.repository, pr.pr_number)
                    .exists()
            })
            .collect();
        if prs.is_empty() {
            return;
        }

        CLEANINGS.fetch_add(1, Ordering::SeqCst);
        emit_event(&app, Event::WorktreesCleaning);

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

        CLEANINGS.fetch_sub(1, Ordering::SeqCst);
        emit_event(&app, Event::WorktreesChanged);
    })
}

#[tauri::command]
pub fn is_cleaning_worktrees() -> bool {
    CLEANINGS.load(Ordering::SeqCst) > 0
}

const CLEANUP_JOB: &str = "review_cleanup";
const CLEANUP_INTERVAL: Duration = Duration::from_mins(30);

pub(crate) fn start_review_cleanup(app: &AppHandle) {
    let app = app.clone();

    // the runner spawns on tokio, the app setup runs outside of it
    tauri::async_runtime::spawn(async move {
        let handle = app.clone();

        app.state::<AppState>().job_runner.start_job(
            CLEANUP_JOB.to_string(),
            CLEANUP_INTERVAL,
            move || {
                let app = handle.clone();
                async move {
                    if let Err(e) = clean_up_reviews(&app).await {
                        log::error!("Review cleanup failed: {e}");
                    }
                }
            },
        );
    });
}

/// Removes what the setting asks for once a pull request is merged or closed,
/// and the worktrees left without a review.
async fn clean_up_reviews(app: &AppHandle) -> anyhow::Result<()> {
    let state = app.state::<AppState>();
    let cleanup = state.get_settings().review_cleanup;
    if cleanup == ReviewCleanup::Off {
        return Ok(());
    }

    let orphans = orphan_worktrees(app).await?;
    let finished = finished_reviews(app).await?;

    if cleanup == ReviewCleanup::Worktree {
        remove_worktrees(app, worktrees_to_clean(finished, orphans));
        return Ok(());
    }

    remove_worktrees(app, orphans);
    if finished.is_empty() {
        return Ok(());
    }

    let ids: Vec<i64> = finished.iter().map(|r| r.id).collect();
    let prs = remove_reviews(app, &state, &ids).await?;
    emit_event(app, Event::ReviewsDeleted(prs));

    Ok(())
}

/// Removes the worktrees of merged or closed pull requests and those left without a review,
/// whatever the cleanup setting.
#[tauri::command]
pub async fn clean_up_worktrees(app: AppHandle) -> Result<()> {
    let orphans = orphan_worktrees(&app).await?;
    let finished = finished_reviews(&app).await?;

    remove_worktrees(&app, worktrees_to_clean(finished, orphans))
        .await
        .map_err(anyhow::Error::from)?;

    Ok(())
}

fn worktrees_to_clean(
    finished: Vec<ReviewListEntry>,
    orphans: Vec<GetSavedReviewRequest>,
) -> Vec<GetSavedReviewRequest> {
    finished
        .iter()
        .map(ReviewListEntry::request)
        .chain(orphans)
        .collect()
}

/// Worktrees whose review was deleted, skipping those a review or an agent works on.
async fn orphan_worktrees(app: &AppHandle) -> anyhow::Result<Vec<GetSavedReviewRequest>> {
    let state = app.state::<AppState>();
    let reviews: HashSet<GetSavedReviewRequest> = state
        .code_review_store
        .list_reviews()
        .await?
        .iter()
        .map(ReviewListEntry::request)
        .collect();

    let repositories_dir = state.repositories_dir();
    let worktrees =
        tokio::task::spawn_blocking(move || git::list_worktrees(&repositories_dir)).await?;

    let mut orphans = vec![];
    for pr in worktrees {
        if reviews.contains(&pr) || is_in_use(&state, &pr).await? {
            continue;
        }

        orphans.push(pr);
    }

    Ok(orphans)
}

/// Reviews of merged or closed pull requests, skipping those a review or an agent works on.
async fn finished_reviews(app: &AppHandle) -> anyhow::Result<Vec<ReviewListEntry>> {
    let state = app.state::<AppState>();

    let mut finished = vec![];
    for review in state.code_review_store.list_reviews().await? {
        match is_finished(app, &review).await {
            Ok(true) if !is_in_use(&state, &review.request()).await? => finished.push(review),
            Ok(_) => {}
            Err(e) => log::warn!(
                "Unable to fetch the state of {}/{}#{}: {e}",
                review.owner,
                review.repository,
                review.pr_number
            ),
        }
    }

    Ok(finished)
}

fn is_merged_or_closed(state: Option<PullRequestState>) -> bool {
    matches!(
        state,
        Some(PullRequestState::Merged | PullRequestState::Closed)
    )
}

/// Whether the pull request is merged or closed, asks GitHub unless already known.
async fn is_finished(app: &AppHandle, review: &ReviewListEntry) -> anyhow::Result<bool> {
    if is_merged_or_closed(review.pr_state) {
        return Ok(true);
    }

    let state = app.state::<AppState>();
    let request = GetPullRequestRequest {
        owner: review.owner.clone(),
        repository: review.repository.clone(),
        number: review.pr_number,
    };
    let pr = state.github_client.find_pull_request(&request).await?;
    let Some(pr_state) = review_state(&pr.state) else {
        return Ok(false);
    };

    if state
        .code_review_store
        .set_pr_state(
            &review.owner,
            &review.repository,
            review.pr_number,
            pr_state,
        )
        .await?
    {
        refresh_review_badge(app);
    }

    Ok(is_merged_or_closed(Some(pr_state)))
}

/// Whether a review or an agent is running in the pull request's worktree.
async fn is_in_use(state: &AppState, review: &GetSavedReviewRequest) -> anyhow::Result<bool> {
    let job_id = review_job_id(&review.owner, &review.repository, review.pr_number);
    if let Some(JobStatus::Running | JobStatus::Queued) = state.job_runner.status(&job_id) {
        return Ok(true);
    }

    let conversations = state
        .agent_store
        .list_conversations(&PullRequestKey {
            owner: review.owner.clone(),
            repository: review.repository.clone(),
            pr_number: review.pr_number,
        })
        .await?;
    let runs = state.agent_runs.lock().unwrap();

    Ok(conversations.iter().any(|c| runs.contains_key(&c.id)))
}

// serializes the counts, a stale one can't land last
static BADGE_REFRESH: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

/// In progress without a running agent, mirrors the frontend `reviewStatus`.
fn is_waiting(review: &ReviewListEntry) -> bool {
    if matches!(
        review.pr_state,
        Some(PullRequestState::Merged | PullRequestState::Closed)
    ) {
        return false;
    }

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
    app_handle: AppHandle,
    state: State<'_, AppState>,
    request: GetSavedReviewRequest,
) -> Result<()> {
    let job_id = review_job_id(&request.owner, &request.repository, request.pr_number);
    if !state.job_runner.cancel(&job_id) {
        return Ok(());
    }

    release_claim(&app_handle, &request).await;

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
                risk: None,
                auto_approval: None,
                pr_state: None,
                policy: None,
            })
            .await?;
    }

    window::show_review(&app_handle, Some(request))?;

    Ok(())
}

#[tauri::command]
pub async fn show_review(
    app_handle: tauri::AppHandle,
    target: Option<GetSavedReviewRequest>,
) -> Result<()> {
    window::show_review(&app_handle, target)?;

    Ok(())
}
