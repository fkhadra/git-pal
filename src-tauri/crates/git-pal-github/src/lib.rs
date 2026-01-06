mod api_client;
mod custom_scalars;
mod graphql_tests;

pub mod graphql;
pub mod rest;
pub mod oauth;
pub mod query;

pub mod github {
    pub use super::api_client::*;
}
