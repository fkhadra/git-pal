use std::time::Duration;

use tauri::{Manager, State};

use crate::core::AppState;

use super::{CommandError, Result};

const MONITOR_JOB: &str = "monitor_pr";

#[tauri::command]
pub async fn stop_monitoring(state: State<'_, AppState>) -> Result<()> {
    stop_monitor_job(&state)
}

pub(super) fn stop_monitor_job(state: &AppState) -> Result<()> {
    state.job_runner.stop_job(MONITOR_JOB).map_err(|e| {
        CommandError::FailedToStopMonitoring(MONITOR_JOB.to_string(), e.to_string())
    })?;

    Ok(())
}

#[tauri::command]
pub async fn monitor_review_requested(app_handle: tauri::AppHandle) -> Result<()> {
    start_monitoring(&app_handle);

    Ok(())
}

pub(super) fn start_monitoring(app_handle: &tauri::AppHandle) {
    let state: State<'_, AppState> = app_handle.state();
    let settings = state.get_settings();
    if !settings.monitor_pull_requests {
        return;
    }

    let interval = Duration::from_secs(settings.monitor_interval as u64);
    let captured_handle = app_handle.clone();

    state
        .job_runner
        .start_job(MONITOR_JOB.to_string(), interval, move || {
            let handle = captured_handle.clone();
            async move {
                log::debug!("Monitoring tick");
                let state: State<'_, AppState> = handle.state();
                state.handle_pr_monitor().await;
            }
        });
}

#[tauri::command]
pub async fn notification_ask_permissions(state: State<'_, AppState>) -> Result<()> {
    let authorized = state
        .notification_manager
        .manager
        .get_notification_permission_state()
        .await
        .map_err(|err| CommandError::Notification(err))?;

    if !authorized {
        state
            .notification_manager
            .manager
            .first_time_ask_for_notification_permission()
            .await
            .map_err(|err| CommandError::Notification(err))?;
    }

    Ok(())
}
