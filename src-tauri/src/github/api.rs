use reqwest::{header::HeaderMap, Client as HttpClient};

use graphql_client::{GraphQLQuery, QueryBody, Response};
use serde::{self, de::DeserializeOwned, Deserialize, Serialize};

use crate::github::query::user_profile;

use super::query;

type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub rate_limit: RateLimit,
    pub data: T,
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("token is missing")]
    MissingToken,
    #[error("response errors: {}",.0)]
    GraphQLErr(String),
    #[error("invalid request: {status:} {message:}")]
    BadRequest { message: String, status: u16 },
    #[error("unsupported filter: {}", .0)]
    UnsupportedFilter(String),
    #[error("no data")]
    MissingData,
    #[error(transparent)]
    Other(#[from] reqwest::Error),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

const API_URL: &str = "https://api.github.com/graphql";
const SUPPORTED_FILTER: [&str; 2] = ["mentions", "review-requests"];

pub type UserProfile = ApiResponse<query::user_profile::ResponseData>;
pub type Homepage = ApiResponse<query::homepage::ResponseData>;
pub type SearchResult = ApiResponse<query::search_pull_request::ResponseData>;

pub type UserProfileViewer = user_profile::UserProfileViewer;

pub struct Client {
    token: Option<String>,
    pub user: Option<user_profile::UserProfileViewer>,
    http: HttpClient,
}

impl Client {
    pub fn new(token: Option<String>) -> Self {
        Client {
            token,
            user: None,
            http: reqwest::Client::new(),
        }
    }

    pub fn set_token(&mut self, token: &str) {
        self.token = Some(token.to_string());
    }

    pub fn is_token_set(&self) -> bool {
        return self.token.is_some();
    }

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

        let res: Homepage = self.send_graphql(&q).await?;

        Ok(res)
    }

    pub async fn search_pull_requests(&self, filter: &str) -> Result<SearchResult> {
        if !SUPPORTED_FILTER.contains(&filter) {
            return Err(Error::UnsupportedFilter(filter.to_owned()));
        }

        let user = self.user.as_ref().ok_or(Error::MissingData)?;
        let q = query::SearchPullRequest::build_query(query::search_pull_request::Variables {
            count: 20,
            query: format!("is:open is:pr archived:false {}:{}", &user.login, filter),
        });
        let res: SearchResult = self.send_graphql(&q).await?;

        Ok(res)
    }

    async fn send_graphql<T, R>(&self, body: &QueryBody<T>) -> Result<ApiResponse<R>>
    where
        T: Serialize,
        R: DeserializeOwned,
    {
        let token = self.token.as_ref().ok_or(Error::MissingToken)?;

        let res = self
            .http
            .post(API_URL)
            .bearer_auth(token)
            .header("user-agent", "hey-github-wanna-hire-me?")
            .json(body)
            .send()
            .await?;

        if !res.status().is_success() {
            let status = res.status().as_u16();
            return Err(Error::BadRequest {
                status,
                message: res.text().await?,
            });
        }

        let rate_limit = RateLimit::from(res.headers());
        let response_body: Response<R> = res.json().await?;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct RateLimit {
    pub limit: u32,
    pub remaining: u32,
    pub reset: u32,
    pub used: u32,
}

impl RateLimit {
    fn from(headers: &HeaderMap) -> Self {
        let get_value = |k: &str| {
            headers
                .get(k)
                .and_then(|f| f.to_str().ok())
                .and_then(|f| f.parse::<u32>().ok())
                .unwrap_or(0)
        };

        RateLimit {
            limit: get_value("X-RateLimit-Limit"),
            remaining: get_value("X-RateLimit-Remaining"),
            reset: get_value("X-RateLimit-Reset"),
            used: get_value("X-RateLimit-Used"),
        }
    }
}
