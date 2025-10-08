use std::fmt::Debug;

use reqwest::{header::HeaderMap, Client as HttpClient, RequestBuilder};

use serde::{self, Deserialize, Serialize};
use ts_rs::TS;

use super::query::user_profile;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/models/api.ts")]
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
    #[error("invalid workflow file: {0}")]
    InvalidWorkflowFile(String),
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

pub(super) struct Response {
    pub(super) rate_limit: RateLimit,
    pub(super) response: reqwest::Response,
}

pub struct Client {
    pub(super) token: Option<String>,
    pub user: Option<user_profile::UserProfileViewer>,
    pub(super) http: HttpClient,
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

    pub(super) async fn do_request(&self, req: RequestBuilder) -> Result<Response> {
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

        Ok(Response {
            rate_limit,
            response: res,
        })
    }
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/models/api.ts")]
pub struct RateLimit {
    pub limit: u32,
    pub remaining: u32,
    pub reset: u32,
    pub used: u32,
}

impl RateLimit {
    pub(super) fn extract(headers: &HeaderMap) -> Self {
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
