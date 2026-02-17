use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "feedback.ts")]
pub struct NewFeedback {
    pub email: String,
    pub kind: String,
    pub body: String,
}

pub async fn submit_feedback(data: NewFeedback) -> anyhow::Result<()> {
    let client = reqwest::Client::new();
    let response = client
        .post("http://127.0.0.1:8080/api/feedback")
        .json(&data)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("feedback submission failed ({status}): {body}");
    }

    Ok(())
}
