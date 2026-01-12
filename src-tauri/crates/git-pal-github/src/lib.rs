mod api_client;
mod custom_scalars;

pub mod graphql;
pub mod oauth;
pub mod query;
pub mod rest;

pub mod github {
    pub use super::api_client::*;
}
