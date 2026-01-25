use std::str::FromStr;

use serde::Serialize;
use tauri::{Manager, State};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_updater::UpdaterExt;
use thiserror::Error;
use ts_rs::TS;

use crate::{
    core::{AppState, JobStatus},
    window,
};

use git_pal_github::{
    github,
    graphql::{
        FindPullRequestResult, FindPullRequestsFilter, FindRepositoriesRequest,
        FindRepositoriesResult, Homepage, UserProfile,
    },
    query::search_pull_request::SearchPullRequestSearchNodes::PullRequest,
    rest::{
        FileRequest, FindWorkflowsRequest, RestResponse, RunWorkflowRequest, WorkflowInputs,
        Workflows,
    },
};

#[derive(Debug, Error)]
pub enum CommandError {
    #[error("unable to delete token")]
    UnableToDeleteToken,
    #[error("failed to stop monitoring")]
    FailedToStopMonitoring,
    #[error(transparent)]
    GithubApi(#[from] github::Error),
    #[error(transparent)]
    Vault(#[from] keyring::Error),
    #[error(transparent)]
    Window(#[from] window::Error),
    #[error(transparent)]
    Autostart(#[from] tauri_plugin_autostart::Error),
    #[error(transparent)]
    Settings(#[from] redb::Error),
    #[error("invalid shortcut: {0}")]
    Shortcut(String),
    #[error(transparent)]
    Updater(#[from] tauri_plugin_updater::Error),
}

impl serde::Serialize for CommandError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

type Result<T, E = CommandError> = std::result::Result<T, E>;

#[tauri::command]
pub async fn authenticate(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    token: String,
) -> Result<UserProfile> {
    state.github_client.set_token(token.clone());

    let response = state.github_client.load_user_profile().await?;

    #[cfg(not(debug_assertions))]
    state.vault.save_token(&token)?;

    window::handle_setup_completed(&app_handle);

    Ok(response)
}

#[tauri::command]
pub async fn is_authenticated(state: State<'_, AppState>) -> Result<UserProfile> {
    if !state.github_client.is_token_set() {
        return Err(github::Error::MissingToken.into());
    }

    if let Some(user) = state.github_client.get_user() {
        return Ok(user);
    }

    let user = state.github_client.load_user_profile().await?;

    Ok(user)
}

#[tauri::command]
pub async fn homepage(state: State<'_, AppState>) -> Result<Homepage> {
    Ok(state.github_client.homepage().await?)
}

#[tauri::command]
pub async fn find_pull_requests(
    state: State<'_, AppState>,
    filter: FindPullRequestsFilter,
) -> Result<FindPullRequestResult> {
    let is_review_requested = filter == FindPullRequestsFilter::ReviewRequested;
    let response = state.github_client.find_pull_requests(filter).await?;

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
pub async fn stop_monitoring(state: State<'_, AppState>) -> Result<()> {
    state
        .pull_requests_ch
        .send(JobStatus::Stopped)
        .map_err(|_| CommandError::FailedToStopMonitoring)
}

#[tauri::command]
pub async fn monitor_review_requested(app_handle: tauri::AppHandle) -> Result<()> {
    let app = app_handle.clone();

    tokio::spawn(async move {
        let state: State<'_, AppState> = app.state();
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(20));
        let mut rx = state.pull_requests_ch.subscribe();

        log::debug!("Starting pull request monitoring");

        loop {
            tokio::select! {
                _ = rx.changed() => {
                    if  *rx.borrow() == JobStatus::Stopped {
                        log::debug!("stopping pull requests monitoring");
                        break;
                    }
                }
                _ = interval.tick() => {
                    log::debug!("Monitoring tick");
                    state.handle_pr_monitor().await;
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn find_repositories(
    state: State<'_, AppState>,
    params: FindRepositoriesRequest,
) -> Result<FindRepositoriesResult> {
    Ok(state.github_client.find_repositories(params).await?)
}

#[tauri::command]
pub fn delete_token(state: State<'_, AppState>) -> Result<()> {
    if state.vault.delete_token().is_err() {
        return Err(CommandError::UnableToDeleteToken);
    }

    Ok(())
}

#[tauri::command]
pub fn is_autostart_enabled(
    app_handle: tauri::AppHandle,
) -> Result<bool, tauri_plugin_autostart::Error> {
    app_handle.autolaunch().is_enabled()
}

#[tauri::command]
pub fn enable_autostart(app_handle: tauri::AppHandle) -> Result<(), tauri_plugin_autostart::Error> {
    app_handle.autolaunch().enable()
}

#[tauri::command]
pub fn disable_autostart(
    app_handle: tauri::AppHandle,
) -> Result<(), tauri_plugin_autostart::Error> {
    app_handle.autolaunch().disable()
}

#[tauri::command]
pub async fn show_window(w: tauri::Window) -> Result<()> {
    let ww = w
        .get_webview_window(w.label())
        .ok_or_else(|| window::Error::WindowNotFound {
            label: w.label().to_string(),
            err: String::from("Window not found in manager"),
        })?;

    window::show_window(&ww)?;
    Ok(())
}

#[tauri::command]
pub async fn start_oauth_flow(state: State<'_, AppState>) -> Result<()> {
    if let Ok(pending_auth) = state
        .oauth_client
        .start_auth_flow()
        .map_err(|_| CommandError::UnableToDeleteToken)
    {
        state.pending_auth.lock().unwrap().replace(pending_auth);
    }

    Ok(())
}

#[tauri::command]
pub async fn find_workflows(
    state: State<'_, AppState>,
    params: FindWorkflowsRequest<'_>,
) -> Result<RestResponse<Workflows>> {
    let res = state.github_client.find_workflows(params).await?;

    Ok(res)
}

#[tauri::command]
pub async fn extract_workflow_variables(
    state: State<'_, AppState>,
    params: FileRequest<'_>,
) -> Result<RestResponse<WorkflowInputs>> {
    let res = state
        .github_client
        .extract_workflow_variables(params)
        .await?;

    Ok(res)
}

#[tauri::command]
pub async fn run_workflow(
    state: State<'_, AppState>,
    params: RunWorkflowRequest<'_>,
) -> Result<()> {
    state.github_client.run_workflow(params).await?;

    Ok(())
}

#[tauri::command]
pub async fn update_setting(
    app_handle: tauri::AppHandle,
    params: git_pal_settings::SettingValue,
) -> Result<git_pal_settings::Settings> {
    let state: State<'_, AppState> = app_handle.state();
    Ok(state.update_setting(&app_handle, params))
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<git_pal_settings::Settings> {
    Ok(state.get_settings())
}

// TODO: Refactor
#[tauri::command]
pub async fn replace_global_shortcut(app_handle: tauri::AppHandle, params: String) -> Result<()> {
    let new_shortcut =
        Shortcut::from_str(&params).map_err(|err| CommandError::Shortcut(err.to_string()))?;

    let state: State<'_, AppState> = app_handle.state();
    let old_shortcut = {
        state
            .setting_manager
            .lock()
            .unwrap()
            .replace_global_shortcut(params.clone())
    };

    let old_str =
        Shortcut::from_str(&old_shortcut).map_err(|err| CommandError::Shortcut(err.to_string()))?;

    app_handle
        .global_shortcut()
        .unregister(old_str)
        .map_err(|err| CommandError::Shortcut(err.to_string()))?;

    app_handle
        .global_shortcut()
        .register(new_shortcut)
        .map_err(|err| CommandError::Shortcut(err.to_string()))?;

    Ok(())
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "updater.ts")]

pub struct Update {
    pub body: Option<String>,
    /// Version used to check for update
    pub current_version: String,
    /// Version announced
    pub version: String,
    /// Update publish date
    pub date: Option<String>,
}

#[tauri::command]
pub async fn check_for_update(app_handle: tauri::AppHandle) -> Result<Option<Update>> {
    if let Some(update) = app_handle.updater()?.check().await? {
        let u = Update {
            body: update.body,
            current_version: update.current_version,
            version: update.version,
            date: update.date.map(|v| v.to_string()),
        };

        return Ok(Some(u));
    }

    Ok(None)
}

#[tauri::command]
pub async fn get_token(state: State<'_, AppState>) -> Result<String> {
    let token = state.vault.get_token()?;
    Ok(token)
}
