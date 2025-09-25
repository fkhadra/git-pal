use std::fmt::{self, Debug};

use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindow, WindowEvent};

#[derive(Debug)]
enum Label {
    Main,
    Settings,
}

impl fmt::Display for Label {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("unable to focus window '{label:}'. {err:}")]
    UnableToFocus { label: String, err: String },
    #[error("unable to check window '{label:}' visibility. {err:}")]
    UnableToCheckVisibility { label: String, err: String },
    #[error("unable to show window '{label:}'. {err:}")]
    UnableToShowWindow { label: String, err: String },
    #[error("unable to create window '{label:}'. {err:}")]
    UnableToCreateWindow { label: String, err: String },
}

type Result<T = ()> = std::result::Result<T, Error>;

pub fn show_app(app: &AppHandle) -> Result {
    match app.get_webview_window(&Label::Main.to_string()) {
        Some(window) => show_window(&window),
        None => create_app_window(app),
    }
}

pub fn show_settings(app: &AppHandle) -> Result {
    match app.get_webview_window(&Label::Settings.to_string()) {
        Some(window) => show_window(&window),
        None => create_settings_window(app),
    }
}

pub fn create_app_window<R: Runtime>(handle: &AppHandle<R>) -> Result {
    let window = tauri::WebviewWindowBuilder::new(
        handle,
        Label::Main.to_string(),
        WebviewUrl::App("palette".into()),
    )
    .initialization_script(r#"window.initialPath = '/palette';"#)
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
        label: Label::Main.to_string(),
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

fn create_settings_window<R: Runtime>(handle: &AppHandle<R>) -> Result {
    let __ = tauri::WebviewWindowBuilder::new(
        handle,
        Label::Settings.to_string(),
        WebviewUrl::App("settings".into()),
    )
    .title("Settings")
    .initialization_script(r#"window.initialPath = '/settings';"#)
    .inner_size(715.0, 600.0)
    .resizable(false)
    .minimizable(false)
    .visible(false)
    .center()
    .build()
    .map_err(|e| Error::UnableToCreateWindow {
        label: Label::Settings.to_string(),
        err: e.to_string(),
    })?;

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
