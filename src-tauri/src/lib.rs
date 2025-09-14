mod commands;
mod github;
mod vault;

use log::debug;
use std::env;
use tauri::{tray::TrayIconBuilder, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_log::{Target, TargetKind};

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

            let hotkey = Shortcut::new(Some(Modifiers::SUPER), Code::KeyG);

            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_shortcut(hotkey)?
                    .with_handler(|app, _shortcut, event| {
                        debug!("Global shortcut triggered !");

                        if event.state() == ShortcutState::Pressed {
                            if let Some(w) = app.get_webview_window("main") {
                                w.set_focus().unwrap();
                            }
                        }
                    })
                    .build(),
            )?;

            Ok(())
        })
        .plugin(tauri_plugin_single_instance::init(|app, _, __| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(Target::new(TargetKind::Folder {
                    path: env::current_dir().unwrap(),
                    file_name: Some(String::from("git-pal")),
                }))
                .build(),
        )
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
