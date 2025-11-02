use std::fmt::Debug;

use graphql_client::{GraphQLQuery, QueryBody, Response as GraphQLResponse};
use serde::Deserialize;
use serde::{self, de::DeserializeOwned, Serialize};
use ts_rs::TS;

use super::api_client::{ApiResponse, Client, Error, Response, Result};
use super::query;

const GRAPHQL_API_URL: &str = "https://api.github.com/graphql";

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/models/graphql.ts")]
#[serde(rename_all = "camelCase")]
pub enum FindPullRequestsFilter {
    Mentionned,
    ReviewRequested,
}

pub type UserProfile = ApiResponse<query::user_profile::ResponseData>;
pub type Homepage = ApiResponse<query::homepage::ResponseData>;
pub type FindPullRequestResult = ApiResponse<query::search_pull_request::ResponseData>;
pub type FindRepositoriesResult = ApiResponse<query::find_repositories::ResponseData>;
pub type UserProfileViewer = query::user_profile::UserProfileViewer;

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export, export_to = "../../src/models/graphql.ts")]
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
    pub async fn load_user_profile(&mut self) -> Result<UserProfile> {
        let q = query::UserProfile::build_query(query::user_profile::Variables);
        let res: UserProfile = self.send_graphql(&q).await?;

        self.user = Some(res.data.viewer.clone());

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

        let user = self.user.as_ref().ok_or(Error::MissingData)?;

        let q = query::SearchPullRequest::build_query(query::search_pull_request::Variables {
            count: 20,
            query: format!("is:open is:pr archived:false {}:{}", f, &user.login),
        });

        self.send_graphql(&q).await
    }

    async fn send_graphql<T, R>(&self, body: &QueryBody<T>) -> Result<ApiResponse<R>>
    where
        T: Serialize,
        R: DeserializeOwned + Clone + Debug,
    {
        let Response {
            rate_limit,
            response,
        } = self
            .do_request(self.http.post(GRAPHQL_API_URL).json(body))
            .await?;
        let response_body: GraphQLResponse<R> = response.json().await?;

        if let Some(errs) = response_body.errors {
            let msg = errs
                .iter()
                .map(|v| v.message.to_string())
                .collect::<Vec<String>>()
                .join(", ");

            return Err(Error::GraphQLErr(msg));
        }

        let data = response_body.data.ok_or(Error::MissingData)?;

        Ok(ApiResponse { data, rate_limit })
    }
}
