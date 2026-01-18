use std::collections::HashMap;
use std::fmt::Debug;

use reqwest::RequestBuilder;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::api_client::{Client, Error, Response, Result};
use crate::github::Metadata;

const API_URL: &str = "https://api.github.com/";

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "api.ts")]
pub struct RestResponse<T> {
    pub metadata: Metadata,
    pub data: T,
}

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export, export_to = "rest.ts")]
pub struct Workflow {
    pub id: i32,
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
#[ts(export, export_to = "rest.ts")]
pub struct Workflows {
    pub total_count: i32,
    pub workflows: Vec<Workflow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rest.ts")]
pub struct WorkflowInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub default: Option<String>,
    pub required: Option<bool>,
    #[serde(rename = "type")]
    pub input_type: Option<String>,
}

pub type WorkflowInputs = Vec<WorkflowInput>;

type WorkflowInputName = String;

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
    inputs: Option<HashMap<WorkflowInputName, WorkflowInput>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rest.ts")]
pub struct FileRequest<'a> {
    pub owner: &'a str,
    pub repository: &'a str,
    pub file_path: &'a str,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rest.ts")]
pub struct RunWorkflowRequest<'a> {
    pub owner: &'a str,
    pub repository: &'a str,
    pub workflow_id: i32,
    pub branch: &'a str,
    #[ts(type = "Record<string, any>")]
    pub variables: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rest.ts")]
pub struct FindWorkflowsRequest<'a> {
    pub owner: &'a str,
    pub repository: &'a str,
}

impl Client {
    pub async fn find_workflows(
        &self,
        FindWorkflowsRequest { owner, repository }: FindWorkflowsRequest<'_>,
    ) -> Result<RestResponse<Workflows>> {
        let req = self.http.get(format!(
            "{API_URL}repos/{owner}/{repository}/actions/workflows"
        ));

        self.send_request(req).await
    }

    pub async fn file(&self, params: FileRequest<'_>) -> Result<RestResponse<String>> {
        let req = self
            .http
            .get(format!(
                "{API_URL}repos/{owner}/{repository}/contents/{file_path}",
                owner = params.owner,
                repository = params.repository,
                file_path = params.file_path
            ))
            .header("Accept", "application/vnd.github.raw+json");

        let Response { metadata, response } = self.do_request(req).await?;
        let file_content = response.text().await?;

        Ok(RestResponse {
            metadata,
            data: file_content,
        })
    }

    pub async fn extract_workflow_variables(
        &self,
        params: FileRequest<'_>,
    ) -> Result<RestResponse<WorkflowInputs>> {
        let res = self.file(params).await?;

        let workflow: WorkflowFile = serde_yaml::from_str(&res.data)
            .map_err(|e| Error::InvalidWorkflowFile(e.to_string()))?;

        let trigger = match workflow.on.workflow_call.or(workflow.on.workflow_dispatch) {
            Some(trigger) => trigger,
            None => {
                return Err(Error::InvalidWorkflowFile(
                    "not a workflow file".to_string(),
                ));
            }
        };

        let variables: Vec<WorkflowInput> = trigger
            .inputs
            .map(|inputs| {
                inputs
                    .into_iter()
                    .map(|(name, input)| WorkflowInput {
                        name: Some(name),
                        description: input.description,
                        default: input.default,
                        required: input.required,
                        input_type: input.input_type,
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(RestResponse {
            metadata: res.metadata,
            data: variables,
        })
    }

    pub async fn run_workflow(&self, params: RunWorkflowRequest<'_>) -> Result<()> {
        #[derive(Debug, Serialize, Clone)]
        struct Body {
            #[serde(rename = "ref")]
            ref_field: String,
            #[serde(skip_serializing_if = "Option::is_none")]
            inputs: Option<HashMap<String, serde_json::Value>>,
        }

        let req = self
            .http
            .post(format!(
                "{API_URL}repos/{owner}/{repository}/actions/workflows/{workflow_id}/dispatches",
                owner = params.owner,
                repository = params.repository,
                workflow_id = params.workflow_id
            ))
            .json(&Body {
                ref_field: params.branch.to_string(),
                inputs: params.variables,
            })
            .header("Accept", "application/vnd.github+json");

        let _ = self.do_request(req).await?;

        Ok(())
    }

    async fn send_request<R>(&self, req: RequestBuilder) -> Result<RestResponse<R>>
    where
        R: DeserializeOwned + Clone + Debug,
    {
        let req = req.header("Accept", "application/vnd.github+json");
        let Response { metadata, response } = self.do_request(req).await?;
        let data: R = response.json().await?;

        Ok(RestResponse { metadata, data })
    }
}
