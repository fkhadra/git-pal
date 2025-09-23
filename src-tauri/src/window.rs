use std::error::Error;

use tauri::{AppHandle, Runtime, WebviewUrl, WindowEvent};

pub const MAIN_WINDOW_LABEL: &str = "main";

pub fn create_main_window<R: Runtime>(handle: &AppHandle<R>) -> Result<(), Box<dyn Error>> {
    let window = tauri::WebviewWindowBuilder::new(
        handle,
        MAIN_WINDOW_LABEL,
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
    .build()?;

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

pub fn create_settings_window<R: Runtime>(handle: &AppHandle<R>) -> Result<(), Box<dyn Error>> {
    let _ =
        tauri::WebviewWindowBuilder::new(handle, "settings", WebviewUrl::App("settings".into()))
            .title("Settings")
            .initialization_script(
                r#"
                window.initialPath = '/settings';
                "#,
            )
            .inner_size(715.0, 600.0)
            .resizable(false)
            .minimizable(false)
            .center()
            .build()?;

    Ok(())
}
