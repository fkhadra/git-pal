use git_pal_code_review::{git, models::PullRequestState};
use tauri::{AppHandle, State};

use crate::core::AppState;

use git_pal_github::{
    codeowners::OwnedFilesRequest,
    conversation::{DeleteCommentRequest, EditCommentRequest, PullRequestConversation},
    github,
    graphql::{
        FindPullRequestResult, FindPullRequestsFilter, FindRepositoriesRequest,
        FindRepositoriesResult, FindRepositoryPullRequestsRequest, Homepage, MergeQueue,
        MergeQueueRequest,
    },
    mentions::{MentionableUser, MentionableUsersRequest},
    query::{self, search_pull_request::SearchPullRequestSearchNodes::PullRequest},
    rest::{
        CommitComparison, CompareCommitsRequest, FileSourceRequest, GetPullRequestRequest,
        PullRequestDetails, PullRequestDiff,
    },
    scope::EntryKind,
};

use super::Result;
use super::review::refresh_review_badge;

#[tauri::command]
pub async fn homepage(state: State<'_, AppState>) -> Result<Homepage> {
    Ok(state.github_client.homepage(&state.search_scope()).await?)
}

#[tauri::command]
pub async fn find_pull_requests(
    state: State<'_, AppState>,
    filter: FindPullRequestsFilter,
) -> Result<FindPullRequestResult> {
    let is_review_requested = filter == FindPullRequestsFilter::ReviewRequested;
    let response = state
        .github_client
        .find_pull_requests(
            filter,
            &state.search_scope(),
            state.get_settings().pull_request_limit,
        )
        .await?;

    if is_review_requested {
        let data = response
            .data
            .iter()
            .flat_map(|v| v.search.nodes.iter())
            .flatten()
            .flatten()
            .filter_map(|node| {
                if let PullRequest(pr) = node {
                    Some((pr.id.clone(), pr.clone()))
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();

        let mut prs = state.pull_requests.lock().unwrap();
        for (id, pr) in data {
            prs.insert(id, pr);
        }
    }

    Ok(response)
}

#[tauri::command]
pub async fn find_repository_pull_requests(
    state: State<'_, AppState>,
    params: FindRepositoryPullRequestsRequest,
) -> Result<FindPullRequestResult> {
    Ok(state
        .github_client
        .find_repository_pull_requests(params)
        .await?)
}

#[tauri::command]
pub async fn find_merge_queue(
    state: State<'_, AppState>,
    params: MergeQueueRequest,
) -> Result<Option<MergeQueue>> {
    Ok(state.github_client.find_merge_queue(params).await?)
}

#[tauri::command]
pub async fn find_repositories(
    state: State<'_, AppState>,
    params: FindRepositoriesRequest,
) -> Result<FindRepositoriesResult> {
    Ok(state.github_client.find_repositories(params).await?)
}

#[tauri::command]
pub async fn check_scope_entry(state: State<'_, AppState>, entry: String) -> Result<EntryKind> {
    Ok(state.github_client.check_scope_entry(&entry).await?)
}

pub(super) async fn discussion_summary(
    state: &AppState,
    request: &GetPullRequestRequest,
) -> String {
    match state
        .github_client
        .get_pull_request_conversation(request)
        .await
    {
        Ok(conversation) => conversation.summarize(),
        Err(err) => {
            log::warn!("Unable to load the pull request discussion: {err}");
            String::new()
        }
    }
}

#[tauri::command]
pub async fn get_pull_request_conversation(
    state: State<'_, AppState>,
    request: GetPullRequestRequest,
) -> Result<PullRequestConversation> {
    Ok(state
        .github_client
        .get_pull_request_conversation(&request)
        .await?)
}

#[tauri::command]
pub async fn edit_comment(state: State<'_, AppState>, request: EditCommentRequest) -> Result<()> {
    Ok(state.github_client.edit_comment(&request).await?)
}

#[tauri::command]
pub async fn delete_comment(
    state: State<'_, AppState>,
    request: DeleteCommentRequest,
) -> Result<()> {
    Ok(state.github_client.delete_comment(&request).await?)
}

#[tauri::command]
pub async fn get_pull_request(
    state: State<'_, AppState>,
    request: GetPullRequestRequest,
) -> Result<PullRequestDetails> {
    Ok(state.github_client.get_pull_request(&request).await?)
}

#[tauri::command]
pub async fn compare_commits(
    state: State<'_, AppState>,
    request: CompareCommitsRequest,
) -> Result<CommitComparison> {
    Ok(state.github_client.compare_commits(&request).await?)
}

#[tauri::command]
pub async fn get_pull_request_status(
    app: AppHandle,
    state: State<'_, AppState>,
    request: GetPullRequestRequest,
) -> Result<git_pal_github::graphql::PullRequest> {
    let pr = state.github_client.find_pull_request(&request).await?;

    // remembered for the reviews list, a merged pull request no longer waits on the user
    if let Some(pr_state) = review_state(&pr.state)
        && state
            .code_review_store
            .set_pr_state(
                &request.owner,
                &request.repository,
                request.number,
                pr_state,
            )
            .await?
    {
        refresh_review_badge(&app);
    }

    Ok(pr)
}

fn review_state(state: &query::get_pull_request::PullRequestState) -> Option<PullRequestState> {
    use query::get_pull_request::PullRequestState as GithubState;

    match state {
        GithubState::OPEN => Some(PullRequestState::Open),
        GithubState::MERGED => Some(PullRequestState::Merged),
        GithubState::CLOSED => Some(PullRequestState::Closed),
        GithubState::Other(_) => None,
    }
}

#[tauri::command]
pub async fn get_pull_request_diff(
    state: State<'_, AppState>,
    request: GetPullRequestRequest,
) -> Result<PullRequestDiff> {
    let client = &state.github_client;
    let pr = client.get_pull_request(&request).await?;

    // the file count is known upfront, the line limit only once GitHub refuses
    if !pr.is_diff_too_large {
        match client.get_pull_request_diff(&request).await {
            Err(github::Error::DiffTooLarge) => {}
            result => return Ok(result?),
        }
    }

    // too large for GitHub, the local clone has no limit
    let files = client.get_pull_request_files(&request).await?;
    let repositories_dir = state.repositories_dir();
    let raw_diff = tokio::task::spawn_blocking(move || {
        git::pull_request_diff(
            &repositories_dir,
            &request.owner,
            &request.repository,
            request.number,
            &pr.base_ref,
            &pr.head_sha,
        )
    })
    .await
    .map_err(anyhow::Error::from)??;

    Ok(PullRequestDiff::new(files, raw_diff))
}

#[tauri::command]
pub async fn get_owned_files(
    state: State<'_, AppState>,
    request: OwnedFilesRequest,
) -> Result<Option<Vec<String>>> {
    Ok(state.github_client.owned_files(&request).await?)
}

#[tauri::command]
pub async fn get_mentionable_users(
    state: State<'_, AppState>,
    request: MentionableUsersRequest,
) -> Result<Vec<MentionableUser>> {
    Ok(state.github_client.mentionable_users(&request).await?)
}

#[tauri::command]
pub async fn get_pull_request_description(
    state: State<'_, AppState>,
    request: GetPullRequestRequest,
) -> Result<Option<String>> {
    Ok(state
        .github_client
        .pull_request_description(&request)
        .await?)
}

#[tauri::command]
pub async fn get_file_source(
    state: State<'_, AppState>,
    request: FileSourceRequest,
) -> Result<String> {
    Ok(state.github_client.file_source(&request).await?)
}
