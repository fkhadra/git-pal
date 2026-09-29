use tauri::State;

use crate::{
    core::AppState,
    window::{self},
};

use git_pal_github::{
    github::{self, Token},
    graphql::UserProfile,
};

use super::{CommandError, Result};

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
pub fn delete_token(state: State<'_, AppState>) -> Result<()> {
    if state.vault.delete_token().is_err() {
        return Err(CommandError::UnableToDeleteToken);
    }

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
pub async fn get_token(state: State<'_, AppState>) -> Result<Token> {
    let token = state.github_client.get_token()?;

    Ok(token)
}
