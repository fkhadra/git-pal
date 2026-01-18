use std::fmt::Debug;

use graphql_client::{GraphQLQuery, QueryBody, Response as GQLResponse};
use serde::Deserialize;
use serde::{self, Serialize, de::DeserializeOwned};
use ts_rs::TS;

use crate::api_client::{Client, Response, Result};
use crate::github::{Error, Metadata};
use crate::query::user_profile::UserProfileViewerOrganizations;
use crate::query::{self};

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

#[derive(Debug, Serialize, TS, Clone)]
#[ts(export, export_to = "user-profile.ts")]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
    pub login: String,
    pub avatar_url: String,
    pub email: String,
    pub url: String,
    pub organizations: UserProfileViewerOrganizations,
    pub token_expire_at: Option<String>,
}

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
        let res: GraphQLResponse<query::user_profile::ResponseData> = self.send_graphql(&q).await?;

        if let Some(user) = res.data {
            let user_profile = UserProfile {
                token_expire_at: res.metadata.token_expiration,
                avatar_url: user.viewer.avatar_url,
                email: user.viewer.email,
                login: user.viewer.login,
                organizations: user.viewer.organizations,
                url: user.viewer.url,
            };

            self.user.lock().unwrap().replace(user_profile.clone());

            return Ok(user_profile);
        }

        Err(Error::MissingUser)
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
