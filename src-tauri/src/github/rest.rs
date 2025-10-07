use std::fmt::Debug;

use reqwest::RequestBuilder;
use serde::de::DeserializeOwned;
use ts_rs::TS;

use super::api_client::{ApiResponse, Client, Error, RateLimit, Result};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone, TS)]
#[ts(export, export_to = "../../src/models/workflows.ts")]
pub struct Workflow {
    pub id: i64,
    pub node_id: String,
    pub name: String,
    pub path: String,
    pub state: String,
    pub created_at: String,
    pub updated_at: String,
    pub url: String,
    pub html_url: String,
    pub badge_url: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone, TS)]
#[ts(export, export_to = "../../src/models/workflows.ts")]
pub struct ListWorkflowsResponse {
    pub total_count: i32,
    pub workflows: Vec<Workflow>,
}

const API_URL: &str = "https://api.github.com/";

impl Client {
    pub async fn list_workflows(
        &self,
        owner: &str,
        repository: &str,
    ) -> Result<ApiResponse<ListWorkflowsResponse>> {
        let req = self.http.get(format!(
            "{API_URL}repos/{owner}/{repository}/actions/workflows"
        ));

        self.do_request::<ListWorkflowsResponse>(req).await
    }

    async fn do_request<Response>(&self, req: RequestBuilder) -> Result<ApiResponse<Response>>
    where
        Response: DeserializeOwned + Clone + Debug,
    {
        let token = self.token.as_ref().ok_or(Error::MissingToken)?;
        let res = req
            .bearer_auth(token)
            .header("user-agent", "hey-github-wanna-hire-me?")
            .send()
            .await?;

        if !res.status().is_success() {
            let status = res.status().as_u16();
            return Err(Error::BadRequest {
                status,
                message: res.text().await?,
            });
        }

        let rate_limit = RateLimit::extract(res.headers());
        let data: Response = res.json().await?;

        Ok(ApiResponse { rate_limit, data })
    }
}
