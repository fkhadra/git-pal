use std::{
    fmt::Debug,
    sync::{Arc, Mutex},
};

use reqwest::{Client as HttpClient, RequestBuilder, header::HeaderMap};

use serde::{self, Deserialize, Serialize};
use ts_rs::TS;

use crate::query::user_profile;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("token is missing")]
    MissingToken,
    #[error("invalid request: {status:} {message:}")]
    BadRequest { message: String, status: u16 },
    #[error("no data")]
    MissingData,
    #[error("missing user")]
    MissingUser,
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
    pub(super) token: Mutex<Arc<Option<String>>>,
    pub(super) http: HttpClient,
    pub(super) user: Mutex<Option<user_profile::UserProfileViewer>>,
}

impl Client {
    pub fn new(token: Option<String>) -> Self {
        Client {
            user: Mutex::new(None),
            http: reqwest::Client::new(),
            token: Mutex::new(Arc::new(token)),
        }
    }

    pub fn get_user(&self) -> Option<user_profile::UserProfileViewer> {
        self.user.lock().unwrap().clone()
    }

    pub fn with_user<F, R>(&self, f: F) -> Result<R>
    where
        F: FnOnce(&user_profile::UserProfileViewer) -> R,
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
            let status = res.status().as_u16();
            return Err(Error::BadRequest {
                status,
                message: res.text().await?,
            });
        }

        let rate_limit = RateLimit::extract(res.headers());

        log::debug!("Rate limit: {:?}", rate_limit);

        Ok(Response {
            rate_limit,
            response: res,
        })
    }
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../../src/models/api.ts")]
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
