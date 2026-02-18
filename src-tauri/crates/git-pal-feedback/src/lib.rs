use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "feedback.ts")]
pub struct NewFeedback {
    pub email: String,
    pub kind: FeedbackKind,
    pub body: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "feedback.ts")]
pub enum FeedbackKind {
    Bug,
    FeatureRequest,
    Other,
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Invalid request: {0}")]
    InvalidRequest(serde_json::Value),
    #[error("HTTP request failed: {0}")]
    Request(#[from] reqwest::Error),
}

pub async fn submit_feedback(data: NewFeedback) -> Result<(), Error> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://gitpal.pushpull.sh/api/feedback")
        .json(&data)
        .send()
        .await?;

    if !response.status().is_success() {
        let body: serde_json::Value = response.json().await.unwrap_or_default();
        return Err(Error::InvalidRequest(body));
    }

    Ok(())
}
