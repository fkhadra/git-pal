use tauri::State;

use crate::{core::AppState, editor};

use git_pal_code_review::{git, models::GetSavedReviewRequest};

use super::Result;

/// Returns the PR worktree, creating it when missing.
async fn ensure_worktree(
    state: &AppState,
    request: GetSavedReviewRequest,
) -> anyhow::Result<std::path::PathBuf> {
    let repositories_dir = state.repositories_dir();

    tokio::task::spawn_blocking(move || {
        let GetSavedReviewRequest {
            owner,
            repository,
            pr_number,
        } = request;
        let dir = git::worktree_dir(&repositories_dir, &owner, &repository, pr_number);
        if dir.join(".git").exists() {
            return Ok(dir);
        }

        git::prepare_worktree(&repositories_dir, &owner, &repository, pr_number)
    })
    .await?
}

#[tauri::command]
pub async fn worktree_path(
    state: State<'_, AppState>,
    request: GetSavedReviewRequest,
) -> Result<String> {
    let dir = ensure_worktree(&state, request).await?;

    Ok(dir.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn list_editors() -> Vec<String> {
    editor::installed()
}

#[tauri::command]
pub async fn open_in_editor(
    state: State<'_, AppState>,
    request: GetSavedReviewRequest,
    editor: String,
) -> Result<()> {
    let dir = ensure_worktree(&state, request).await?;
    editor::open(&editor, &dir)?;

    Ok(())
}
