use graphql_client::QueryBody;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::api_client::{Client, Result};
use crate::graphql::GraphQLResponse;

const QUERY: &str =
    "query MentionableUsers($owner: String!, $name: String!, $query: String!, $first: Int!) {
  repository(owner: $owner, name: $name) {
    mentionableUsers(query: $query, first: $first) { nodes { login name avatarUrl } }
  }
}";
const OPERATION: &str = "MentionableUsers";
const MAX_USERS: u32 = 8;

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "graphql.ts")]
pub struct MentionableUsersRequest {
    pub owner: String,
    pub repository: String,
    pub query: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "graphql.ts")]
pub struct MentionableUser {
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: String,
}

#[derive(Serialize)]
struct Variables {
    owner: String,
    name: String,
    query: String,
    first: u32,
}

#[derive(Debug, Clone, Deserialize)]
struct Users {
    nodes: Vec<Option<MentionableUser>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Repository {
    mentionable_users: Users,
}

#[derive(Debug, Clone, Deserialize)]
struct MentionableUsersData {
    repository: Option<Repository>,
}

impl Client {
    /// Users that can be mentioned in the repository, matching their login or name.
    pub async fn mentionable_users(
        &self,
        request: &MentionableUsersRequest,
    ) -> Result<Vec<MentionableUser>> {
        let body = QueryBody {
            variables: Variables {
                owner: request.owner.clone(),
                name: request.repository.clone(),
                query: request.query.clone(),
                first: MAX_USERS,
            },
            query: QUERY,
            operation_name: OPERATION,
        };

        let res: GraphQLResponse<MentionableUsersData> = self.send_graphql(&body).await?;
        let users = res
            .data
            .and_then(|data| data.repository)
            .map(|repo| repo.mentionable_users.nodes.into_iter().flatten().collect())
            .unwrap_or_default();

        Ok(users)
    }
}
