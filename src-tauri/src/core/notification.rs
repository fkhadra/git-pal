use std::{collections::HashMap, sync::Arc};

use tauri_plugin_opener::open_url;

use user_notify::{get_notification_manager, NotificationCategory, NotificationCategoryAction};

const APP_ID: &str = "com.gugu.git-pal";
const ACTION_REVIEW: &str = "com.gugu.git-pal.action.review";

pub enum Category {
    ReviewRequested,
}

impl Category {
    fn id(&self) -> String {
        match self {
            Category::ReviewRequested => format!("{}.review.requested", APP_ID),
        }
    }
}

pub struct NotificationManager {
    manager: Arc<dyn user_notify::NotificationManager>,
}

impl NotificationManager {
    pub fn new() -> Self {
        NotificationManager {
            manager: get_notification_manager(APP_ID.to_string(), None),
        }
    }

    pub fn register_handler(&self) {
        log::info!("Registering notification handler");

        let categories = vec![NotificationCategory {
            identifier: Category::ReviewRequested.id(),
            actions: vec![NotificationCategoryAction::Action {
                identifier: ACTION_REVIEW.to_string(),
                title: String::from("Review"),
            }],
        }];

        self.manager
            .register(
                Box::new(|response| {
                    log::debug!("Notification handler callback triggered");

                    match response.action {
                        user_notify::NotificationResponseAction::Other(action_id) => {
                            log::debug!("Received other action: {}", action_id);

                            if action_id == ACTION_REVIEW {
                                log::debug!("Review requested");

                                if let Some(url) = response.user_info.get("url") {
                                    log::debug!("Opening pull request in github");

                                    if let Err(err) = open_url(url, None::<&str>) {
                                        log::error!(
                                            "Notification callback failed to open url: {}",
                                            err
                                        );
                                    }
                                }
                            }
                        }
                        user_notify::NotificationResponseAction::Dismiss => {
                            log::debug!("Notification dismissed");
                        }
                        user_notify::NotificationResponseAction::Default => {
                            log::debug!("Notification clicked");
                        }
                    }
                }),
                categories,
            )
            .expect("Failed to register notification handler");
    }

    pub async fn push_notification(
        &self,
        title: &str,
        message: &str,
        category: Option<Category>,
        metadata: Option<HashMap<String, String>>,
    ) {
        let mut notification = user_notify::NotificationBuilder::new()
            .title(title)
            .body(message);

        if let Some(category) = category {
            notification = notification.set_category_id(category.id().as_str());
        }

        if let Some(metadata) = metadata {
            notification = notification.set_user_info(metadata);
        }

        let res = self.manager.send_notification(notification).await;

        match res {
            Err(err) => {
                log::error!("Failed to send notification: {}", err);
            }
            Ok(_) => {
                log::debug!("Notification sent successfully");
            }
        }
    }
}
