use std::{
    collections::HashMap,
    env, fs,
    path::PathBuf,
    sync::{self, Mutex},
};

use git_pal_agent::AgentStore;
use git_pal_code_review::{CodeReviewStore, models::GetSavedReviewRequest};
use git_pal_job_runner::{Job, JobRunner};
use git_pal_settings::{SettingManager, SettingValue, Settings, Theme};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;
use tokio::sync::oneshot;
use ts_rs::TS;
use url::Url;

use super::vault::Vault;

use crate::{core::notification, window};

use git_pal_github::{
    github,
    graphql::FindPullRequestsFilter,
    oauth::{self, PendingAuth},
    query::{self, search_pull_request::SearchPullRequestSearchNodes::PullRequest},
    scope::SearchScope,
};

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "updater.ts")]
pub struct AppUpdate {
    pub body: Option<String>,
    /// Version used to check for update
    pub current_version: String,
    /// Version announced
    pub version: String,
    /// Update publish date
    pub date: Option<String>,
}

pub struct AppState {
    pub github_client: github::Client,
    pub oauth_client: oauth::Client,
    pub vault: Vault,
    pub pull_requests: Mutex<HashMap<String, query::search_pull_request::PullRequest>>,
    pub notification_manager: notification::NotificationManager,
    pub pending_auth: Mutex<Option<PendingAuth>>,
    pub setting_manager: Mutex<SettingManager>,
    pub job_runner: JobRunner,
    pub code_review_store: CodeReviewStore,
    pub agent_store: AgentStore,
    pub agent_runs: Mutex<HashMap<i64, oneshot::Sender<()>>>,
    app_dir: PathBuf,
}

const DATABASE: &str = "git-pal.db";

impl AppState {
    pub fn new() -> Self {
        let vault = Vault::new("git-pal", "token").expect("vault should build");
        let token = vault.get_token().ok();
        let app_dir = app_dir();
        // TODO: properly handle errors here, for example we could show
        // a dedicated window to tell the tuser how to fix the issue and what's going on
        let setting_manager =
            Mutex::new(SettingManager::new(app_dir.join("settings.json")).unwrap());
        let db = tauri::async_runtime::block_on(git_pal_database::connect(app_dir.join(DATABASE)))
            .expect("database should connect");

        AppState {
            vault,
            github_client: github::Client::new(token),
            oauth_client: oauth::Client::new(),
            pull_requests: Mutex::new(HashMap::new()),
            app_dir,
            notification_manager: notification::NotificationManager::new(),
            setting_manager,
            pending_auth: sync::Mutex::new(None),
            job_runner: JobRunner::new(),
            code_review_store: CodeReviewStore::new(db.clone()),
            agent_store: AgentStore::new(db),
            agent_runs: Mutex::new(HashMap::new()),
        }
    }

    pub fn update_setting(
        &self,
        handle: &AppHandle,
        value: git_pal_settings::SettingValue,
    ) -> Settings {
        match &value {
            git_pal_settings::SettingValue::Theme(theme) => {
                emit_event(handle, Event::ThemeChanged(theme.clone()));
            }
            rest => {
                emit_event(handle, Event::SettingChanged(rest.clone()));
            }
        }

        let mut guard = self.setting_manager.lock().unwrap();
        guard.set(value);
        if let Err(e) = guard.save() {
            log::error!("Failed to save settings: {}", e);
        }

        guard.settings.clone()
    }

    pub fn get_settings(&self) -> Settings {
        self.setting_manager.lock().unwrap().settings.clone()
    }

    pub fn search_scope(&self) -> SearchScope {
        let filter = self.get_settings().repository_filter;

        SearchScope {
            include: filter.include,
            exclude: filter.exclude,
        }
    }

    pub fn app_dir(&self) -> PathBuf {
        self.app_dir.clone()
    }

    pub fn repositories_dir(&self) -> PathBuf {
        self.app_dir.join("repositories")
    }

    pub async fn handle_pr_monitor(&self) {
        let response = self
            .github_client
            .find_pull_requests(
                FindPullRequestsFilter::ReviewRequested,
                &self.search_scope(),
                self.get_settings().pull_request_limit,
            )
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
                            Some(notification::review_metadata(
                                pr.url,
                                pr.repository.owner.login,
                                pr.repository.name,
                                pr.number,
                            )),
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
                    if let Err(err) = state.vault.save_token(&res.access_token) {
                        log::error!("Failed to save token {}", err)
                    }

                    state.github_client.set_token(res.access_token);

                    log::info!("successfully authenticated");
                    emit_event(
                        &app_handle,
                        Event::AuthMessage(AuthPayload {
                            msg: None,
                            ok: true,
                        }),
                    );

                    window::handle_setup_completed(&app_handle);
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

pub fn start_updater(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_hours(1));

        loop {
            let app = app_handle.clone();
            interval.tick().await;
            if let Err(err) = check_for_update(app).await {
                log::error!("updater error: {}", err)
            }
        }
    });
}

pub async fn check_for_update(app_handle: AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app_handle.updater()?.check().await? {
        let mut downloaded = 0;

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

        emit_event(
            &app_handle,
            Event::UpdateInstalled(AppUpdate {
                body: update.body,
                current_version: update.current_version,
                version: update.version,
                date: update.date.map(|v| v.to_string()),
            }),
        );
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
    SettingChanged(SettingValue),
    UpdateInstalled(AppUpdate),
    JobMessage(Job),
    ReviewSelected(GetSavedReviewRequest),
}

pub fn emit_event(handle: &AppHandle, event: Event) {
    let ev = match &event {
        Event::AuthMessage(_) => "AuthMessage",
        Event::ThemeChanged(_) => "ThemeChanged",
        Event::SettingChanged(_) => "SettingChanged",
        Event::UpdateInstalled(_) => "UpdateInstalled",
        Event::JobMessage(_) => "JobMessage",
        Event::ReviewSelected(_) => "ReviewSelected",
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
