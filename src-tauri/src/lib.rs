mod app_state;
mod commands;
mod github;
mod vault;
mod window;

use app_state::{handle_deeplink, AppState};
use std::env;

use tauri::{image::Image, menu::MenuBuilder, tray::TrayIconBuilder, Manager};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_log::{Target, TargetKind};

use crate::window::{on_app_start, show_app, show_settings};

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
        .manage(AppState::new())
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
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            on_app_start(app.handle())?;
            let app_handle = app.handle().clone();

            app.deep_link().on_open_url(move |event| {
                handle_deeplink(&app_handle, event.urls());
            });

            let menu = MenuBuilder::new(app)
                .text("show", "Show Git Pal")
                .text("about", "About")
                .separator()
                .text("settings", "Settings")
                .text("quit", "Quit Git Pal")
                .build()?;

            let resource_path = app
                .path()
                .resolve("icons/tray-2.png", tauri::path::BaseDirectory::Resource)?;

            let i = Image::from_path(resource_path).unwrap();
            let _ = TrayIconBuilder::new()
                .icon(i)
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
            commands::start_oauth_flow,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
