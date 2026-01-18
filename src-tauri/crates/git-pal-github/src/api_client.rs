use std::{
    fmt::Debug,
    sync::{Arc, Mutex},
};

use reqwest::{Client as HttpClient, RequestBuilder, header::HeaderMap};

use serde::{self, Deserialize, Serialize};
use ts_rs::TS;

use crate::graphql::UserProfile;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("token is missing")]
    MissingToken,
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

        let res = req
            .bearer_auth(token)
            .header("user-agent", "hey-github-wanna-hire-me?")
            .send()
            .await?;

        if !res.status().is_success() {
            return Err(Error::BadRequest(
                res.json::<ErrorResponse>().await?.message,
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
