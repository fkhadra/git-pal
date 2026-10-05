mod commands;
mod core;
mod editor;
mod window;

use core::{AppState, Event, emit_event, handle_deeplink, start_updater};
use std::env;

use tauri::{Manager, image::Image, menu::MenuBuilder, tray::TrayIconBuilder};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_log::{Target, TargetKind};

use window::{on_app_start, show_app, show_review, show_settings};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new();
    let log_path = app_state.app_dir();
    #[cfg(debug_assertions)]
    let log_level = log::LevelFilter::Debug;

    #[cfg(not(debug_assertions))]
    let log_level = log::LevelFilter::Info;

    log::info!("Starting APP");

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_single_instance::init(|app, _, __| {
            show_app(app).unwrap_or_else(|err| {
                log::error!("Single Instance -> failed to show app. {}", err)
            });
        }))
        .plugin(tauri_plugin_process::init())
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
                .level(log_level)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let emitter_handle = app.handle().clone();
            app.state::<AppState>()
                .job_runner
                .set_emitter(move |job| emit_event(&emitter_handle, Event::JobMessage(job)));

            on_app_start(app.handle())?;

            #[cfg(not(debug_assertions))]
            start_updater(app.handle().clone());

            app.state::<AppState>()
                .notification_manager
                .register_handler(app.handle().clone());

            let app_handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                handle_deeplink(&app_handle, event.urls());
            });

            let menu = MenuBuilder::new(app)
                .text("show", "Show Git Pal")
                .separator()
                .text("reviews", "Reviews")
                .text("settings", "Settings")
                .text("quit", "Quit Git Pal")
                .build()?;

            let resource_path = app
                .path()
                .resolve("icons/tray.png", tauri::path::BaseDirectory::Resource)?;

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
                    "reviews" => {
                        show_review(app, None).unwrap_or_else(|err| {
                            log::error!("Tray -> failed to show reviews. {}", err)
                        });
                    }
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
            commands::auth::authenticate,
            commands::auth::is_authenticated,
            commands::github::homepage,
            commands::github::find_pull_requests,
            commands::github::find_repositories,
            commands::github::check_scope_entry,
            commands::auth::delete_token,
            commands::app::is_autostart_enabled,
            commands::app::enable_autostart,
            commands::app::disable_autostart,
            commands::app::show_window,
            commands::auth::start_oauth_flow,
            commands::workflows::extract_workflow_variables,
            commands::workflows::find_workflows,
            commands::workflows::run_workflow,
            commands::app::update_setting,
            commands::app::get_settings,
            commands::app::default_settings,
            commands::monitoring::monitor_review_requested,
            commands::monitoring::stop_monitoring,
            commands::app::replace_global_shortcut,
            commands::app::check_for_update,
            commands::auth::get_token,
            commands::app::restart_app,
            commands::monitoring::notification_ask_permissions,
            commands::app::submit_feedback,
            commands::review::review_pull_request,
            commands::github::get_pull_request,
            commands::github::get_pull_request_diff,
            commands::github::get_file_source,
            commands::github::get_pull_request_description,
            commands::github::get_owned_files,
            commands::github::get_mentionable_users,
            commands::github::get_pull_request_status,
            commands::github::compare_commits,
            commands::github::get_pull_request_conversation,
            commands::github::edit_comment,
            commands::github::delete_comment,
            commands::review::list_reviews,
            commands::review::get_review,
            commands::review::update_review_comments,
            commands::review::delete_reviews,
            commands::worktree::worktree_path,
            commands::worktree::is_repository_cloned,
            commands::worktree::list_editors,
            commands::worktree::open_in_editor,
            commands::review::list_viewed_files,
            commands::review::set_file_viewed,
            commands::review::submit_review,
            commands::templates::list_review_templates,
            commands::templates::create_review_template,
            commands::templates::update_review_template,
            commands::templates::delete_review_template,
            commands::templates::reorder_review_templates,
            commands::templates::built_in_review_instructions,
            commands::templates::resolve_review_template,
            commands::review::list_jobs,
            commands::review::cancel_review,
            commands::review::show_review,
            commands::review::view_pull_request,
            commands::review::take_requested_review,
            commands::agent::agent_send,
            commands::agent::agent_cancel,
            commands::agent::list_models,
            commands::agent::harness_model,
            commands::templates::list_skills,
            commands::agent::agent_list_conversations,
            commands::agent::agent_messages,
            commands::agent::agent_delete_conversation
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
