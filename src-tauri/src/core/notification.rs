use std::{collections::HashMap, sync::Arc};

use git_pal_code_review::models::GetSavedReviewRequest;
use tauri::AppHandle;
use tauri_plugin_opener::open_url;

use user_notify::{
    NotificationCategory, NotificationCategoryAction, NotificationResponse,
    get_notification_manager,
};

const APP_ID: &str = "com.gugu.git-pal";
const ACTION_REVIEW: &str = "com.gugu.git-pal.action.review";

const KEY_URL: &str = "url";
const KEY_OWNER: &str = "owner";
const KEY_REPOSITORY: &str = "repository";
const KEY_NUMBER: &str = "number";

/// Notification metadata identifying the pull request to review.
pub fn review_metadata(
    url: String,
    owner: String,
    repository: String,
    number: i64,
) -> HashMap<String, String> {
    HashMap::from([
        (KEY_URL.to_string(), url),
        (KEY_OWNER.to_string(), owner),
        (KEY_REPOSITORY.to_string(), repository),
        (KEY_NUMBER.to_string(), number.to_string()),
    ])
}

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
    pub manager: Arc<dyn user_notify::NotificationManager>,
}

impl NotificationManager {
    pub fn new() -> Self {
        NotificationManager {
            manager: get_notification_manager(APP_ID.to_string(), None),
        }
    }

    pub fn register_handler(&self, app: AppHandle) {
        log::info!("Registering notification handler");

        let categories = vec![NotificationCategory {
            identifier: Category::ReviewRequested.id(),
            actions: vec![NotificationCategoryAction::Action {
                identifier: ACTION_REVIEW.to_string(),
                title: String::from("View"),
            }],
        }];

        self.manager
            .register(
                Box::new(move |response| {
                    log::debug!("Notification handler callback triggered");

                    match &response.action {
                        user_notify::NotificationResponseAction::Other(action_id) => {
                            if action_id == ACTION_REVIEW {
                                log::debug!("Review requested");
                                open_review(&app, response);
                            }
                        }
                        user_notify::NotificationResponseAction::Default => {
                            log::debug!("Notification clicked");
                            open_review(&app, response);
                        }
                        _ => {
                            // noop
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

fn open_review(app: &AppHandle, response: NotificationResponse) {
    let Some(target) = review_target(&response.user_info) else {
        // fallback to github if we are not able to extract the required info
        open_pull_request(response);
        return;
    };

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(err) = crate::commands::review::view_pull_request(app, target).await {
            log::error!("Notification callback failed to open the review: {}", err);
        }
    });
}

fn review_target(info: &HashMap<String, String>) -> Option<GetSavedReviewRequest> {
    Some(GetSavedReviewRequest {
        owner: info.get(KEY_OWNER)?.clone(),
        repository: info.get(KEY_REPOSITORY)?.clone(),
        pr_number: info.get(KEY_NUMBER)?.parse().ok()?,
    })
}

fn open_pull_request(response: NotificationResponse) {
    if let Some(url) = response.user_info.get(KEY_URL) {
        if let Err(err) = open_url(url, None::<&str>) {
            log::error!("Notification callback failed to open url: {}", err);
        }
    }
}
