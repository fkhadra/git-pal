mod commands;
mod github;
mod vault;
mod window;

use std::env;

use tauri::{menu::MenuBuilder, tray::TrayIconBuilder, Manager};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_deep_link::DeepLinkExt;
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
        .plugin(tauri_plugin_single_instance::init(|app, _, __| {
            show_app(app).unwrap_or_else(|err| {
                log::error!("Single Instance -> failed to show app. {}", err)
            });
        }))
        .plugin(tauri_plugin_deep_link::init())
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
        .setup(|app| {
            create_app_window(app.handle())?;
            let app_handle = app.handle().clone();

            app.deep_link().on_open_url(move |event| {
                let app_handle = app_handle.clone();

                tauri::async_runtime::spawn(async move {
                    for url in event.urls() {
                        match url.host() {
                            Some(host) => {
                                if host.to_string() == "github" && url.path() == "/auth-callback" {
                                    log::info!("deep link URLs: {:?}", url);
                                    let state = app_handle.state::<commands::AppState>();

                                    if let Err(err) =
                                        state.oauth_client.lock().await.exchange_code(url).await
                                    {
                                        log::error!("NANI ????? {:?}", err);
                                    };
                                }
                            }
                            None => {}
                        }
                    }
                });
            });

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
        .invoke_handler(tauri::generate_handler![
            commands::authenticate,
            commands::is_authenticated,
            commands::homepage,
            commands::search_pull_requests,
            commands::delete_token,
            commands::is_autostart_enabled,
            commands::enable_autostart,
            commands::disable_autostart,
            commands::show_window,
            commands::start_oauth_flow
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
