mod commands;
mod core;
mod window;

use core::{handle_deeplink, start_updater, AppState};
use std::env;

use tauri::{image::Image, menu::MenuBuilder, tray::TrayIconBuilder, Manager};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_log::{Target, TargetKind};

use window::{on_app_start, show_app, show_settings};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new();
    let log_path = app_state.app_dir();

    log::info!("Starting APP");

    tauri::Builder::default()
        .manage(app_state)
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
                // .level(log::LevelFilter::Info)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let _app_handle = app.handle().clone();

            on_app_start(app.handle())?;
            start_updater(app.handle().clone());

            app.state::<AppState>()
                .notification_manager
                .register_handler();

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

            let i = Image::from_path(resource_path).expect("valid tray icon path");
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
            commands::find_pull_requests,
            commands::find_repositories,
            commands::delete_token,
            commands::is_autostart_enabled,
            commands::enable_autostart,
            commands::disable_autostart,
            commands::show_window,
            commands::start_oauth_flow,
            commands::extract_workflow_variables,
            commands::find_workflows,
            commands::run_workflow,
            commands::update_setting,
            commands::get_settings,
            commands::monitor_review_requested,
            commands::stop_monitoring,
            commands::replace_global_shortcut,
            commands::check_for_update,
            commands::get_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
