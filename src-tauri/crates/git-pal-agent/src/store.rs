use anyhow::Result;
use sqlx::{Row, SqlitePool};

use git_pal_harness::Harness;

use crate::models::{AgentMessage, Block, Conversation, PullRequestKey, Role};

#[derive(Clone)]
pub struct AgentStore {
    pool: SqlitePool,
}

fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

impl AgentStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list_conversations(&self, pr: &PullRequestKey) -> Result<Vec<Conversation>> {
        let rows = sqlx::query_as::<_, Conversation>(
            "SELECT id, owner, repository, pr_number, title, harness, session_id, created_at, updated_at \
             FROM agent_conversations WHERE owner = ? AND repository = ? AND pr_number = ? \
             ORDER BY updated_at DESC",
        )
        .bind(&pr.owner)
        .bind(&pr.repository)
        .bind(pr.pr_number)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    pub async fn get_conversation(&self, id: i64) -> Result<Option<Conversation>> {
        let row = sqlx::query_as::<_, Conversation>(
            "SELECT id, owner, repository, pr_number, title, harness, session_id, created_at, updated_at \
             FROM agent_conversations WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row)
    }

    pub async fn create_conversation(
        &self,
        pr: &PullRequestKey,
        title: &str,
        harness: Harness,
    ) -> Result<i64> {
        let now = now();
        let row = sqlx::query(
            "INSERT INTO agent_conversations (owner, repository, pr_number, title, harness, created_at, updated_at) \
             VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
        )
        .bind(&pr.owner)
        .bind(&pr.repository)
        .bind(pr.pr_number)
        .bind(title)
        .bind(harness.as_str())
        .bind(&now)
        .bind(&now)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.get::<i64, _>("id"))
    }

    pub async fn set_session_id(&self, id: i64, session_id: &str) -> Result<()> {
        sqlx::query("UPDATE agent_conversations SET session_id = ? WHERE id = ?")
            .bind(session_id)
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn add_message(
        &self,
        conversation_id: i64,
        role: Role,
        blocks: &[Block],
    ) -> Result<AgentMessage> {
        let now = now();
        let blocks_json = serde_json::to_string(blocks)?;

        let row = sqlx::query(
            "INSERT INTO agent_messages (conversation_id, role, blocks, created_at) \
             VALUES (?, ?, ?, ?) RETURNING id",
        )
        .bind(conversation_id)
        .bind(role.as_str())
        .bind(&blocks_json)
        .bind(&now)
        .fetch_one(&self.pool)
        .await?;

        sqlx::query("UPDATE agent_conversations SET updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(conversation_id)
            .execute(&self.pool)
            .await?;

        Ok(AgentMessage {
            id: row.get::<i64, _>("id"),
            conversation_id,
            role,
            blocks: blocks.to_vec(),
            created_at: now,
        })
    }

    pub async fn messages(&self, conversation_id: i64) -> Result<Vec<AgentMessage>> {
        let rows = sqlx::query_as::<_, AgentMessage>(
            "SELECT id, conversation_id, role, blocks, created_at \
             FROM agent_messages WHERE conversation_id = ? ORDER BY id",
        )
        .bind(conversation_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    pub async fn delete_conversation(&self, id: i64) -> Result<()> {
        sqlx::query("DELETE FROM agent_conversations WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn delete_for_pr(&self, pr: &PullRequestKey) -> Result<()> {
        sqlx::query(
            "DELETE FROM agent_conversations WHERE owner = ? AND repository = ? AND pr_number = ?",
        )
        .bind(&pr.owner)
        .bind(&pr.repository)
        .bind(pr.pr_number)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
