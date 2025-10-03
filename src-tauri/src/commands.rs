use tauri::{Manager, State};
use tauri_plugin_autostart::ManagerExt;
use thiserror::Error;

use crate::{app_state::AppState, github, window};

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
pub async fn search_pull_requests(
    state: State<'_, AppState>,
    filter: String,
) -> Result<github::SearchResult> {
    Ok(state
        .client
        .lock()
        .await
        .search_pull_requests(filter.as_str())
        .await?)
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
