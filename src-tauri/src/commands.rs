use tauri::{async_runtime::Mutex, State};
use thiserror::Error;

use crate::{github, vault::Vault};

pub struct AppState {
    client: Mutex<github::Client>,
    vault: Vault,
}

impl AppState {
    pub fn new() -> Self {
        let vault = Vault::new("git-pal", "token").unwrap();
        let token = vault.get_token().ok();

        AppState {
            vault,
            client: Mutex::new(github::Client::new(token)),
        }
    }
}

#[derive(Debug, Error)]
pub enum CommandError {
    #[error("unable to delete token")]
    UnableToDeleteToken,
    #[error(transparent)]
    GithubApi(#[from] github::Error),
    #[error(transparent)]
    Vault(#[from] keyring::Error),
}

impl serde::Serialize for CommandError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

type Result<T> = std::result::Result<T, CommandError>;

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
