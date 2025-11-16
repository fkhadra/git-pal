use std::{
    collections::HashMap,
    env, fs,
    path::PathBuf,
    sync::atomic::{AtomicBool, Ordering},
};

use serde::Serialize;
use tauri::{async_runtime::Mutex, AppHandle, Emitter, Manager};
use ts_rs::TS;
use url::Url;

use super::{settings::Store, vault::Vault};

use crate::{
    core::{notification, settings},
    github::{self, oauth},
    window,
};

pub struct AppState {
    pub client: Mutex<github::Client>,
    pub vault: Vault,
    pub oauth_client: Mutex<oauth::Client>,
    pub should_do_setup: AtomicBool,
    pub settings: Store,
    pub pull_requests: Mutex<HashMap<String, github::query::search_pull_request::PullRequest>>,
    pub notification_manager: notification::NotificationManager,
    app_dir: PathBuf,
}

impl AppState {
    pub fn new() -> Self {
        let vault = Vault::new("git-pal", "token").expect("vault should build");
        let token = vault.get_token().ok();
        let should_do_setup = token.is_none();
        let app_dir = app_dir();
        let db_path = app_dir.join("db");

        AppState {
            vault,
            client: Mutex::new(github::Client::new(token)),
            oauth_client: Mutex::new(oauth::Client::new()),
            should_do_setup: AtomicBool::new(should_do_setup),
            pull_requests: Mutex::new(HashMap::new()),
            app_dir: app_dir,
            notification_manager: notification::NotificationManager::new(),
            settings: Store::new(db_path.to_str().expect("should always be set")),
        }
    }

    pub fn update_setting(
        &self,
        handle: &AppHandle,
        value: settings::Value,
    ) -> Result<(), redb::Error> {
        if let settings::Value::Theme(ref v) = value {
            emit_event(handle, Event::ThemeChanged(v.to_owned()));
        }

        self.settings.set(value)
    }

    pub fn app_dir(&self) -> PathBuf {
        self.app_dir.clone()
    }
}

pub fn handle_deeplink(app_handle: &AppHandle, urls: Vec<Url>) {
    let app_handle = app_handle.to_owned();

    tauri::async_runtime::spawn(async move {
        for url in urls {
            if let Some(host) = url.host() {
                if host.to_string() == "github" && url.path() == "/auth-callback" {
                    let state = app_handle.state::<AppState>();
                    let mut client = state.oauth_client.lock().await;

                    match client.exchange_code(url).await {
                        Ok(res) => {
                            state.should_do_setup.store(false, Ordering::Relaxed);
                            state.client.lock().await.set_token(&res.access_token);

                            log::info!("successfully authenticated");
                            emit_event(
                                &app_handle,
                                Event::Authenticated(AuthMessage {
                                    msg: None,
                                    ok: true,
                                }),
                            );

                            window::create_main_window(&app_handle).unwrap_or_else(|err| {
                                log::error!("Failed to create main window after auth {}", err)
                            });

                            // state
                            //     .vault
                            //     .save_token(&res.access_token)
                            //     .unwrap_or_else(|err| log::error!("Failed to save token {}", err));
                        }
                        Err(err) => {
                            log::error!("Failed to exchange code {}", err);

                            emit_event(
                                &app_handle,
                                Event::Authenticated(AuthMessage {
                                    ok: false,
                                    msg: Some(err.to_string()),
                                }),
                            );
                        }
                    }
                }
            }
        }
    });
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/models/events.ts")]
pub struct AuthMessage {
    msg: Option<String>,
    ok: bool,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/models/events.ts")]
#[serde(rename_all = "camelCase")]
pub enum Event {
    Authenticated(AuthMessage),
    ThemeChanged(settings::Theme),
}

pub fn emit_event(handle: &AppHandle, event: Event) {
    let ev = match &event {
        Event::Authenticated(_) => "AuthMessage",
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
