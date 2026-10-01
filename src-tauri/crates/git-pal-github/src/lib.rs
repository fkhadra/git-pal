mod api_client;
mod attachments;
mod custom_scalars;

pub mod codeowners;
pub mod conversation;
pub mod graphql;
pub mod oauth;
pub mod query;
pub mod rest;
pub mod scope;
pub mod status;

pub mod github {
    pub use super::api_client::*;
}
