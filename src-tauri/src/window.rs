use std::fmt::Debug;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WindowEvent};

use crate::app_state::AppState;

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
                initial_path: "/settings",
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

    match state.has_token {
        true => create_main_window(handle)?,
        false => create_window(
            handle,
            WindowConfig {
                title: "Welcome to Git Pal",
                initial_path: "/setup",
                url: "setup",
                label: SETUP_WINDOW_LABEL,
                width: 800.0,
                height: 600.0,
            },
        )?,
    };

    Ok(())
}

pub fn show_window(w: &WebviewWindow) -> Result {
    if !w
        .is_visible()
        .map_err(|err| Error::UnableToCheckVisibility {
            label: w.label().to_string(),
            err: err.to_string(),
        })?
    {
        // best effort
        let _ = w.center();

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

fn create_main_window(handle: &AppHandle) -> Result {
    let window = tauri::WebviewWindowBuilder::new(
        handle,
        MAIN_WINDOW_LABEL,
        WebviewUrl::App("palette".into()),
    )
    .initialization_script("window.initialPath = '/palette'")
    .title("Git Pal")
    .inner_size(800.0, 600.0)
    .center()
    .transparent(true)
    .decorations(false)
    .resizable(false)
    .shadow(false)
    .visible(false)
    .background_throttling(tauri::utils::config::BackgroundThrottlingPolicy::Throttle)
    .build()
    .map_err(|e| Error::UnableToCreateWindow {
        label: MAIN_WINDOW_LABEL.to_string(),
        err: e.to_string(),
    })?;

    // attach events for main window
    let cw = window.clone();
    window.on_window_event(move |e| match e {
        WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            cw.hide().unwrap();
        }
        WindowEvent::Focused(focused) => {
            if !focused {
                cw.hide().unwrap();
            }
        }
        _ => {}
    });

    Ok(())
}

struct WindowConfig<'a> {
    title: &'a str,
    initial_path: &'a str,
    url: &'a str,
    label: &'a str,
    width: f64,
    height: f64,
}

fn create_window(handle: &AppHandle, config: WindowConfig) -> Result {
    tauri::WebviewWindowBuilder::new(handle, config.label, WebviewUrl::App(config.url.into()))
        .title(config.title)
        .initialization_script(format!("window.initialPath = '{}';", config.initial_path))
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
