use globset::{Glob, GlobBuilder, GlobMatcher};
use graphql_client::QueryBody;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::api_client::{Client, Result};
use crate::graphql::GraphQLResponse;
use crate::rest::API_URL;

const LOCATIONS: [&str; 3] = [".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"];

const QUERY: &str = "query Codeowners($owner: String!, $name: String!, $github: String!, $root: String!, $docs: String!) {
  repository(owner: $owner, name: $name) {
    github: object(expression: $github) { ... on Blob { text } }
    root: object(expression: $root) { ... on Blob { text } }
    docs: object(expression: $docs) { ... on Blob { text } }
  }
}";
const OPERATION: &str = "Codeowners";

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "rest.ts")]
pub struct OwnedFilesRequest {
    pub owner: String,
    pub repository: String,
    pub base_ref: String,
    pub files: Vec<String>,
}

#[derive(Serialize)]
struct Variables {
    owner: String,
    name: String,
    github: String,
    root: String,
    docs: String,
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
    docs: Option<Blob>,
}

#[derive(Debug, Clone, Deserialize)]
struct CodeownersData {
    repository: Option<Locations>,
}

#[derive(Deserialize)]
struct Team {
    slug: String,
    organization: TeamOrganization,
}

#[derive(Deserialize)]
struct TeamOrganization {
    login: String,
}

struct Rule {
    matchers: Vec<GlobMatcher>,
    owners: Vec<String>,
}

fn glob(pattern: &str) -> Option<GlobMatcher> {
    GlobBuilder::new(pattern)
        .literal_separator(true)
        .build()
        .map(|g: Glob| g.compile_matcher())
        .ok()
}

fn pattern_globs(pattern: &str) -> Vec<String> {
    let is_folder = pattern.ends_with('/');
    let trimmed = pattern.trim_end_matches('/');
    let is_anchored = trimmed.contains('/');
    let path = trimmed.trim_start_matches('/');

    let base = if is_anchored {
        path.to_string()
    } else {
        format!("**/{path}")
    };

    if is_folder {
        return vec![format!("{base}/**")];
    }

    // `docs/*` only matches files directly in docs, a plain name may be a folder
    let name = path.rsplit('/').next().unwrap_or(path);
    if name.contains('*') {
        return vec![base];
    }

    vec![base.clone(), format!("{base}/**")]
}

fn parse(text: &str) -> Vec<Rule> {
    text.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .filter_map(|line| {
            let mut parts = line.split_whitespace();
            let pattern = parts.next()?;
            let owners = parts
                .take_while(|part| !part.starts_with('#'))
                .map(str::to_lowercase)
                .collect();
            let matchers = pattern_globs(pattern)
                .iter()
                .filter_map(|g| glob(g))
                .collect();

            Some(Rule { matchers, owners })
        })
        .collect()
}

fn owners_of<'a>(rules: &'a [Rule], path: &str) -> &'a [String] {
    rules
        .iter()
        .rev()
        .find(|rule| rule.matchers.iter().any(|m| m.is_match(path)))
        .map(|rule| rule.owners.as_slice())
        .unwrap_or_default()
}

fn owned_by(text: &str, files: &[String], handles: &[String]) -> Vec<String> {
    let rules = parse(text);

    files
        .iter()
        .filter(|file| owners_of(&rules, file).iter().any(|o| handles.contains(o)))
        .cloned()
        .collect()
}

impl Client {
    async fn codeowners(&self, request: &OwnedFilesRequest) -> Result<Option<String>> {
        let [github, root, docs] = LOCATIONS.map(|path| format!("{}:{path}", request.base_ref));
        let body = QueryBody {
            variables: Variables {
                owner: request.owner.clone(),
                name: request.repository.clone(),
                github,
                root,
                docs,
            },
            query: QUERY,
            operation_name: OPERATION,
        };

        let res: GraphQLResponse<CodeownersData> = self.send_graphql(&body).await?;
        let text = res.data.and_then(|data| data.repository).and_then(|l| {
            [l.github, l.root, l.docs]
                .into_iter()
                .flatten()
                .find_map(|b| b.text)
        });

        Ok(text)
    }

    /// The viewer's login and teams, as CODEOWNERS writes them.
    async fn owner_handles(&self) -> Result<Vec<String>> {
        let login = match self.get_user() {
            Some(user) => user.login,
            None => self.load_user_profile().await?.login,
        };
        let teams: Vec<Team> = self.get_all_pages(&format!("{API_URL}user/teams")).await?;

        let mut handles = vec![format!("@{login}")];
        handles.extend(
            teams
                .into_iter()
                .map(|t| format!("@{}/{}", t.organization.login, t.slug)),
        );

        Ok(handles.into_iter().map(|h| h.to_lowercase()).collect())
    }

    /// Files the viewer owns, `None` when the repository has no CODEOWNERS.
    pub async fn owned_files(&self, request: &OwnedFilesRequest) -> Result<Option<Vec<String>>> {
        let Some(text) = self.codeowners(request).await? else {
            return Ok(None);
        };

        let handles = self.owner_handles().await?;

        Ok(Some(owned_by(&text, &request.files, &handles)))
    }
}
