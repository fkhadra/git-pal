use tauri::{async_runtime::Mutex, AppHandle, Emitter, Manager};
use ts_rs::TS;
use url::Url;

use crate::{github, vault::Vault};

pub struct AppState {
    pub client: Mutex<github::Client>,
    pub vault: Vault,
    pub oauth_client: Mutex<github::OAuth2Client>,
}

impl AppState {
    pub fn new() -> Self {
        let vault = Vault::new("git-pal", "token").unwrap();
        let token = vault.get_token().ok();

        AppState {
            vault,
            client: Mutex::new(github::Client::new(token)),
            oauth_client: Mutex::new(github::OAuth2Client::new()),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, TS)]
#[ts(export, export_to = "../../src/models/events.ts")]
enum AuthMsg {
    AuthFailed { msg: String, ok: bool },
    AuthSuccess { ok: bool },
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
                            state.client.lock().await.set_token(&res.access_token);
                            app_handle
                                .emit("AuthMessage", AuthMsg::AuthSuccess { ok: true })
                                .unwrap_or_else(|err| {
                                    log::error!("Failed to emit AuthMessage {}", err)
                                });

                            state
                                .vault
                                .save_token(&res.access_token)
                                .unwrap_or_else(|err| log::error!("Failed to save token {}", err));
                        }
                        Err(err) => app_handle
                            .emit(
                                "AuthMessage",
                                AuthMsg::AuthFailed {
                                    msg: err.to_string(),
                                    ok: false,
                                },
                            )
                            .unwrap_or_else(|err| {
                                log::error!("Failed to emit AuthMessage {}", err)
                            }),
                    }
                }
            }
        }
    });
}
