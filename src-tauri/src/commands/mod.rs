use thiserror::Error;

use crate::window;

pub mod agent;
pub mod app;
pub mod auth;
pub mod github;
pub mod monitoring;
pub mod review;
pub mod templates;
pub mod workflows;
pub mod worktree;

#[derive(Debug, Error)]
pub enum CommandError {
    #[error("unable to delete token")]
    UnableToDeleteToken,
    #[error("failed to stop job <{0}> : {1}")]
    FailedToStopMonitoring(String, String),
    #[error(transparent)]
    GithubApi(#[from] git_pal_github::github::Error),
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
