use graphql_client::QueryBody;
use serde::{Deserialize, Serialize};

use crate::api_client::{Client, Result};
use crate::graphql::GraphQLResponse;

/// Where `git-pal.yml` is looked up, first found wins.
const LOCATIONS: [&str; 2] = [".github/git-pal.yml", ".git-pal.yml"];

const QUERY: &str =
    "query PolicyFile($owner: String!, $name: String!, $github: String!, $root: String!) {
  repository(owner: $owner, name: $name) {
    github: object(expression: $github) { ... on Blob { text } }
    root: object(expression: $root) { ... on Blob { text } }
  }
}";
const OPERATION: &str = "PolicyFile";

#[derive(Serialize)]
struct Variables {
    owner: String,
    name: String,
    github: String,
    root: String,
}

#[derive(Debug, Clone, Deserialize)]
struct Blob {
    #[serde(default)]
    text: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct Locations {
    github: Option<Blob>,
    root: Option<Blob>,
}

#[derive(Debug, Clone, Deserialize)]
struct PolicyFileData {
    repository: Option<Locations>,
}

impl Client {
    /// `git-pal.yml` on `base_ref`, `None` when the repository has none.
    pub async fn policy_file(
        &self,
        owner: &str,
        repository: &str,
        base_ref: &str,
    ) -> Result<Option<String>> {
        let [github, root] = LOCATIONS.map(|path| format!("{base_ref}:{path}"));
        let body = QueryBody {
            variables: Variables {
                owner: owner.to_string(),
                name: repository.to_string(),
                github,
                root,
            },
            query: QUERY,
            operation_name: OPERATION,
        };

        let res: GraphQLResponse<PolicyFileData> = self.send_graphql(&body).await?;
        let text = res.data.and_then(|data| data.repository).and_then(|l| {
            [l.github, l.root]
                .into_iter()
                .flatten()
                .find_map(|b| b.text)
        });

        Ok(text)
    }
}
