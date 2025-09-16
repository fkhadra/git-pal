mod commands;
mod github;
mod vault;
mod window;

use log::debug;
use std::env;
use tauri::{tray::TrayIconBuilder, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_log::{Target, TargetKind};

use crate::window::create_main_window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(commands::AppState::new())
        .setup(|app| {
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .build(app)?;

            create_main_window(app.handle())?;

            let hotkey = Shortcut::new(Some(Modifiers::SUPER), Code::KeyG);

            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_shortcut(hotkey)?
                    .with_handler(|app, _shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            if let Some(w) = app.get_webview_window(window::MAIN_WINDOW_LABEL) {
                                let is_visible = w.is_visible().unwrap();

                                if !is_visible {
                                    w.show().unwrap();
                                    w.set_focus().unwrap();
                                }
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
