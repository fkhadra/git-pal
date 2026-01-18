use std::fmt::Debug;

use graphql_client::{GraphQLQuery, QueryBody, Response as GQLResponse};
use serde::Deserialize;
use serde::{self, Serialize, de::DeserializeOwned};
use ts_rs::TS;

use crate::api_client::{Client, Response, Result};
use crate::github::Metadata;
use crate::query;

const GRAPHQL_API_URL: &str = "https://api.github.com/graphql";

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "graphql.ts")]
#[serde(rename_all = "camelCase")]
pub enum FindPullRequestsFilter {
    Mentionned,
    ReviewRequested,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "api.ts")]
pub struct GraphQLResponse<T> {
    pub metadata: Metadata,
    pub data: Option<T>,
    pub errors: Option<Vec<String>>,
}

pub type UserProfile = GraphQLResponse<query::user_profile::ResponseData>;
pub type Homepage = GraphQLResponse<query::homepage::ResponseData>;
pub type FindPullRequestResult = GraphQLResponse<query::search_pull_request::ResponseData>;
pub type FindRepositoriesResult = GraphQLResponse<query::find_repositories::ResponseData>;
pub type UserProfileViewer = query::user_profile::UserProfileViewer;

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export, export_to = "graphql.ts")]
pub struct FindRepositoriesRequest {
    pub owner: String,
    pub query: String,
}

impl std::fmt::Display for FindRepositoriesRequest {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "org:{} in:name {}", self.owner, self.query)
    }
}

impl Client {
    pub async fn load_user_profile(&self) -> Result<UserProfile> {
        let q = query::UserProfile::build_query(query::user_profile::Variables);
        let res: UserProfile = self.send_graphql(&q).await?;

        if let Some(user) = res.data.as_ref() {
            self.user.lock().unwrap().replace(user.viewer.clone());
        }

        Ok(res)
    }

    pub async fn homepage(&self) -> Result<Homepage> {
        let q = query::Homepage::build_query(query::homepage::Variables {
            pull_request_count: 10,
            top_repository_count: 10,
        });

        self.send_graphql(&q).await
    }

    pub async fn find_repositories(
        &self,
        params: FindRepositoriesRequest,
    ) -> Result<FindRepositoriesResult> {
        let q = query::FindRepositories::build_query(query::find_repositories::Variables {
            count: 20,
            query: params.to_string(),
        });

        self.send_graphql(&q).await
    }

    pub async fn find_pull_requests(
        &self,
        filter: FindPullRequestsFilter,
    ) -> Result<FindPullRequestResult> {
        let f = match filter {
            FindPullRequestsFilter::Mentionned => "mentions",
            FindPullRequestsFilter::ReviewRequested => "review-requested",
        };

        let q = self.with_user(|user| {
            query::SearchPullRequest::build_query(query::search_pull_request::Variables {
                count: 20,
                query: format!("is:open is:pr archived:false {}:{}", f, user.login),
            })
        })?;

        self.send_graphql(&q).await
    }

    async fn send_graphql<T, R>(&self, body: &QueryBody<T>) -> Result<GraphQLResponse<R>>
    where
        T: Serialize,
        R: DeserializeOwned + Clone + Debug,
    {
        let Response { metadata, response } = self
            .do_request(self.http.post(GRAPHQL_API_URL).json(body))
            .await?;
        let response_body: GQLResponse<R> = response.json().await?;

        let errors = response_body.errors.map(|errs| {
            let mut messages: Vec<String> = errs.into_iter().map(|v| v.message).collect();
            messages.dedup();
            messages
        });

        Ok(GraphQLResponse {
            data: response_body.data,
            metadata,
            errors,
        })
    }
}
