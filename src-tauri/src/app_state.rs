use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{async_runtime::Mutex, AppHandle, Emitter, Manager};
use ts_rs::TS;
use url::Url;

use crate::{
    github::{self, oauth},
    vault::Vault,
    window,
};

pub struct AppState {
    pub client: Mutex<github::Client>,
    pub vault: Vault,
    pub oauth_client: Mutex<oauth::Client>,
    pub should_do_setup: AtomicBool,
}

impl AppState {
    pub fn new() -> Self {
        let vault = Vault::new("git-pal", "token").expect("vault should build");
        let token = vault.get_token().ok();
        let should_do_setup = token.is_none();

        AppState {
            vault,
            client: Mutex::new(github::Client::new(token)),
            oauth_client: Mutex::new(oauth::Client::new()),
            should_do_setup: AtomicBool::new(should_do_setup),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, TS)]
#[ts(export, export_to = "../../src/models/events.ts")]
struct AuthMessage {
    msg: Option<String>,
    ok: bool,
}

pub fn handle_deeplink(app_handle: &AppHandle, urls: Vec<Url>) {
    let app_handle = app_handle.to_owned();

    tauri::async_runtime::spawn(async move {
        for url in urls {
            if let Some(host) = url.host() {
                if host.to_string() == "github" && url.path() == "/auth-callback" {
                    log::debug!("deep link URLs: {:?}", url);

                    let state = app_handle.state::<AppState>();
                    let mut client = state.oauth_client.lock().await;

                    match client.exchange_code(url).await {
                        Ok(res) => {
                            state.should_do_setup.store(false, Ordering::Relaxed);
                            state.client.lock().await.set_token(&res.access_token);

                            log::info!("successfully authenticated");

                            app_handle
                                .emit(
                                    "AuthMessage",
                                    AuthMessage {
                                        ok: true,
                                        msg: None,
                                    },
                                )
                                .unwrap_or_else(|err| {
                                    log::error!("Failed to emit AuthMessage {}", err)
                                });

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

                            app_handle
                                .emit(
                                    "AuthMessage",
                                    AuthMessage {
                                        ok: false,
                                        msg: Some(err.to_string()),
                                    },
                                )
                                .unwrap_or_else(|err| {
                                    log::error!("Failed to emit AuthMessage {}", err)
                                });
                        }
                    }
                }
            }
        }
    });
}
