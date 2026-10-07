use std::str::FromStr;

use anyhow::anyhow;
use git_pal_settings::SettingValue;
use tauri::{Manager, State};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_updater::UpdaterExt;

use crate::{
    core::{AppState, AppUpdate},
    window::{self, show_app},
};

use git_pal_feedback::NewFeedback;

use super::monitoring::{start_monitoring, stop_monitor_job};
use super::{CommandError, Result};

#[tauri::command]
pub fn is_autostart_enabled(
    app_handle: tauri::AppHandle,
) -> Result<bool, tauri_plugin_autostart::Error> {
    app_handle.autolaunch().is_enabled()
}

#[tauri::command]
pub fn enable_autostart(app_handle: tauri::AppHandle) -> Result<(), tauri_plugin_autostart::Error> {
    app_handle.autolaunch().enable()
}

#[tauri::command]
pub fn disable_autostart(
    app_handle: tauri::AppHandle,
) -> Result<(), tauri_plugin_autostart::Error> {
    app_handle.autolaunch().disable()
}

#[tauri::command]
pub fn show_palette(app_handle: tauri::AppHandle) -> Result<()> {
    show_app(&app_handle)?;
    Ok(())
}

#[tauri::command]
pub async fn show_window(w: tauri::Window) -> Result<()> {
    let ww = w
        .get_webview_window(w.label())
        .ok_or_else(|| window::Error::WindowNotFound {
            label: w.label().to_string(),
            err: String::from("Window not found in manager"),
        })?;

    window::show_window(&ww)?;
    Ok(())
}

#[tauri::command]
pub async fn update_setting(
    app_handle: tauri::AppHandle,
    params: git_pal_settings::SettingValue,
) -> Result<git_pal_settings::Settings> {
    let state: State<'_, AppState> = app_handle.state();
    let affects_monitoring = matches!(
        params,
        SettingValue::MonitorPullRequests(_) | SettingValue::MonitorInterval(_)
    );
    let settings = state.update_setting(&app_handle, params);

    if affects_monitoring {
        stop_monitor_job(&state)?;
        start_monitoring(&app_handle);
    }

    Ok(settings)
}

#[tauri::command]
pub fn default_settings() -> git_pal_settings::Settings {
    git_pal_settings::Settings::default()
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<git_pal_settings::Settings> {
    Ok(state.get_settings())
}

#[tauri::command]
pub async fn submit_feedback(data: NewFeedback) -> Result<()> {
    if let Err(err) = git_pal_feedback::submit_feedback(data).await {
        let error = match err {
            git_pal_feedback::Error::InvalidRequest(e) => CommandError::JsonError(e),
            git_pal_feedback::Error::Request(e) => anyhow!(e).into(),
        };

        return Err(error);
    }
    Ok(())
}

// TODO: Refactor
#[tauri::command]
pub async fn replace_global_shortcut(app_handle: tauri::AppHandle, params: String) -> Result<()> {
    let new_shortcut =
        Shortcut::from_str(&params).map_err(|err| CommandError::Shortcut(err.to_string()))?;

    let state = app_handle.state::<AppState>();
    let old_shortcut_str = {
        state
            .setting_manager
            .lock()
            .unwrap()
            .replace_global_shortcut(params.clone())
    };

    let shortcut_manager = app_handle.global_shortcut();

    if let Ok(old_shortcut) = Shortcut::from_str(&old_shortcut_str) {
        let _ = shortcut_manager.unregister(old_shortcut);
    }

    shortcut_manager
        .on_shortcut(new_shortcut, move |app, _shortcut, event| {
            use tauri_plugin_global_shortcut::ShortcutState;

            if event.state() == ShortcutState::Pressed {
                if let Err(err) = show_app(app) {
                    log::error!("Hotkey -> failed to show app. {}", err);
                }
            }
        })
        .map_err(|err| CommandError::Shortcut(err.to_string()))?;

    if let Err(e) = state.setting_manager.lock().unwrap().save() {
        log::error!("Failed to save settings: {}", e);
    }

    Ok(())
}

#[tauri::command]
pub async fn check_for_update(app_handle: tauri::AppHandle) -> Result<Option<AppUpdate>> {
    if let Some(update) = app_handle.updater()?.check().await? {
        let u = AppUpdate {
            body: update.body,
            current_version: update.current_version,
            version: update.version,
            date: update.date.map(|v| v.to_string()),
        };

        return Ok(Some(u));
    }

    Ok(None)
}

#[tauri::command]
pub fn restart_app(app_handle: tauri::AppHandle) {
    app_handle.restart()
}

/// The downloaded update waiting to be installed, if any
#[tauri::command]
pub fn pending_update(state: State<'_, AppState>) -> Option<AppUpdate> {
    let pending = state.pending_update.lock().unwrap();

    pending
        .as_ref()
        .map(|pending| AppUpdate::from(&pending.update))
}

#[tauri::command]
pub fn install_update(app_handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<()> {
    let pending = state.pending_update.lock().unwrap().take();
    let Some(pending) = pending else {
        return Err(anyhow!("No update downloaded").into());
    };

    pending.update.install(&pending.bytes)?;
    app_handle.restart()
}
