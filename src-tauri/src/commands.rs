use std::{str::FromStr, time::Duration};

use git_pal_settings::SettingValue;
use tauri::{Manager, State};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_updater::UpdaterExt;
use thiserror::Error;

use crate::{
    core::{AppState, AppUpdate},
    window,
};

use git_pal_feedback::NewFeedback;
use git_pal_github::{
    github::{self, Token},
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
    #[error("failed to stop job <{0}> : {1}")]
    FailedToStopMonitoring(String, String),
    #[error(transparent)]
    GithubApi(#[from] github::Error),
    #[error(transparent)]
    Vault(#[from] keyring::Error),
    #[error(transparent)]
    Window(#[from] window::Error),
    #[error(transparent)]
    Autostart(#[from] tauri_plugin_autostart::Error),
    #[error("invalid shortcut: {0}")]
    Shortcut(String),
    #[error(transparent)]
    Updater(#[from] tauri_plugin_updater::Error),
    #[error(transparent)]
    Notification(#[from] user_notify::Error),
    #[error(transparent)]
    Anyhow(#[from] anyhow::Error),
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
    let job_name = "monitor_pr";
    state
        .job_runner
        .stop_job(job_name)
        .map_err(|e| CommandError::FailedToStopMonitoring(job_name.to_string(), e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub async fn monitor_review_requested(app_handle: tauri::AppHandle) -> Result<()> {
    let state: State<'_, AppState> = app_handle.state();
    let interval = match state
        .setting_manager
        .lock()
        .unwrap()
        .get(git_pal_settings::SettingKey::MonitorInterval)
    {
        SettingValue::MonitorInterval(i) => Duration::from_secs(i as u64),
        _ => Duration::from_secs(20),
    };

    let captured_handle = app_handle.clone();

    state
        .job_runner
        .start_job("monitor_pr".to_string(), interval, move || {
            let handle = captured_handle.clone();
            async move {
                log::debug!("Monitoring tick");
                let state: State<'_, AppState> = handle.state();
                state.handle_pr_monitor().await;
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

#[tauri::command]
pub async fn submit_feedback(data: NewFeedback) -> Result<()> {
    git_pal_feedback::submit_feedback(data).await?;
    Ok(())
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

#[tauri::command]
pub async fn check_for_update(app_handle: tauri::AppHandle) -> Result<Option<AppUpdate>> {
    if let Some(update) = app_handle.updater()?.check().await? {
        let u = AppUpdate {
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
pub async fn get_token(state: State<'_, AppState>) -> Result<Token> {
    let token = state.github_client.get_token()?;

    Ok(token)
}

#[tauri::command]
pub fn restart_app(app_handle: tauri::AppHandle) {
    app_handle.restart()
}

#[tauri::command]
pub async fn notification_ask_permissions(state: State<'_, AppState>) -> Result<()> {
    let authorized = state
        .notification_manager
        .manager
        .get_notification_permission_state()
        .await
        .map_err(|err| CommandError::Notification(err))?;

    if !authorized {
        state
            .notification_manager
            .manager
            .first_time_ask_for_notification_permission()
            .await
            .map_err(|err| CommandError::Notification(err))?;
    }

    Ok(())
}
