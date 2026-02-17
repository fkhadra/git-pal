use anyhow::Result;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::github::Client;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "status.ts")]
pub struct GithubStatus {
    pub page: Page,
    pub status: Status,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "status.ts")]
pub struct Page {
    pub id: String,
    pub name: String,
    pub url: String,
    pub time_zone: String,
    pub updated_at: String,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "status.ts")]
pub struct Status {
    // none, minor, major, or critical
    pub indicator: String,
    // "All Systems Operational", "Partial System Outage", and "Major Service Outage".
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "status.ts")]
pub struct ComponentStatus {
    pub page: Page,
    pub components: Vec<Component>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "status.ts")]
pub struct Component {
    pub id: String,
    pub name: String,
    // degraded_performance, partial_outage, or major_outage.
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub position: i64,
    pub description: Option<String>,
    pub showcase: bool,
    pub start_date: Option<String>,
    pub group_id: Option<String>,
    pub page_id: String,
    pub group: bool,
    pub only_show_if_degraded: bool,
}

impl Client {
    pub async fn status(&self) -> Result<GithubStatus> {
        let body: GithubStatus = self
            .http
            .get("https://www.githubstatus.com/api/v2/status.json")
            .send()
            .await?
            .json()
            .await?;

        Ok(body)
    }

    pub async fn component_status(&self) -> Result<ComponentStatus> {
        let body: ComponentStatus = self
            .http
            .get("https://www.githubstatus.com/api/v2/components.json")
            .send()
            .await?
            .json()
            .await?;

        Ok(body)
    }
}
