use std::collections::HashMap;

use tauri::{Manager, State};
use tauri_plugin_autostart::ManagerExt;
use thiserror::Error;

use crate::{
    core::{notification, settings, AppState},
    github::{self, query::search_pull_request::SearchPullRequestSearchNodes::PullRequest},
    window,
};

#[derive(Debug, Error)]
pub enum CommandError {
    #[error("unable to delete token")]
    UnableToDeleteToken,
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
    token: String,
) -> Result<github::UserProfile> {
    let mut client = state.client.lock().await;

    client.set_token(&token);

    let r = client.load_user_profile().await?;

    state.vault.save_token(&token)?;

    Ok(r)
}

#[tauri::command]
pub async fn is_authenticated(state: State<'_, AppState>) -> Result<github::UserProfileViewer> {
    let mut client = state.client.lock().await;

    if !client.is_token_set() {
        return Err(github::Error::MissingToken.into());
    }

    if let Some(user) = client.user.as_ref().cloned() {
        return Ok(user);
    }

    let p = client.load_user_profile().await?;

    Ok(p.data.viewer)
}

#[tauri::command]
pub async fn homepage(state: State<'_, AppState>) -> Result<github::Homepage> {
    Ok(state.client.lock().await.homepage().await?)
}

#[tauri::command]
pub async fn find_pull_requests(
    state: State<'_, AppState>,
    filter: github::FindPullRequestsFilter,
) -> Result<github::FindPullRequestResult> {
    let is_review_requested = filter == github::FindPullRequestsFilter::ReviewRequested;
    let response = state.client.lock().await.find_pull_requests(filter).await?;

    if is_review_requested {
        let mut prs = state.pull_requests.lock().await;

        for v in response.data.search.nodes.iter().flatten().flatten() {
            if let PullRequest(pr) = v {
                prs.insert(pr.id.clone(), pr.clone());
            }
        }
    }

    Ok(response)
}

#[tauri::command]
pub async fn monitor_review_requested(app_handle: tauri::AppHandle) -> Result<()> {
    let app = app_handle.clone();

    tokio::task::spawn(async move {
        let state: State<'_, AppState> = app.state();
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(20));

        loop {
            interval.tick().await;

            let response = state
                .client
                .lock()
                .await
                .find_pull_requests(github::FindPullRequestsFilter::ReviewRequested)
                .await;

            match response {
                Ok(response) => {
                    let mut prs = state.pull_requests.lock().await;

                    for v in response.data.search.nodes.iter().flatten().flatten() {
                        if let PullRequest(pr) = v {
                            if !prs.contains_key(&pr.id) {
                                log::debug!("New PR detected, notifiying {}", &pr.title);

                                state
                                    .notification_manager
                                    .push_notification(
                                        &format!("Review Request {}", pr.repository.name),
                                        &pr.title,
                                        Some(notification::Category::ReviewRequested),
                                        Some(HashMap::from([("url".to_string(), pr.url.clone())])),
                                    )
                                    .await;
                            }
                            prs.insert(pr.id.clone(), pr.clone());
                        }
                    }
                }
                Err(err) => {
                    log::error!("Error fetching review requested pull requests: {}", err);
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn find_repositories(
    state: State<'_, AppState>,
    params: github::FindRepositoriesRequest,
) -> Result<github::FindRepositoriesResult> {
    Ok(state.client.lock().await.find_repositories(params).await?)
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
    return app_handle.autolaunch().is_enabled();
}

#[tauri::command]
pub fn enable_autostart(app_handle: tauri::AppHandle) -> Result<(), tauri_plugin_autostart::Error> {
    return app_handle.autolaunch().enable();
}

#[tauri::command]
pub fn disable_autostart(
    app_handle: tauri::AppHandle,
) -> Result<(), tauri_plugin_autostart::Error> {
    return app_handle.autolaunch().disable();
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
    state
        .oauth_client
        .lock()
        .await
        .start_auth_flow()
        .map_err(|_| CommandError::UnableToDeleteToken)
}

#[tauri::command]
pub async fn find_workflows(
    state: State<'_, AppState>,
    params: github::FindWorkflowsRequest<'_>,
) -> Result<github::ApiResponse<github::Workflows>> {
    let res = state.client.lock().await.find_workflows(params).await?;

    Ok(res)
}

#[tauri::command]
pub async fn extract_workflow_variables(
    state: State<'_, AppState>,
    params: github::FileRequest<'_>,
) -> Result<github::ApiResponse<github::WorkflowInputs>> {
    let res = state
        .client
        .lock()
        .await
        .extract_workflow_variables(params)
        .await?;

    Ok(res)
}

#[tauri::command]
pub async fn run_workflow(
    state: State<'_, AppState>,
    params: github::RunWorkflowRequest<'_>,
) -> Result<()> {
    let _ = state.client.lock().await.run_workflow(params).await?;

    Ok(())
}

#[tauri::command]
pub async fn update_setting(app_handle: tauri::AppHandle, params: settings::Value) -> Result<()> {
    let state: State<'_, AppState> = app_handle.state();

    state.update_setting(&app_handle, params)?;
    Ok(())
}

#[tauri::command]
pub async fn get_setting(
    state: State<'_, AppState>,
    params: settings::Key,
) -> Result<Option<String>> {
    Ok(state.settings.get(params)?)
}

#[tauri::command]
pub async fn get_all_settings(state: State<'_, AppState>) -> Result<HashMap<String, String>> {
    Ok(state.settings.get_all()?)
}
