mod commands;
mod github;
mod vault;
mod window;

use std::env;
use tauri::{menu::MenuBuilder, tray::TrayIconBuilder};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_log::{Target, TargetKind};

use crate::window::{create_app_window, show_app, show_settings};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let log_path = {
        #[cfg(debug_assertions)]
        {
            env::current_dir().unwrap_or_else(|_| env::temp_dir())
        }
        #[cfg(not(debug_assertions))]
        {
            env::home_dir().unwrap_or_else(|| env::temp_dir())
        }
    };

    tauri::Builder::default()
        .manage(commands::AppState::new())
        .setup(|app| {
            create_app_window(&app.handle())?;

            let menu = MenuBuilder::new(app)
                .text("show", "Show Git Pal")
                .text("about", "About")
                .separator()
                .text("settings", "Settings")
                .text("quit", "Quit Git Pal")
                .build()?;

            let _ = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        show_app(app).unwrap_or_else(|err| {
                            log::error!("Tray -> failed to show app. {}", err)
                        });
                    }
                    "about" => {}
                    "settings" => {
                        show_settings(app).unwrap_or_else(|err| {
                            log::error!("Tray -> failed to show settings. {}", err)
                        });
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {
                        println!("menu item {:?} not handled", event.id);
                    }
                })
                .build(app)?;

            let hotkey = Shortcut::new(Some(Modifiers::SUPER), Code::KeyG);
            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_shortcut(hotkey)?
                    .with_handler(|app, _shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            show_app(app).unwrap_or_else(|err| {
                                log::error!("Hotkey -> failed to show app. {}", err)
                            });
                        }
                    })
                    .build(),
            )?;

            Ok(())
        })
        .plugin(tauri_plugin_single_instance::init(|app, _, __| {
            show_app(app).unwrap_or_else(|err| {
                log::error!("Single Instance -> failed to show app. {}", err)
            });
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(Target::new(TargetKind::Folder {
                    path: log_path,
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
            commands::is_autostart_enabled,
            commands::enable_autostart,
            commands::disable_autostart,
            commands::show_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
