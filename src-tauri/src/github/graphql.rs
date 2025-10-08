use std::fmt::Debug;

use graphql_client::{GraphQLQuery, QueryBody, Response as GraphQLResponse};
use serde::{self, de::DeserializeOwned, Serialize};

use super::api_client::{ApiResponse, Client, Error, Response, Result};
use super::query;

const GRAPHQL_API_URL: &str = "https://api.github.com/graphql";
const SUPPORTED_FILTER: [&str; 2] = ["mentions", "review-requested"];

pub type UserProfile = ApiResponse<query::user_profile::ResponseData>;
pub type Homepage = ApiResponse<query::homepage::ResponseData>;
pub type SearchResult = ApiResponse<query::search_pull_request::ResponseData>;

pub type UserProfileViewer = query::user_profile::UserProfileViewer;

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

    pub async fn search_pull_requests(&self, filter: &str) -> Result<SearchResult> {
        if !SUPPORTED_FILTER.contains(&filter) {
            return Err(Error::UnsupportedFilter(filter.to_owned()));
        }

        let user = self.user.as_ref().ok_or(Error::MissingData)?;

        let q = query::SearchPullRequest::build_query(query::search_pull_request::Variables {
            count: 20,
            query: format!("is:open is:pr archived:false {}:{}", filter, &user.login),
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
