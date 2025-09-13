mod commands;
mod github;
mod vault;

use tauri::{tray::TrayIconBuilder, Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(commands::AppState::new())
        .setup(|app| {
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .build(app)?;

            let window = app.get_webview_window("main").unwrap();
            let cw = window.clone();
            window.on_window_event(move |e| {
                if let WindowEvent::CloseRequested { api, .. } = e {
                    api.prevent_close();

                    cw.hide().unwrap();
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::authenticate,
            commands::is_authenticated,
            commands::homepage,
            commands::search_pull_requests,
            commands::delete_token,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
