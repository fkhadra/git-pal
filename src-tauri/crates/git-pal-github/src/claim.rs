use graphql_client::QueryBody;
use serde::{Deserialize, Serialize};

use crate::api_client::{Client, Result};
use crate::codeowners::{Login, Logins, TeamRef};
use crate::graphql::GraphQLResponse;
use crate::rest::{API_URL, GetPullRequestRequest};

const ASSIGNMENTS_QUERY: &str =
    "query Assignments($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      assignees(first: 100) { nodes { login } }
      timelineItems(itemTypes: [ASSIGNED_EVENT], first: 100) {
        nodes { ... on AssignedEvent { assignee { ... on User { login } } } }
      }
    }
  }
}";
const ASSIGNMENTS_OPERATION: &str = "Assignments";

/// Who holds a pull request.
#[derive(Debug, Clone, Default)]
pub struct Assignments {
    pub assignees: Vec<String>,
    /// Users assigned over time, oldest first
    pub assigned: Vec<String>,
}

#[derive(Serialize)]
struct Variables {
    owner: String,
    name: String,
    number: i64,
}

#[derive(Debug, Clone, Deserialize)]
struct AssignedUser {
    login: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct AssignedEvent {
    assignee: Option<AssignedUser>,
}

#[derive(Debug, Clone, Deserialize)]
struct TimelineItems {
    nodes: Vec<AssignedEvent>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AssignmentsPullRequest {
    assignees: Logins,
    timeline_items: TimelineItems,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AssignmentsRepository {
    pull_request: Option<AssignmentsPullRequest>,
}

#[derive(Debug, Clone, Deserialize)]
struct AssignmentsData {
    repository: Option<AssignmentsRepository>,
}

fn assignees_url(request: &GetPullRequestRequest) -> String {
    format!(
        "{API_URL}repos/{}/{}/issues/{}/assignees",
        request.owner, request.repository, request.number
    )
}

impl Client {
    /// Logins of every member of `teams`, without duplicates.
    pub async fn team_members(&self, teams: &[TeamRef]) -> Result<Vec<String>> {
        let mut members: Vec<String> = Vec::new();

        for team in teams {
            let url = format!(
                "{API_URL}orgs/{}/teams/{}/members",
                team.organization, team.slug
            );
            let logins: Vec<Login> = self.get_all_pages(&url).await?;

            for Login { login } in logins {
                if !members.contains(&login) {
                    members.push(login);
                }
            }
        }

        Ok(members)
    }

    pub async fn assign(&self, request: &GetPullRequestRequest, login: &str) -> Result<()> {
        let req = self
            .http
            .post(assignees_url(request))
            .json(&serde_json::json!({ "assignees": [login] }));

        self.do_request(req).await?;

        Ok(())
    }

    pub async fn unassign(&self, request: &GetPullRequestRequest, login: &str) -> Result<()> {
        let req = self
            .http
            .delete(assignees_url(request))
            .json(&serde_json::json!({ "assignees": [login] }));

        self.do_request(req).await?;

        Ok(())
    }

    pub async fn assignments(&self, request: &GetPullRequestRequest) -> Result<Assignments> {
        let body = QueryBody {
            variables: Variables {
                owner: request.owner.clone(),
                name: request.repository.clone(),
                number: request.number,
            },
            query: ASSIGNMENTS_QUERY,
            operation_name: ASSIGNMENTS_OPERATION,
        };

        let res: GraphQLResponse<AssignmentsData> = self.send_graphql(&body).await?;
        let Some(pr) = res
            .data
            .and_then(|data| data.repository)
            .and_then(|r| r.pull_request)
        else {
            return Ok(Assignments::default());
        };

        Ok(Assignments {
            assignees: pr.assignees.nodes.into_iter().map(|a| a.login).collect(),
            assigned: pr
                .timeline_items
                .nodes
                .into_iter()
                .filter_map(|e| e.assignee.and_then(|a| a.login))
                .collect(),
        })
    }
}
