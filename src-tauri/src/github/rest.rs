use std::collections::HashMap;
use std::fmt::Debug;

use reqwest::RequestBuilder;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::api_client::{ApiResponse, Client, Response, Result};

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export, export_to = "../../src/models/rest.ts")]
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

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export, export_to = "../../src/models/rest.ts")]
pub struct Workflows {
    pub total_count: i32,
    pub workflows: Vec<Workflow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/models/rest.ts")]
pub struct WorkflowVariable {
    pub name: Option<String>,
    pub description: Option<String>,
    pub default: Option<String>,
    pub required: Option<bool>,
    #[serde(rename = "type")]
    pub input_type: Option<String>,
}

type WorkflowVariableName = String;

#[derive(Debug, Deserialize)]
struct WorkflowFile {
    on: WorkflowFileOnField,
}

#[derive(Debug, Deserialize)]
struct WorkflowFileOnField {
    workflow_call: Option<WorkflowTrigger>,
    workflow_dispatch: Option<WorkflowTrigger>,
}

#[derive(Debug, Deserialize)]
struct WorkflowTrigger {
    inputs: Option<HashMap<WorkflowVariableName, WorkflowVariable>>,
}

const API_URL: &str = "https://api.github.com/";

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/models/rest.ts")]
pub struct FileRequest<'a> {
    pub owner: &'a str,
    pub repository: &'a str,
    pub file_path: &'a str,
}

impl Client {
    pub async fn list_workflows(
        &self,
        owner: &str,
        repository: &str,
    ) -> Result<ApiResponse<Workflows>> {
        let req = self.http.get(format!(
            "{API_URL}repos/{owner}/{repository}/actions/workflows"
        ));

        self.send_request(req).await
    }

    pub async fn file(&self, params: FileRequest<'_>) -> Result<ApiResponse<String>> {
        let req = self
            .http
            .get(format!(
                "{API_URL}repos/{owner}/{repository}/contents/{file_path}",
                owner = params.owner,
                repository = params.repository,
                file_path = params.file_path
            ))
            .header("Accept", "application/vnd.github.raw+json");

        let Response {
            rate_limit,
            response,
        } = self.do_request(req).await?;
        let file_content = response.text().await?;

        Ok(ApiResponse {
            rate_limit,
            data: file_content,
        })
    }

    pub async fn find_workflow_variables(
        &self,
        params: FileRequest<'_>,
    ) -> Result<ApiResponse<Vec<WorkflowVariable>>> {
        let res = self.file(params).await.expect("should get file");

        let workflow: WorkflowFile = serde_yaml::from_str(&res.data).expect("yamL??");

        let trigger = workflow
            .on
            .workflow_call
            .or(workflow.on.workflow_dispatch)
            .expect("no workflow");

        let variables: Vec<WorkflowVariable> = trigger
            .inputs
            .map(|inputs| {
                inputs
                    .into_iter()
                    .map(|(name, input)| WorkflowVariable {
                        name: Some(name),
                        description: input.description,
                        default: input.default,
                        required: input.required,
                        input_type: input.input_type,
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(ApiResponse {
            rate_limit: res.rate_limit,
            data: variables,
        })
    }

    async fn send_request<R>(&self, req: RequestBuilder) -> Result<ApiResponse<R>>
    where
        R: DeserializeOwned + Clone + Debug,
    {
        let Response {
            rate_limit,
            response,
        } = self.do_request(req).await?;
        let data: R = response.json().await?;

        Ok(ApiResponse { rate_limit, data })
    }
}
