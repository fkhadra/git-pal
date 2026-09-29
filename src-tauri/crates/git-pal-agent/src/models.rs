pub use git_pal_harness::Block;
use git_pal_harness::Harness;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "agent.ts")]
pub enum Role {
    User,
    Assistant,
}

impl Role {
    pub fn as_str(&self) -> &'static str {
        match self {
            Role::User => "user",
            Role::Assistant => "assistant",
        }
    }
}

impl TryFrom<String> for Role {
    type Error = String;

    fn try_from(s: String) -> Result<Self, Self::Error> {
        match s.as_str() {
            "user" => Ok(Role::User),
            "assistant" => Ok(Role::Assistant),
            other => Err(format!("unknown Role: {other}")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "agent.ts")]
pub struct Conversation {
    pub id: i64,
    pub owner: String,
    pub repository: String,
    pub pr_number: i64,
    pub title: String,
    /// Sessions only resume with the harness that created them
    #[sqlx(try_from = "String")]
    pub harness: Harness,
    pub session_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "agent.ts")]
pub struct AgentMessage {
    pub id: i64,
    pub conversation_id: i64,
    #[sqlx(try_from = "String")]
    pub role: Role,
    #[sqlx(json)]
    pub blocks: Vec<Block>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export, export_to = "agent.ts")]
pub enum ContextItem {
    PullRequest,
    File {
        path: String,
    },
    /// Review comment or GitHub thread, replies included in `body`
    Comment {
        path: String,
        /// `None` for file comments
        line: Option<i64>,
        author: String,
        body: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "agent.ts")]
pub struct PullRequestKey {
    pub owner: String,
    pub repository: String,
    pub pr_number: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "agent.ts")]
pub struct SendMessageRequest {
    pub owner: String,
    pub repository: String,
    pub pr_number: i64,
    pub conversation_id: Option<i64>,
    pub prompt: String,
    pub context: Vec<ContextItem>,
    pub model: Option<String>,
}

/// Streamed to the UI while the agent runs.
#[derive(Debug, Clone, Serialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export, export_to = "agent.ts")]
pub enum AgentEvent {
    Started {
        #[serde(rename = "conversationId")]
        conversation_id: i64,
    },
    TextDelta {
        text: String,
    },
    Block {
        block: Block,
    },
    Done {
        message: AgentMessage,
    },
    Error {
        message: String,
    },
}
