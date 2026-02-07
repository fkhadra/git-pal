use std::{fmt::Debug, str::FromStr};

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WindowEvent};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

use crate::core::AppState;

const MAIN_WINDOW_LABEL: &str = "Main";
const SETTINGS_WINDOW_LABEL: &str = "Settings";
const SETUP_WINDOW_LABEL: &str = "Setup";

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("unable to focus window '{label:}'. {err:}")]
    UnableToFocus { label: String, err: String },
    #[error("window not found '{label:}'. {err:}")]
    WindowNotFound { label: String, err: String },
    #[error("unable to check window '{label:}' visibility. {err:}")]
    UnableToCheckVisibility { label: String, err: String },
    #[error("unable to show window '{label:}'. {err:}")]
    UnableToShowWindow { label: String, err: String },
    #[error("unable to create window '{label:}'. {err:}")]
    UnableToCreateWindow { label: String, err: String },
    #[error("unable to register global shortcut: {0}")]
    UnableToRegisterGlobalShortcut(String),
    #[error("unable to parse settings: {0}")]
    UnableToParse(#[from] serde_json::Error),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

type Result<T = ()> = std::result::Result<T, Error>;

pub fn show_app(app: &AppHandle) -> Result {
    // bro still doing setup
    if let Some(setup_window) = app.get_webview_window(SETUP_WINDOW_LABEL) {
        if !app.state::<AppState>().github_client.is_token_set() {
            return show_window(&setup_window);
        }
    }

    match app.get_webview_window(MAIN_WINDOW_LABEL) {
        Some(window) => show_window(&window),
        None => create_main_window(app),
    }
}

pub fn show_settings(app: &AppHandle) -> Result {
    match app.get_webview_window(SETTINGS_WINDOW_LABEL) {
        Some(window) => show_window(&window),
        None => create_window(
            app,
            WindowConfig {
                title: "Settings",
                current_view: "settings",
                url: "settings",
                label: SETTINGS_WINDOW_LABEL,
                width: 715.0,
                height: 600.0,
            },
        ),
    }
}

pub fn on_app_start(handle: &AppHandle) -> Result {
    let state = handle.state::<AppState>();

    match state.github_client.is_token_set() {
        true => {
            log::debug!("No need to do setup");
            create_main_window(handle)?
        }
        false => {
            log::debug!("should do setup");

            create_window(
                handle,
                WindowConfig {
                    title: "Welcome to Git Pal",
                    current_view: "setup",
                    url: "setup",
                    label: SETUP_WINDOW_LABEL,
                    width: 800.0,
                    height: 600.0,
                },
            )?
        }
    };

    Ok(())
}

pub fn handle_setup_completed(app_handle: &AppHandle) {
    if let None = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
        if let Err(err) = create_main_window(app_handle) {
            log::error!("Failed to create main window after auth: {}", err)
        }
    }

    if let Some(setup_window) = app_handle.get_webview_window(SETUP_WINDOW_LABEL) {
        if let Err(err) = show_window(&setup_window) {
            log::error!("Failed to display setup window after auth: {}", err)
        }
        return;
    }

    if let Some(setting_window) = app_handle.get_webview_window(SETTINGS_WINDOW_LABEL) {
        if let Err(err) = show_window(&setting_window) {
            log::error!("Failed to display setting window after auth: {}", err)
        }
    }
}

pub fn show_window(w: &WebviewWindow) -> Result {
    if !w
        .is_visible()
        .map_err(|err| Error::UnableToCheckVisibility {
            label: w.label().to_string(),
            err: err.to_string(),
        })?
    {
        w.show().map_err(|err| Error::UnableToShowWindow {
            label: w.label().to_string(),
            err: err.to_string(),
        })?
    }

    w.set_focus().map_err(|err| Error::UnableToFocus {
        label: w.label().to_string(),
        err: err.to_string(),
    })?;

    Ok(())
}

