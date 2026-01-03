#![allow(clippy::all, warnings)]
use ts_rs::TS;
pub struct UserProfile;
pub mod user_profile {
    #![allow(dead_code)]
    use std::result::Result;
    pub const OPERATION_NAME: &str = "UserProfile";
    pub const QUERY : & str = "fragment PullRequest on PullRequest {\n  id\n  number\n  title\n  url\n  isDraft\n  isInMergeQueue\n  mergeable\n  state\n  reviewDecision\n  totalCommentsCount\n  statusCheckRollup {\n    state\n    commit {\n      status {\n        state\n        contexts {\n          state\n          context\n          description\n          targetUrl\n        }\n      }\n    }\n  }\n  autoMergeRequest {\n    enabledAt\n  }\n  author {\n    __typename\n    login\n    url\n    avatarUrl\n  }\n  repository {\n    owner {\n      __typename\n      login\n    }\n    name\n    url\n  }\n  baseRefName\n  headRefName\n  createdAt\n  mergedAt\n}\n\n# fragment Issue on Issue {\n#   id\n#   url\n#   title\n#   number\n#   state\n#   comments {\n#     totalCount\n#   }\n#   author {\n#     __typename\n#     login\n#     url\n#     avatarUrl\n#   }\n#   repository {\n#     owner {\n#       __typename\n#       login\n#       avatarUrl\n#     }\n#     name\n#     url\n#   }\n#   createdAt\n#   updatedAt\n# }\n#\nfragment Repository on Repository {\n  id\n  name\n  url\n  isPrivate\n  isInOrganization\n  stargazerCount\n  pullRequests(states: OPEN) {\n    totalCount\n  }\n  hasIssuesEnabled\n  hasDiscussionsEnabled\n  hasProjectsEnabled\n  hasWikiEnabled\n  homepageUrl\n  issues(states: OPEN) {\n    totalCount\n  }\n  discussions(states: OPEN) {\n    totalCount\n  }\n  owner {\n    __typename\n    login\n    avatarUrl\n  }\n}\n\nfragment Organization on Organization {\n  login\n  name\n  avatarUrl\n  url\n}\n\nquery UserProfile {\n  viewer {\n    login\n    avatarUrl\n    email\n    url\n    organizations(first: 5) {\n      nodes {\n        __typename\n        ...Organization\n      }\n    }\n  }\n}\n\nquery Homepage($pullRequestCount: Int!, $topRepositoryCount: Int!) {\n  viewer {\n    pullRequests(\n      states: OPEN\n      first: $pullRequestCount\n      orderBy: { direction: DESC, field: CREATED_AT }\n    ) {\n      nodes {\n        __typename\n        ...PullRequest\n      }\n    }\n    topRepositories(\n      first: $topRepositoryCount\n      \n      orderBy: { field: STARGAZERS, direction: DESC }\n    ) {\n      nodes {\n        __typename\n        ...Repository\n      }\n    }\n  }\n}\n\nquery SearchPullRequest($count: Int!, $query: String!) {\n  search(first: $count, query: $query, type: ISSUE) {\n    nodes {\n      __typename\n      ...PullRequest\n    }\n  }\n}\n\nquery FindRepositories($count: Int!, $query: String!) {\n  search(first: $count, query: $query, type: REPOSITORY) {\n    nodes {\n      __typename\n      ...Repository\n    }\n  }\n}\n" ;
    use super::*;
    use serde::{Deserialize, Serialize};
    #[allow(dead_code)]
    type Boolean = bool;
    #[allow(dead_code)]
    type Float = f64;
    #[allow(dead_code)]
    type Int = i64;
    #[allow(dead_code)]
    type ID = String;
    type URI = crate::github::custom_scalars::URI;
    #[derive(Serialize)]
    pub struct Variables;
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/user-profile.ts")]
    pub struct Organization {
        pub login: String,
        pub name: Option<String>,
        #[serde(rename = "avatarUrl")]
        pub avatar_url: URI,
        pub url: URI,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/user-profile.ts")]
    pub struct ResponseData {
        pub viewer: UserProfileViewer,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/user-profile.ts")]
    pub struct UserProfileViewer {
        pub login: String,
        #[serde(rename = "avatarUrl")]
        pub avatar_url: URI,
        pub email: String,
        pub url: URI,
        pub organizations: UserProfileViewerOrganizations,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/user-profile.ts")]
    pub struct UserProfileViewerOrganizations {
        pub nodes: Option<Vec<Option<UserProfileViewerOrganizationsNodes>>>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/user-profile.ts")]
    pub struct UserProfileViewerOrganizationsNodes {
        #[serde(flatten)]
        pub organization: Organization,
    }
}
impl graphql_client::GraphQLQuery for UserProfile {
    type Variables = user_profile::Variables;
    type ResponseData = user_profile::ResponseData;
    fn build_query(variables: Self::Variables) -> ::graphql_client::QueryBody<Self::Variables> {
        graphql_client::QueryBody {
            variables,
            query: user_profile::QUERY,
            operation_name: user_profile::OPERATION_NAME,
        }
    }
}
pub struct Homepage;
pub mod homepage {
    #![allow(dead_code)]
    use std::result::Result;
    pub const OPERATION_NAME: &str = "Homepage";
    pub const QUERY : & str = "fragment PullRequest on PullRequest {\n  id\n  number\n  title\n  url\n  isDraft\n  isInMergeQueue\n  mergeable\n  state\n  reviewDecision\n  totalCommentsCount\n  statusCheckRollup {\n    state\n    commit {\n      status {\n        state\n        contexts {\n          state\n          context\n          description\n          targetUrl\n        }\n      }\n    }\n  }\n  autoMergeRequest {\n    enabledAt\n  }\n  author {\n    __typename\n    login\n    url\n    avatarUrl\n  }\n  repository {\n    owner {\n      __typename\n      login\n    }\n    name\n    url\n  }\n  baseRefName\n  headRefName\n  createdAt\n  mergedAt\n}\n\n# fragment Issue on Issue {\n#   id\n#   url\n#   title\n#   number\n#   state\n#   comments {\n#     totalCount\n#   }\n#   author {\n#     __typename\n#     login\n#     url\n#     avatarUrl\n#   }\n#   repository {\n#     owner {\n#       __typename\n#       login\n#       avatarUrl\n#     }\n#     name\n#     url\n#   }\n#   createdAt\n#   updatedAt\n# }\n#\nfragment Repository on Repository {\n  id\n  name\n  url\n  isPrivate\n  isInOrganization\n  stargazerCount\n  pullRequests(states: OPEN) {\n    totalCount\n  }\n  hasIssuesEnabled\n  hasDiscussionsEnabled\n  hasProjectsEnabled\n  hasWikiEnabled\n  homepageUrl\n  issues(states: OPEN) {\n    totalCount\n  }\n  discussions(states: OPEN) {\n    totalCount\n  }\n  owner {\n    __typename\n    login\n    avatarUrl\n  }\n}\n\nfragment Organization on Organization {\n  login\n  name\n  avatarUrl\n  url\n}\n\nquery UserProfile {\n  viewer {\n    login\n    avatarUrl\n    email\n    url\n    organizations(first: 5) {\n      nodes {\n        __typename\n        ...Organization\n      }\n    }\n  }\n}\n\nquery Homepage($pullRequestCount: Int!, $topRepositoryCount: Int!) {\n  viewer {\n    pullRequests(\n      states: OPEN\n      first: $pullRequestCount\n      orderBy: { direction: DESC, field: CREATED_AT }\n    ) {\n      nodes {\n        __typename\n        ...PullRequest\n      }\n    }\n    topRepositories(\n      first: $topRepositoryCount\n      \n      orderBy: { field: STARGAZERS, direction: DESC }\n    ) {\n      nodes {\n        __typename\n        ...Repository\n      }\n    }\n  }\n}\n\nquery SearchPullRequest($count: Int!, $query: String!) {\n  search(first: $count, query: $query, type: ISSUE) {\n    nodes {\n      __typename\n      ...PullRequest\n    }\n  }\n}\n\nquery FindRepositories($count: Int!, $query: String!) {\n  search(first: $count, query: $query, type: REPOSITORY) {\n    nodes {\n      __typename\n      ...Repository\n    }\n  }\n}\n" ;
    use super::*;
    use serde::{Deserialize, Serialize};
    #[allow(dead_code)]
    type Boolean = bool;
    #[allow(dead_code)]
    type Float = f64;
    #[allow(dead_code)]
    type Int = i64;
    #[allow(dead_code)]
    type ID = String;
    type DateTime = crate::github::custom_scalars::DateTime;
    type URI = crate::github::custom_scalars::URI;
    #[derive(Clone, Debug, TS)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub enum MergeableState {
        CONFLICTING,
        MERGEABLE,
        UNKNOWN,
        Other(String),
    }
    impl ::serde::Serialize for MergeableState {
        fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
            ser.serialize_str(match *self {
                MergeableState::CONFLICTING => "CONFLICTING",
                MergeableState::MERGEABLE => "MERGEABLE",
                MergeableState::UNKNOWN => "UNKNOWN",
                MergeableState::Other(ref s) => &s,
            })
        }
    }
    impl<'de> ::serde::Deserialize<'de> for MergeableState {
        fn deserialize<D: ::serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
            let s: String = ::serde::Deserialize::deserialize(deserializer)?;
            match s.as_str() {
                "CONFLICTING" => Ok(MergeableState::CONFLICTING),
                "MERGEABLE" => Ok(MergeableState::MERGEABLE),
                "UNKNOWN" => Ok(MergeableState::UNKNOWN),
                _ => Ok(MergeableState::Other(s)),
            }
        }
    }
    #[derive(Clone, Debug, TS)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub enum PullRequestReviewDecision {
        APPROVED,
        CHANGES_REQUESTED,
        REVIEW_REQUIRED,
        Other(String),
    }
    impl ::serde::Serialize for PullRequestReviewDecision {
        fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
            ser.serialize_str(match *self {
                PullRequestReviewDecision::APPROVED => "APPROVED",
                PullRequestReviewDecision::CHANGES_REQUESTED => "CHANGES_REQUESTED",
                PullRequestReviewDecision::REVIEW_REQUIRED => "REVIEW_REQUIRED",
                PullRequestReviewDecision::Other(ref s) => &s,
            })
        }
    }
    impl<'de> ::serde::Deserialize<'de> for PullRequestReviewDecision {
        fn deserialize<D: ::serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
            let s: String = ::serde::Deserialize::deserialize(deserializer)?;
            match s.as_str() {
                "APPROVED" => Ok(PullRequestReviewDecision::APPROVED),
                "CHANGES_REQUESTED" => Ok(PullRequestReviewDecision::CHANGES_REQUESTED),
                "REVIEW_REQUIRED" => Ok(PullRequestReviewDecision::REVIEW_REQUIRED),
                _ => Ok(PullRequestReviewDecision::Other(s)),
            }
        }
    }
    #[derive(Clone, Debug, TS)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub enum PullRequestState {
        CLOSED,
        MERGED,
        OPEN,
        Other(String),
    }
    impl ::serde::Serialize for PullRequestState {
        fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
            ser.serialize_str(match *self {
                PullRequestState::CLOSED => "CLOSED",
                PullRequestState::MERGED => "MERGED",
                PullRequestState::OPEN => "OPEN",
                PullRequestState::Other(ref s) => &s,
            })
        }
    }
    impl<'de> ::serde::Deserialize<'de> for PullRequestState {
        fn deserialize<D: ::serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
            let s: String = ::serde::Deserialize::deserialize(deserializer)?;
            match s.as_str() {
                "CLOSED" => Ok(PullRequestState::CLOSED),
                "MERGED" => Ok(PullRequestState::MERGED),
                "OPEN" => Ok(PullRequestState::OPEN),
                _ => Ok(PullRequestState::Other(s)),
            }
        }
    }
    #[derive(Clone, Debug, TS)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub enum StatusState {
        ERROR,
        EXPECTED,
        FAILURE,
        PENDING,
        SUCCESS,
        Other(String),
    }
    impl ::serde::Serialize for StatusState {
        fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
            ser.serialize_str(match *self {
                StatusState::ERROR => "ERROR",
                StatusState::EXPECTED => "EXPECTED",
                StatusState::FAILURE => "FAILURE",
                StatusState::PENDING => "PENDING",
                StatusState::SUCCESS => "SUCCESS",
                StatusState::Other(ref s) => &s,
            })
        }
    }
    impl<'de> ::serde::Deserialize<'de> for StatusState {
        fn deserialize<D: ::serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
            let s: String = ::serde::Deserialize::deserialize(deserializer)?;
            match s.as_str() {
                "ERROR" => Ok(StatusState::ERROR),
                "EXPECTED" => Ok(StatusState::EXPECTED),
                "FAILURE" => Ok(StatusState::FAILURE),
                "PENDING" => Ok(StatusState::PENDING),
                "SUCCESS" => Ok(StatusState::SUCCESS),
                _ => Ok(StatusState::Other(s)),
            }
        }
    }
    #[derive(Serialize)]
    pub struct Variables {
        #[serde(rename = "pullRequestCount")]
        pub pull_request_count: Int,
        #[serde(rename = "topRepositoryCount")]
        pub top_repository_count: Int,
    }
    impl Variables {}
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct PullRequest {
        pub id: ID,
        pub number: Int,
        pub title: String,
        pub url: URI,
        #[serde(rename = "isDraft")]
        pub is_draft: Boolean,
        #[serde(rename = "isInMergeQueue")]
        pub is_in_merge_queue: Boolean,
        pub mergeable: MergeableState,
        pub state: PullRequestState,
        #[serde(rename = "reviewDecision")]
        pub review_decision: Option<PullRequestReviewDecision>,
        #[serde(rename = "totalCommentsCount")]
        pub total_comments_count: Option<Int>,
        #[serde(rename = "statusCheckRollup")]
        pub status_check_rollup: Option<PullRequestStatusCheckRollup>,
        #[serde(rename = "autoMergeRequest")]
        pub auto_merge_request: Option<PullRequestAutoMergeRequest>,
        pub author: Option<PullRequestAuthor>,
        pub repository: PullRequestRepository,
        #[serde(rename = "baseRefName")]
        pub base_ref_name: String,
        #[serde(rename = "headRefName")]
        pub head_ref_name: String,
        #[serde(rename = "createdAt")]
        pub created_at: DateTime,
        #[serde(rename = "mergedAt")]
        pub merged_at: Option<DateTime>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct PullRequestStatusCheckRollup {
        pub state: StatusState,
        pub commit: Option<PullRequestStatusCheckRollupCommit>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct PullRequestStatusCheckRollupCommit {
        pub status: Option<PullRequestStatusCheckRollupCommitStatus>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct PullRequestStatusCheckRollupCommitStatus {
        pub state: StatusState,
        pub contexts: Vec<PullRequestStatusCheckRollupCommitStatusContexts>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct PullRequestStatusCheckRollupCommitStatusContexts {
        pub state: StatusState,
        pub context: String,
        pub description: Option<String>,
        #[serde(rename = "targetUrl")]
        pub target_url: Option<URI>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct PullRequestAutoMergeRequest {
        #[serde(rename = "enabledAt")]
        pub enabled_at: Option<DateTime>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct PullRequestAuthor {
        pub login: String,
        pub url: URI,
        #[serde(rename = "avatarUrl")]
        pub avatar_url: URI,
        #[serde(flatten)]
        pub on: PullRequestAuthorOn,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    #[serde(tag = "__typename")]
    pub enum PullRequestAuthorOn {
        Bot,
        EnterpriseUserAccount,
        Mannequin,
        Organization,
        User,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct PullRequestRepository {
        pub owner: PullRequestRepositoryOwner,
        pub name: String,
        pub url: URI,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct PullRequestRepositoryOwner {
        pub login: String,
        #[serde(flatten)]
        pub on: PullRequestRepositoryOwnerOn,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    #[serde(tag = "__typename")]
    pub enum PullRequestRepositoryOwnerOn {
        Organization,
        User,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct Repository {
        pub id: ID,
        pub name: String,
        pub url: URI,
        #[serde(rename = "isPrivate")]
        pub is_private: Boolean,
        #[serde(rename = "isInOrganization")]
        pub is_in_organization: Boolean,
        #[serde(rename = "stargazerCount")]
        pub stargazer_count: Int,
        #[serde(rename = "pullRequests")]
        pub pull_requests: RepositoryPullRequests,
        #[serde(rename = "hasIssuesEnabled")]
        pub has_issues_enabled: Boolean,
        #[serde(rename = "hasDiscussionsEnabled")]
        pub has_discussions_enabled: Boolean,
        #[serde(rename = "hasProjectsEnabled")]
        pub has_projects_enabled: Boolean,
        #[serde(rename = "hasWikiEnabled")]
        pub has_wiki_enabled: Boolean,
        #[serde(rename = "homepageUrl")]
        pub homepage_url: Option<URI>,
        pub issues: RepositoryIssues,
        pub discussions: RepositoryDiscussions,
        pub owner: RepositoryOwner,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct RepositoryPullRequests {
        #[serde(rename = "totalCount")]
        pub total_count: Int,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct RepositoryIssues {
        #[serde(rename = "totalCount")]
        pub total_count: Int,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct RepositoryDiscussions {
        #[serde(rename = "totalCount")]
        pub total_count: Int,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct RepositoryOwner {
        pub login: String,
        #[serde(rename = "avatarUrl")]
        pub avatar_url: URI,
        #[serde(flatten)]
        pub on: RepositoryOwnerOn,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    #[serde(tag = "__typename")]
    pub enum RepositoryOwnerOn {
        Organization,
        User,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct ResponseData {
        pub viewer: HomepageViewer,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct HomepageViewer {
        #[serde(rename = "pullRequests")]
        pub pull_requests: HomepageViewerPullRequests,
        #[serde(rename = "topRepositories")]
        pub top_repositories: HomepageViewerTopRepositories,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct HomepageViewerPullRequests {
        pub nodes: Option<Vec<Option<HomepageViewerPullRequestsNodes>>>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct HomepageViewerPullRequestsNodes {
        #[serde(flatten)]
        pub pull_request: PullRequest,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct HomepageViewerTopRepositories {
        pub nodes: Option<Vec<Option<HomepageViewerTopRepositoriesNodes>>>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/homepage.ts")]
    pub struct HomepageViewerTopRepositoriesNodes {
        #[serde(flatten)]
        pub repository: Repository,
    }
}
impl graphql_client::GraphQLQuery for Homepage {
    type Variables = homepage::Variables;
    type ResponseData = homepage::ResponseData;
    fn build_query(variables: Self::Variables) -> ::graphql_client::QueryBody<Self::Variables> {
        graphql_client::QueryBody {
            variables,
            query: homepage::QUERY,
            operation_name: homepage::OPERATION_NAME,
        }
    }
}
pub struct SearchPullRequest;
pub mod search_pull_request {
    #![allow(dead_code)]
    use std::result::Result;
    pub const OPERATION_NAME: &str = "SearchPullRequest";
    pub const QUERY : & str = "fragment PullRequest on PullRequest {\n  id\n  number\n  title\n  url\n  isDraft\n  isInMergeQueue\n  mergeable\n  state\n  reviewDecision\n  totalCommentsCount\n  statusCheckRollup {\n    state\n    commit {\n      status {\n        state\n        contexts {\n          state\n          context\n          description\n          targetUrl\n        }\n      }\n    }\n  }\n  autoMergeRequest {\n    enabledAt\n  }\n  author {\n    __typename\n    login\n    url\n    avatarUrl\n  }\n  repository {\n    owner {\n      __typename\n      login\n    }\n    name\n    url\n  }\n  baseRefName\n  headRefName\n  createdAt\n  mergedAt\n}\n\n# fragment Issue on Issue {\n#   id\n#   url\n#   title\n#   number\n#   state\n#   comments {\n#     totalCount\n#   }\n#   author {\n#     __typename\n#     login\n#     url\n#     avatarUrl\n#   }\n#   repository {\n#     owner {\n#       __typename\n#       login\n#       avatarUrl\n#     }\n#     name\n#     url\n#   }\n#   createdAt\n#   updatedAt\n# }\n#\nfragment Repository on Repository {\n  id\n  name\n  url\n  isPrivate\n  isInOrganization\n  stargazerCount\n  pullRequests(states: OPEN) {\n    totalCount\n  }\n  hasIssuesEnabled\n  hasDiscussionsEnabled\n  hasProjectsEnabled\n  hasWikiEnabled\n  homepageUrl\n  issues(states: OPEN) {\n    totalCount\n  }\n  discussions(states: OPEN) {\n    totalCount\n  }\n  owner {\n    __typename\n    login\n    avatarUrl\n  }\n}\n\nfragment Organization on Organization {\n  login\n  name\n  avatarUrl\n  url\n}\n\nquery UserProfile {\n  viewer {\n    login\n    avatarUrl\n    email\n    url\n    organizations(first: 5) {\n      nodes {\n        __typename\n        ...Organization\n      }\n    }\n  }\n}\n\nquery Homepage($pullRequestCount: Int!, $topRepositoryCount: Int!) {\n  viewer {\n    pullRequests(\n      states: OPEN\n      first: $pullRequestCount\n      orderBy: { direction: DESC, field: CREATED_AT }\n    ) {\n      nodes {\n        __typename\n        ...PullRequest\n      }\n    }\n    topRepositories(\n      first: $topRepositoryCount\n      \n      orderBy: { field: STARGAZERS, direction: DESC }\n    ) {\n      nodes {\n        __typename\n        ...Repository\n      }\n    }\n  }\n}\n\nquery SearchPullRequest($count: Int!, $query: String!) {\n  search(first: $count, query: $query, type: ISSUE) {\n    nodes {\n      __typename\n      ...PullRequest\n    }\n  }\n}\n\nquery FindRepositories($count: Int!, $query: String!) {\n  search(first: $count, query: $query, type: REPOSITORY) {\n    nodes {\n      __typename\n      ...Repository\n    }\n  }\n}\n" ;
    use super::*;
    use serde::{Deserialize, Serialize};
    #[allow(dead_code)]
    type Boolean = bool;
    #[allow(dead_code)]
    type Float = f64;
    #[allow(dead_code)]
    type Int = i64;
    #[allow(dead_code)]
    type ID = String;
    type DateTime = crate::github::custom_scalars::DateTime;
    type URI = crate::github::custom_scalars::URI;
    #[derive(Clone, Debug, TS)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub enum MergeableState {
        CONFLICTING,
        MERGEABLE,
        UNKNOWN,
        Other(String),
    }
    impl ::serde::Serialize for MergeableState {
        fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
            ser.serialize_str(match *self {
                MergeableState::CONFLICTING => "CONFLICTING",
                MergeableState::MERGEABLE => "MERGEABLE",
                MergeableState::UNKNOWN => "UNKNOWN",
                MergeableState::Other(ref s) => &s,
            })
        }
    }
    impl<'de> ::serde::Deserialize<'de> for MergeableState {
        fn deserialize<D: ::serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
            let s: String = ::serde::Deserialize::deserialize(deserializer)?;
            match s.as_str() {
                "CONFLICTING" => Ok(MergeableState::CONFLICTING),
                "MERGEABLE" => Ok(MergeableState::MERGEABLE),
                "UNKNOWN" => Ok(MergeableState::UNKNOWN),
                _ => Ok(MergeableState::Other(s)),
            }
        }
    }
    #[derive(Clone, Debug, TS)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub enum PullRequestReviewDecision {
        APPROVED,
        CHANGES_REQUESTED,
        REVIEW_REQUIRED,
        Other(String),
    }
    impl ::serde::Serialize for PullRequestReviewDecision {
        fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
            ser.serialize_str(match *self {
                PullRequestReviewDecision::APPROVED => "APPROVED",
                PullRequestReviewDecision::CHANGES_REQUESTED => "CHANGES_REQUESTED",
                PullRequestReviewDecision::REVIEW_REQUIRED => "REVIEW_REQUIRED",
                PullRequestReviewDecision::Other(ref s) => &s,
            })
        }
    }
    impl<'de> ::serde::Deserialize<'de> for PullRequestReviewDecision {
        fn deserialize<D: ::serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
            let s: String = ::serde::Deserialize::deserialize(deserializer)?;
            match s.as_str() {
                "APPROVED" => Ok(PullRequestReviewDecision::APPROVED),
                "CHANGES_REQUESTED" => Ok(PullRequestReviewDecision::CHANGES_REQUESTED),
                "REVIEW_REQUIRED" => Ok(PullRequestReviewDecision::REVIEW_REQUIRED),
                _ => Ok(PullRequestReviewDecision::Other(s)),
            }
        }
    }
    #[derive(Clone, Debug, TS)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub enum PullRequestState {
        CLOSED,
        MERGED,
        OPEN,
        Other(String),
    }
    impl ::serde::Serialize for PullRequestState {
        fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
            ser.serialize_str(match *self {
                PullRequestState::CLOSED => "CLOSED",
                PullRequestState::MERGED => "MERGED",
                PullRequestState::OPEN => "OPEN",
                PullRequestState::Other(ref s) => &s,
            })
        }
    }
    impl<'de> ::serde::Deserialize<'de> for PullRequestState {
        fn deserialize<D: ::serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
            let s: String = ::serde::Deserialize::deserialize(deserializer)?;
            match s.as_str() {
                "CLOSED" => Ok(PullRequestState::CLOSED),
                "MERGED" => Ok(PullRequestState::MERGED),
                "OPEN" => Ok(PullRequestState::OPEN),
                _ => Ok(PullRequestState::Other(s)),
            }
        }
    }
    #[derive(Clone, Debug, TS)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub enum StatusState {
        ERROR,
        EXPECTED,
        FAILURE,
        PENDING,
        SUCCESS,
        Other(String),
    }
    impl ::serde::Serialize for StatusState {
        fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
            ser.serialize_str(match *self {
                StatusState::ERROR => "ERROR",
                StatusState::EXPECTED => "EXPECTED",
                StatusState::FAILURE => "FAILURE",
                StatusState::PENDING => "PENDING",
                StatusState::SUCCESS => "SUCCESS",
                StatusState::Other(ref s) => &s,
            })
        }
    }
    impl<'de> ::serde::Deserialize<'de> for StatusState {
        fn deserialize<D: ::serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
            let s: String = ::serde::Deserialize::deserialize(deserializer)?;
            match s.as_str() {
                "ERROR" => Ok(StatusState::ERROR),
                "EXPECTED" => Ok(StatusState::EXPECTED),
                "FAILURE" => Ok(StatusState::FAILURE),
                "PENDING" => Ok(StatusState::PENDING),
                "SUCCESS" => Ok(StatusState::SUCCESS),
                _ => Ok(StatusState::Other(s)),
            }
        }
    }
    #[derive(Serialize)]
    pub struct Variables {
        pub count: Int,
        pub query: String,
    }
    impl Variables {}
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub struct PullRequest {
        pub id: ID,
        pub number: Int,
        pub title: String,
        pub url: URI,
        #[serde(rename = "isDraft")]
        pub is_draft: Boolean,
        #[serde(rename = "isInMergeQueue")]
        pub is_in_merge_queue: Boolean,
        pub mergeable: MergeableState,
        pub state: PullRequestState,
        #[serde(rename = "reviewDecision")]
        pub review_decision: Option<PullRequestReviewDecision>,
        #[serde(rename = "totalCommentsCount")]
        pub total_comments_count: Option<Int>,
        #[serde(rename = "statusCheckRollup")]
        pub status_check_rollup: Option<PullRequestStatusCheckRollup>,
        #[serde(rename = "autoMergeRequest")]
        pub auto_merge_request: Option<PullRequestAutoMergeRequest>,
        pub author: Option<PullRequestAuthor>,
        pub repository: PullRequestRepository,
        #[serde(rename = "baseRefName")]
        pub base_ref_name: String,
        #[serde(rename = "headRefName")]
        pub head_ref_name: String,
        #[serde(rename = "createdAt")]
        pub created_at: DateTime,
        #[serde(rename = "mergedAt")]
        pub merged_at: Option<DateTime>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub struct PullRequestStatusCheckRollup {
        pub state: StatusState,
        pub commit: Option<PullRequestStatusCheckRollupCommit>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub struct PullRequestStatusCheckRollupCommit {
        pub status: Option<PullRequestStatusCheckRollupCommitStatus>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub struct PullRequestStatusCheckRollupCommitStatus {
        pub state: StatusState,
        pub contexts: Vec<PullRequestStatusCheckRollupCommitStatusContexts>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub struct PullRequestStatusCheckRollupCommitStatusContexts {
        pub state: StatusState,
        pub context: String,
        pub description: Option<String>,
        #[serde(rename = "targetUrl")]
        pub target_url: Option<URI>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub struct PullRequestAutoMergeRequest {
        #[serde(rename = "enabledAt")]
        pub enabled_at: Option<DateTime>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub struct PullRequestAuthor {
        pub login: String,
        pub url: URI,
        #[serde(rename = "avatarUrl")]
        pub avatar_url: URI,
        #[serde(flatten)]
        pub on: PullRequestAuthorOn,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    #[serde(tag = "__typename")]
    pub enum PullRequestAuthorOn {
        Bot,
        EnterpriseUserAccount,
        Mannequin,
        Organization,
        User,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub struct PullRequestRepository {
        pub owner: PullRequestRepositoryOwner,
        pub name: String,
        pub url: URI,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub struct PullRequestRepositoryOwner {
        pub login: String,
        #[serde(flatten)]
        pub on: PullRequestRepositoryOwnerOn,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    #[serde(tag = "__typename")]
    pub enum PullRequestRepositoryOwnerOn {
        Organization,
        User,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub struct ResponseData {
        pub search: SearchPullRequestSearch,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    pub struct SearchPullRequestSearch {
        pub nodes: Option<Vec<Option<SearchPullRequestSearchNodes>>>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/search-pull-request.ts")]
    #[serde(tag = "__typename")]
    pub enum SearchPullRequestSearchNodes {
        App,
        Discussion,
        Issue,
        MarketplaceListing,
        Organization,
        PullRequest(SearchPullRequestSearchNodesOnPullRequest),
        Repository,
        User,
    }
    pub type SearchPullRequestSearchNodesOnPullRequest = PullRequest;
}
impl graphql_client::GraphQLQuery for SearchPullRequest {
    type Variables = search_pull_request::Variables;
    type ResponseData = search_pull_request::ResponseData;
    fn build_query(variables: Self::Variables) -> ::graphql_client::QueryBody<Self::Variables> {
        graphql_client::QueryBody {
            variables,
            query: search_pull_request::QUERY,
            operation_name: search_pull_request::OPERATION_NAME,
        }
    }
}
pub struct FindRepositories;
pub mod find_repositories {
    #![allow(dead_code)]
    use std::result::Result;
    pub const OPERATION_NAME: &str = "FindRepositories";
    pub const QUERY : & str = "fragment PullRequest on PullRequest {\n  id\n  number\n  title\n  url\n  isDraft\n  isInMergeQueue\n  mergeable\n  state\n  reviewDecision\n  totalCommentsCount\n  statusCheckRollup {\n    state\n    commit {\n      status {\n        state\n        contexts {\n          state\n          context\n          description\n          targetUrl\n        }\n      }\n    }\n  }\n  autoMergeRequest {\n    enabledAt\n  }\n  author {\n    __typename\n    login\n    url\n    avatarUrl\n  }\n  repository {\n    owner {\n      __typename\n      login\n    }\n    name\n    url\n  }\n  baseRefName\n  headRefName\n  createdAt\n  mergedAt\n}\n\n# fragment Issue on Issue {\n#   id\n#   url\n#   title\n#   number\n#   state\n#   comments {\n#     totalCount\n#   }\n#   author {\n#     __typename\n#     login\n#     url\n#     avatarUrl\n#   }\n#   repository {\n#     owner {\n#       __typename\n#       login\n#       avatarUrl\n#     }\n#     name\n#     url\n#   }\n#   createdAt\n#   updatedAt\n# }\n#\nfragment Repository on Repository {\n  id\n  name\n  url\n  isPrivate\n  isInOrganization\n  stargazerCount\n  pullRequests(states: OPEN) {\n    totalCount\n  }\n  hasIssuesEnabled\n  hasDiscussionsEnabled\n  hasProjectsEnabled\n  hasWikiEnabled\n  homepageUrl\n  issues(states: OPEN) {\n    totalCount\n  }\n  discussions(states: OPEN) {\n    totalCount\n  }\n  owner {\n    __typename\n    login\n    avatarUrl\n  }\n}\n\nfragment Organization on Organization {\n  login\n  name\n  avatarUrl\n  url\n}\n\nquery UserProfile {\n  viewer {\n    login\n    avatarUrl\n    email\n    url\n    organizations(first: 5) {\n      nodes {\n        __typename\n        ...Organization\n      }\n    }\n  }\n}\n\nquery Homepage($pullRequestCount: Int!, $topRepositoryCount: Int!) {\n  viewer {\n    pullRequests(\n      states: OPEN\n      first: $pullRequestCount\n      orderBy: { direction: DESC, field: CREATED_AT }\n    ) {\n      nodes {\n        __typename\n        ...PullRequest\n      }\n    }\n    topRepositories(\n      first: $topRepositoryCount\n      \n      orderBy: { field: STARGAZERS, direction: DESC }\n    ) {\n      nodes {\n        __typename\n        ...Repository\n      }\n    }\n  }\n}\n\nquery SearchPullRequest($count: Int!, $query: String!) {\n  search(first: $count, query: $query, type: ISSUE) {\n    nodes {\n      __typename\n      ...PullRequest\n    }\n  }\n}\n\nquery FindRepositories($count: Int!, $query: String!) {\n  search(first: $count, query: $query, type: REPOSITORY) {\n    nodes {\n      __typename\n      ...Repository\n    }\n  }\n}\n" ;
    use super::*;
    use serde::{Deserialize, Serialize};
    #[allow(dead_code)]
    type Boolean = bool;
    #[allow(dead_code)]
    type Float = f64;
    #[allow(dead_code)]
    type Int = i64;
    #[allow(dead_code)]
    type ID = String;
    type URI = crate::github::custom_scalars::URI;
    #[derive(Serialize)]
    pub struct Variables {
        pub count: Int,
        pub query: String,
    }
    impl Variables {}
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/find-repositories.ts")]
    pub struct Repository {
        pub id: ID,
        pub name: String,
        pub url: URI,
        #[serde(rename = "isPrivate")]
        pub is_private: Boolean,
        #[serde(rename = "isInOrganization")]
        pub is_in_organization: Boolean,
        #[serde(rename = "stargazerCount")]
        pub stargazer_count: Int,
        #[serde(rename = "pullRequests")]
        pub pull_requests: RepositoryPullRequests,
        #[serde(rename = "hasIssuesEnabled")]
        pub has_issues_enabled: Boolean,
        #[serde(rename = "hasDiscussionsEnabled")]
        pub has_discussions_enabled: Boolean,
        #[serde(rename = "hasProjectsEnabled")]
        pub has_projects_enabled: Boolean,
        #[serde(rename = "hasWikiEnabled")]
        pub has_wiki_enabled: Boolean,
        #[serde(rename = "homepageUrl")]
        pub homepage_url: Option<URI>,
        pub issues: RepositoryIssues,
        pub discussions: RepositoryDiscussions,
        pub owner: RepositoryOwner,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/find-repositories.ts")]
    pub struct RepositoryPullRequests {
        #[serde(rename = "totalCount")]
        pub total_count: Int,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/find-repositories.ts")]
    pub struct RepositoryIssues {
        #[serde(rename = "totalCount")]
        pub total_count: Int,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/find-repositories.ts")]
    pub struct RepositoryDiscussions {
        #[serde(rename = "totalCount")]
        pub total_count: Int,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/find-repositories.ts")]
    pub struct RepositoryOwner {
        pub login: String,
        #[serde(rename = "avatarUrl")]
        pub avatar_url: URI,
        #[serde(flatten)]
        pub on: RepositoryOwnerOn,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/find-repositories.ts")]
    #[serde(tag = "__typename")]
    pub enum RepositoryOwnerOn {
        Organization,
        User,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/find-repositories.ts")]
    pub struct ResponseData {
        pub search: FindRepositoriesSearch,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/find-repositories.ts")]
    pub struct FindRepositoriesSearch {
        pub nodes: Option<Vec<Option<FindRepositoriesSearchNodes>>>,
    }
    #[derive(Deserialize, TS, Debug, Clone, Serialize)]
    #[ts(export, export_to = "../../src/models/find-repositories.ts")]
    #[serde(tag = "__typename")]
    pub enum FindRepositoriesSearchNodes {
        App,
        Discussion,
        Issue,
        MarketplaceListing,
        Organization,
        PullRequest,
        Repository(FindRepositoriesSearchNodesOnRepository),
        User,
    }
    pub type FindRepositoriesSearchNodesOnRepository = Repository;
}
impl graphql_client::GraphQLQuery for FindRepositories {
    type Variables = find_repositories::Variables;
    type ResponseData = find_repositories::ResponseData;
    fn build_query(variables: Self::Variables) -> ::graphql_client::QueryBody<Self::Variables> {
        graphql_client::QueryBody {
            variables,
            query: find_repositories::QUERY,
            operation_name: find_repositories::OPERATION_NAME,
        }
    }
}
