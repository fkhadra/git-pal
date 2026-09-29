use std::{
    fmt::Debug,
    sync::{Arc, Mutex},
};

use reqwest::{
    Client as HttpClient, RequestBuilder, StatusCode, header::HeaderMap, header::HeaderValue,
};

use serde::{self, Deserialize, Serialize};
use ts_rs::TS;

use crate::graphql::UserProfile;

pub type Result<T> = std::result::Result<T, Error>;

const USER_AGENT: &str = "hey-github-wanna-hire-me?";

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("token is missing")]
    MissingToken,
    #[error("resource not found")]
    ResourceNotFound,
    #[error("invalid request:  {0}")]
    BadRequest(String),
    #[error("no data")]
    MissingData,
    #[error("missing user")]
    MissingUser,
    #[error("invalid workflow file: {0}")]
    InvalidWorkflowFile(String),
    #[error(transparent)]
    Other(#[from] reqwest::Error),
}

#[derive(Debug, Deserialize)]
struct ErrorResponse {
    message: String,
    /// Validation details, e.g. why a review comment was rejected
    #[serde(default)]
    errors: Vec<serde_json::Value>,
}

impl ErrorResponse {
    fn describe(self) -> String {
        if self.errors.is_empty() {
            return self.message;
        }

        let details: Vec<String> = self
            .errors
            .iter()
            .map(|e| match e.as_str().or(e["message"].as_str()) {
                Some(text) => text.to_string(),
                None => e.to_string(),
            })
            .collect();

        format!("{}: {}", self.message, details.join("; "))
    }
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "api.ts")]
pub struct Token {
    pub value: String,
    pub expire_at: Option<String>,
}

pub(super) struct Response {
    pub(super) metadata: Metadata,
    pub(super) response: reqwest::Response,
}

pub struct Client {
    pub(super) token: Mutex<Arc<Option<String>>>,
    pub(super) http: HttpClient,
    pub(super) user: Mutex<Option<UserProfile>>,
}

impl Client {
    pub fn new(token: Option<String>) -> Self {
        Client {
            user: Mutex::new(None),
            http: reqwest::Client::new(),
            token: Mutex::new(Arc::new(token)),
        }
    }

    pub fn get_user(&self) -> Option<UserProfile> {
        self.user.lock().unwrap().clone()
    }

    pub fn get_token(&self) -> Result<Token> {
        Ok(Token {
            value: self
                .token
                .lock()
                .unwrap()
                .as_ref()
                .clone()
                .unwrap_or("".to_string()),
            expire_at: self.with_user(|u| u.token_expire_at.clone())?,
        })
    }

    pub fn with_user<F, R>(&self, f: F) -> Result<R>
    where
        F: FnOnce(&UserProfile) -> R,
    {
        let guard = self.user.lock().unwrap();
        let user = guard.as_ref().ok_or(Error::MissingUser)?;

        Ok(f(user))
    }

    pub fn set_token(&self, token: String) {
        let mut guard = self.token.lock().unwrap();
        *guard = Arc::new(Some(token));
    }

    pub fn is_token_set(&self) -> bool {
        self.token.lock().unwrap().is_some()
    }

    pub(super) async fn do_request(&self, req: RequestBuilder) -> Result<Response> {
        let snapshot = {
            let guard = self.token.lock().unwrap();
            guard.as_ref().clone()
        };

        let token = snapshot.ok_or(Error::MissingToken)?;

        let mut request = req
            .bearer_auth(token)
            .header("user-agent", USER_AGENT)
            .build()?;
        let should_set_default_header = !request.url().as_str().ends_with("graphql")
            && !request.headers().contains_key("Accept");

        if should_set_default_header {
            request.headers_mut().insert(
                "Accept",
                HeaderValue::from_static("application/vnd.github+json"),
            );
        }

        let res = self.http.execute(request).await?;

        if res.status() == StatusCode::NOT_FOUND {
            return Err(Error::ResourceNotFound);
        }

        if !res.status().is_success() {
            return Err(Error::BadRequest(
                res.json::<ErrorResponse>().await?.describe(),
            ));
        }

        let metadata = Metadata::extract(res.headers());

        log::debug!("Rate limit: {:?}", metadata.rate_limit);

        Ok(Response {
            metadata,
            response: res,
        })
    }
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "api.ts")]
pub struct RateLimit {
    pub limit: u32,
    pub remaining: u32,
    pub reset: u32,
    pub used: u32,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "api.ts")]
pub struct Metadata {
    pub rate_limit: RateLimit,
    pub token_expiration: Option<String>,
}

impl Metadata {
    pub(super) fn extract(headers: &HeaderMap) -> Self {
        let get_int_value = |k: &str| {
            headers
                .get(k)
                .and_then(|f| f.to_str().ok())
                .and_then(|f| f.parse::<u32>().ok())
                .unwrap_or(0)
        };

        Metadata {
            rate_limit: RateLimit {
                limit: get_int_value("X-RateLimit-Limit"),
                remaining: get_int_value("X-RateLimit-Remaining"),
                reset: get_int_value("X-RateLimit-Reset"),
                used: get_int_value("X-RateLimit-Used"),
            },
            token_expiration: headers
                .get("github-authentication-token-expiration")
                .and_then(|f| f.to_str().ok())
                .and_then(|f| f.parse::<String>().ok()),
        }
    }
}