pub fn create_main_window(handle: &AppHandle) -> Result {
    let window = tauri::WebviewWindowBuilder::new(
        handle,
        MAIN_WINDOW_LABEL,
        WebviewUrl::App("palette".into()),
    )
    .initialization_script(hydrate_global(handle, "palette")?)
    .title("Git Pal")
    .inner_size(800.0, 600.0)
    .transparent(true)
    .decorations(false)
    .resizable(false)
    .shadow(false)
    .visible(false)
    .always_on_top(true)
    .center()
    .background_throttling(tauri::utils::config::BackgroundThrottlingPolicy::Throttle)
    .build()
    .map_err(|e| Error::UnableToCreateWindow {
        label: MAIN_WINDOW_LABEL.to_string(),
        err: e.to_string(),
    })?;

    #[cfg(target_os = "macos")]
    handle
        .set_activation_policy(tauri::ActivationPolicy::Accessory)
        .expect("Failed to set activation policy");

    register_global_shortcut(handle)?;
    handle_window_events(window);

    Ok(())
}

#[cfg(debug_assertions)]
fn handle_window_events(window: WebviewWindow) {
    window.on_window_event(move |e| match e {
        WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
        }
        _ => {}
    });
}

#[cfg(not(debug_assertions))]
fn handle_window_events(window: WebviewWindow) {
    let cw = window.clone();
    window.on_window_event(move |e| match e {
        WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            if let Err(err) = cw.hide() {
                log::error!(
                    "On window close, {}",
                    Error::UnableToHideWindow {
                        label: MAIN_WINDOW_LABEL.to_string(),
                        err: err.to_string()
                    }
                )
            }
        }
        WindowEvent::Focused(focused) => {
            if !focused {
                if let Err(err) = cw.hide() {
                    log::error!(
                        "On window focus, {}",
                        Error::UnableToHideWindow {
                            label: MAIN_WINDOW_LABEL.to_string(),
                            err: err.to_string()
                        }
                    )
                }
            }
        }
        _ => {}
    });
}

struct WindowConfig<'a> {
    title: &'a str,
    current_view: &'a str,
    url: &'a str,
    label: &'a str,
    width: f64,
    height: f64,
}

fn create_window(handle: &AppHandle, config: WindowConfig) -> Result {
    tauri::WebviewWindowBuilder::new(handle, config.label, WebviewUrl::App(config.url.into()))
        .title(config.title)
        .initialization_script(hydrate_global(handle, config.current_view)?)
        .inner_size(config.width, config.height)
        .resizable(false)
        .minimizable(false)
        .visible(false)
        .center()
        .build()
        .map_err(|e| Error::UnableToCreateWindow {
            label: config.label.to_string(),
            err: e.to_string(),
        })?;

    Ok(())
}

fn register_global_shortcut(app_handle: &AppHandle) -> Result {
    let state = app_handle.state::<AppState>();
    let hotkey = match Shortcut::from_str(
        &state
            .setting_manager
            .lock()
            .unwrap()
            .settings
            .global_shortcut,
    ) {
        Ok(shortcut) => shortcut,
        Err(err) => {
            log::error!("failed to parse shortcut, using default one: {}", err);
            Shortcut::new(Some(Modifiers::SUPER), Code::KeyG)
        }
    };

    app_handle
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcut(hotkey)
                .map_err(|err| Error::UnableToRegisterGlobalShortcut(err.to_string()))?
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        show_app(app).unwrap_or_else(|err| {
                            log::error!("Hotkey -> failed to show app. {}", err)
                        });
                    }
                })
                .build(),
        )
        .map_err(|err| Error::UnableToRegisterGlobalShortcut(err.to_string()))?;

    Ok(())
}

fn hydrate_global(app_handle: &AppHandle, current_view: &str) -> Result<String> {
    let version = app_handle.package_info().version.to_string();
    let state = app_handle.state::<AppState>();
    let settings = serde_json::to_string(&state.get_settings())?;

    Ok(format!(
        r#"
        globalThis.currentView = "{}";
        globalThis.appVersion = "{}";
        globalThis.settings = {};
        "#,
        current_view, version, settings
    ))
}
