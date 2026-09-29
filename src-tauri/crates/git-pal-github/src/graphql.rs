use std::fmt::Debug;

use graphql_client::{GraphQLQuery, QueryBody, Response as GQLResponse};
use serde::Deserialize;
use serde::{self, Serialize, de::DeserializeOwned};
use ts_rs::TS;

use crate::api_client::{Client, Response, Result};
use crate::github::{Error, Metadata};
use crate::query::find_repositories::FindRepositoriesSearchNodes;
use crate::query::search_pull_request::SearchPullRequestSearchNodes;
use crate::query::user_profile::UserProfileViewerOrganizations;
use crate::query::{self};
use crate::rest::GetPullRequestRequest;
use crate::scope::SearchScope;

const GRAPHQL_API_URL: &str = "https://api.github.com/graphql";

/// GitHub's largest search page.
const MAX_SEARCH_PAGE_SIZE: u32 = 100;

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
pub type PullRequest = query::get_pull_request::PullRequest;

#[derive(Debug, Serialize, Deserialize, Clone, TS)]
#[ts(export, export_to = "graphql.ts")]
pub struct FindRepositoriesRequest {
    pub owner: String,
    pub query: String,
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

    /// The viewer's own pull requests stay whatever the scope, top repositories follow it.
    pub async fn homepage(&self, scope: &SearchScope) -> Result<Homepage> {
        let q = query::Homepage::build_query(query::homepage::Variables {
            pull_request_count: 10,
            top_repository_count: 10,
        });

        let mut res: Homepage = self.send_graphql(&q).await?;
        if let Some(nodes) = res
            .data
            .as_mut()
            .and_then(|d| d.viewer.top_repositories.nodes.as_mut())
        {
            nodes.retain(|node| {
                node.as_ref()
                    .is_none_or(|n| scope.allows(&n.repository.owner.login, &n.repository.name))
            });
        }

        Ok(res)
    }

    pub async fn find_repositories(
        &self,
        params: FindRepositoriesRequest,
        scope: &SearchScope,
    ) -> Result<FindRepositoriesResult> {
        let q = query::FindRepositories::build_query(query::find_repositories::Variables {
            count: 20,
            query: scope.owner_repository_query(&params.owner, &params.query),
        });

        let mut res: FindRepositoriesResult = self.send_graphql(&q).await?;
        if let Some(nodes) = res.data.as_mut().and_then(|d| d.search.nodes.as_mut()) {
            nodes.retain(|node| match node {
                Some(FindRepositoriesSearchNodes::Repository(repo)) => {
                    scope.allows(&repo.owner.login, &repo.name)
                }
                _ => true,
            });
        }

        Ok(res)
    }

    pub async fn find_pull_requests(
        &self,
        filter: FindPullRequestsFilter,
        scope: &SearchScope,
        limit: u32,
    ) -> Result<FindPullRequestResult> {
        let f = match filter {
            FindPullRequestsFilter::Mentionned => "mentions",
            FindPullRequestsFilter::ReviewRequested => "review-requested",
        };

        let q = self.with_user(|user| {
            query::SearchPullRequest::build_query(query::search_pull_request::Variables {
                count: limit.min(MAX_SEARCH_PAGE_SIZE).into(),
                query: scope.narrow(&format!(
                    "is:open is:pr archived:false {}:{}",
                    f, user.login
                )),
            })
        })?;

        // the query can't always carry the whole scope, see `SearchScope::narrow`
        let mut res: FindPullRequestResult = self.send_graphql(&q).await?;
        if let Some(nodes) = res.data.as_mut().and_then(|d| d.search.nodes.as_mut()) {
            nodes.retain(|node| match node {
                Some(SearchPullRequestSearchNodes::PullRequest(pr)) => {
                    scope.allows(&pr.repository.owner.login, &pr.repository.name)
                }
                _ => true,
            });
        }

        Ok(res)
    }

    /// Pull request with its checks, review decision and mergeability.
    pub async fn find_pull_request(&self, request: &GetPullRequestRequest) -> Result<PullRequest> {
        let q = query::GetPullRequest::build_query(query::get_pull_request::Variables {
            owner: request.owner.clone(),
            name: request.repository.clone(),
            number: request.number,
        });
        let response: GraphQLResponse<query::get_pull_request::ResponseData> =
            self.send_graphql(&q).await?;

        if let Some(errors) = response.errors {
            return Err(Error::BadRequest(errors.join(", ")));
        }

        response
            .data
            .and_then(|data| data.repository)
            .and_then(|repository| repository.pull_request)
            .ok_or(Error::MissingData)
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
