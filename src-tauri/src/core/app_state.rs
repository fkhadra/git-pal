use std::{
    collections::HashMap,
    env, fs,
    path::PathBuf,
    sync::{self, Mutex},
};

use git_pal_settings::{SettingManager, Settings, Theme};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;
use tokio::sync::watch::{self, Sender};
use ts_rs::TS;
use url::Url;

use super::vault::Vault;

use crate::{core::notification, window};

use git_pal_github::{
    github,
    graphql::FindPullRequestsFilter,
    oauth::{self, PendingAuth},
    query::{self, search_pull_request::SearchPullRequestSearchNodes::PullRequest},
};

#[derive(Debug, PartialEq, Eq)]
pub enum JobStatus {
    Idle,
    Stopped,
}

pub struct AppState {
    pub github_client: github::Client,
    pub oauth_client: oauth::Client,
    pub vault: Vault,
    pub pull_requests: Mutex<HashMap<String, query::search_pull_request::PullRequest>>,
    pub pull_requests_ch: Sender<JobStatus>,
    pub notification_manager: notification::NotificationManager,
    pub pending_auth: Mutex<Option<PendingAuth>>,
    setting_manager: Mutex<SettingManager>,
    app_dir: PathBuf,
}

impl AppState {
    pub fn new() -> Self {
        let vault = Vault::new("git-pal", "token").expect("vault should build");
        let token = vault.get_token().ok();
        let app_dir = app_dir();
        let (tx, _) = watch::channel(JobStatus::Idle);
        let setting_manager =
            Mutex::new(SettingManager::new(app_dir.join("settings.json")).unwrap());

        AppState {
            vault,
            github_client: github::Client::new(token),
            oauth_client: oauth::Client::new(),
            pull_requests: Mutex::new(HashMap::new()),
            app_dir,
            notification_manager: notification::NotificationManager::new(),
            pull_requests_ch: tx,
            setting_manager,
            pending_auth: sync::Mutex::new(None),
        }
    }

    pub fn update_setting(
        &self,
        handle: &AppHandle,
        value: git_pal_settings::SettingValue,
    ) -> Settings {
        if let git_pal_settings::SettingValue::Theme(ref v) = value {
            emit_event(handle, Event::ThemeChanged(v.clone()));
        }

        let mut guard = self.setting_manager.lock().unwrap();
        guard.set(value);

        guard.settings.clone()
    }

    pub fn get_settings(&self) -> Settings {
        self.setting_manager.lock().unwrap().settings.clone()
    }

    pub fn app_dir(&self) -> PathBuf {
        self.app_dir.clone()
    }

    pub async fn handle_pr_monitor(&self) {
        let response = self
            .github_client
            .find_pull_requests(FindPullRequestsFilter::ReviewRequested)
            .await;

        match response {
            Ok(response) => {
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

                let mut queue: Vec<query::search_pull_request::PullRequest> = Vec::new();
                {
                    let mut prs = self.pull_requests.lock().unwrap();

                    for (id, pr) in data {
                        if !prs.contains_key(&id) {
                            queue.push(pr.clone());
                        }
                        prs.insert(id, pr);
                    }
                }

                for pr in queue {
                    self.notification_manager
                        .push_notification(
                            &format!("Review Requested: {}", pr.repository.name),
                            &pr.title,
                            Some(notification::Category::ReviewRequested),
                            Some(HashMap::from([("url".to_string(), pr.url)])),
                        )
                        .await;
                }
            }
            Err(err) => {
                log::error!("Error fetching review requested pull requests: {}", err);
            }
        }
    }
}

pub fn handle_deeplink(app_handle: &AppHandle, urls: Vec<Url>) {
    let app_handle = app_handle.clone();

    tauri::async_runtime::spawn(async move {
        for url in urls {
            let Some(host) = url.host() else {
                return;
            };

            if !matches!(host, url::Host::Domain("github")) || url.path() != "/auth-callback" {
                return;
            }

            let state = app_handle.state::<AppState>();
            let maybe_pending_auth = {
                let mut lock = state.pending_auth.lock().unwrap();
                lock.take()
            };

            let Some(pending_auth) = maybe_pending_auth else {
                emit_event(
                    &app_handle,
                    Event::AuthMessage(AuthPayload {
                        ok: false,
                        msg: Some(
                            "failed to authenticated: pending auth state missing".to_string(),
                        ),
                    }),
                );

                return;
            };

            match state.oauth_client.exchange_code(url, pending_auth).await {
                Ok(res) => {
                    state
                        .vault
                        .save_token(&res.access_token)
                        .unwrap_or_else(|err| log::error!("Failed to save token {}", err));
                    state.github_client.set_token(res.access_token);

                    log::info!("successfully authenticated");
                    emit_event(
                        &app_handle,
                        Event::AuthMessage(AuthPayload {
                            msg: None,
                            ok: true,
                        }),
                    );

                    window::create_main_window(&app_handle).unwrap_or_else(|err| {
                        log::error!("Failed to create main window after auth {}", err)
                    });

                    let s = app_handle.get_webview_window("Setup").unwrap();

                    window::show_window(&s)
                        .unwrap_or_else(|_| log::error!("Failed to display setup window again"))
                }
                Err(err) => {
                    log::error!("Failed to exchange code {}", err);

                    emit_event(
                        &app_handle,
                        Event::AuthMessage(AuthPayload {
                            ok: false,
                            msg: Some(err.to_string()),
                        }),
                    );
                }
            }
        }
    });
}

pub async fn handle_app_update(app: AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let mut downloaded = 0;

        // alternatively we could also call update.download() and update.install() separately
        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    log::info!("downloaded {downloaded} from {content_length:?}");
                },
                || {
                    log::info!("download finished");
                },
            )
            .await?;

        log::info!("update installed");
        // app.restart();
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "events.ts")]
pub struct AuthPayload {
    msg: Option<String>,
    ok: bool,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "events.ts")]
#[serde(rename_all = "camelCase")]
pub enum Event {
    AuthMessage(AuthPayload),
    ThemeChanged(Theme),
}

pub fn emit_event(handle: &AppHandle, event: Event) {
    let ev = match &event {
        Event::AuthMessage(_) => "AuthMessage",
        Event::ThemeChanged(_) => "ThemeChanged",
    };

    handle
        .emit(ev, event)
        .unwrap_or_else(|err| log::error!("failed to emit event: {}", err));
}

fn app_dir() -> PathBuf {
    let home_dir = match env::home_dir() {
        Some(h) => h,
        None => return env::temp_dir(),
    };

    let app_dir = home_dir.join(".config/git-pal");
    match fs::create_dir_all(&app_dir) {
        Ok(_) => app_dir,
        Err(_) => env::temp_dir(),
    }
}
