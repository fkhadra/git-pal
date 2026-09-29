pub mod git;
pub mod models;
pub mod review;
pub mod templates;

use anyhow::Result;
use sqlx::{Row, SqlitePool};

use crate::models::{
    CodeReview, ReviewComment, ReviewListEntry, ReviewStatus, SetFileViewedRequest, ViewedFile,
};

impl CodeReview {
    pub fn to_list_entry(&self) -> ReviewListEntry {
        let comment_count = self.comments.len();
        let error_count = self
            .comments
            .iter()
            .filter(|c| c.severity == "error")
            .count();
        let warning_count = self
            .comments
            .iter()
            .filter(|c| c.severity == "warning")
            .count();

        ReviewListEntry {
            id: self.id,
            owner: self.owner.clone(),
            repository: self.repository.clone(),
            pr_number: self.pr_number,
            pr_title: self.pr_title.clone(),
            branch: self.branch.clone(),
            head_sha: self.head_sha.clone(),
            status: self.status.clone(),
            reviewed_at: self.reviewed_at.clone(),
            reviewed: self.reviewed,
            comment_count,
            error_count,
            warning_count,
        }
    }
}

fn status_to_str(s: &ReviewStatus) -> &'static str {
    match s {
        ReviewStatus::Todo => "Todo",
        ReviewStatus::Done => "Done",
        ReviewStatus::Submitted => "Submitted",
    }
}

#[derive(Clone)]
pub struct CodeReviewStore {
    pool: SqlitePool,
}

impl CodeReviewStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn list_reviews(&self) -> Result<Vec<ReviewListEntry>> {
        let rows = sqlx::query_as::<_, CodeReview>(
            "SELECT id, owner, repository, pr_number, pr_title, branch, head_sha, status, summary, comments, reviewed_at, template, error, cancelled, reviewed \
             FROM code_reviews ORDER BY reviewed_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(|r| r.to_list_entry()).collect())
    }

    pub async fn get_review(
        &self,
        owner: &str,
        repository: &str,
        pr_number: i64,
    ) -> Result<Option<CodeReview>> {
        let row = sqlx::query_as::<_, CodeReview>(
            "SELECT id, owner, repository, pr_number, pr_title, branch, head_sha, status, summary, comments, reviewed_at, template, error, cancelled, reviewed \
             FROM code_reviews WHERE owner = ? AND repository = ? AND pr_number = ?",
        )
        .bind(owner)
        .bind(repository)
        .bind(pr_number)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row)
    }

    pub async fn upsert_review(&self, review: &CodeReview) -> Result<i64> {
        let comments_json = serde_json::to_string(&review.comments)?;

        let row = sqlx::query(
            "INSERT INTO code_reviews (owner, repository, pr_number, pr_title, branch, head_sha, status, summary, comments, reviewed_at, template, error, cancelled, reviewed) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) \
             ON CONFLICT(owner, repository, pr_number) DO UPDATE SET \
                pr_title = excluded.pr_title, \
                branch = excluded.branch, \
                head_sha = excluded.head_sha, \
                status = excluded.status, \
                summary = excluded.summary, \
                comments = excluded.comments, \
                reviewed_at = excluded.reviewed_at, \
                template = excluded.template, \
                error = excluded.error, \
                cancelled = excluded.cancelled, \
                reviewed = excluded.reviewed \
             RETURNING id",
        )
        .bind(&review.owner)
        .bind(&review.repository)
        .bind(review.pr_number)
        .bind(&review.pr_title)
        .bind(&review.branch)
        .bind(&review.head_sha)
        .bind(status_to_str(&review.status))
        .bind(&review.summary)
        .bind(&comments_json)
        .bind(&review.reviewed_at)
        .bind(
            review
                .template
                .as_ref()
                .map(serde_json::to_string)
                .transpose()?,
        )
        .bind(&review.error)
        .bind(review.cancelled)
        .bind(review.reviewed)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.get::<i64, _>("id"))
    }

    pub async fn update_comments(
        &self,
        owner: &str,
        repository: &str,
        pr_number: i64,
        comments: &[ReviewComment],
    ) -> Result<()> {
        let comments_json = serde_json::to_string(comments)?;

        sqlx::query(
            "UPDATE code_reviews SET comments = ? WHERE owner = ? AND repository = ? AND pr_number = ?",
        )
        .bind(&comments_json)
        .bind(owner)
        .bind(repository)
        .bind(pr_number)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn set_error(
        &self,
        owner: &str,
        repository: &str,
        pr_number: i64,
        error: &str,
    ) -> Result<()> {
        sqlx::query(
            "UPDATE code_reviews SET error = ? WHERE owner = ? AND repository = ? AND pr_number = ?",
        )
        .bind(error)
        .bind(owner)
        .bind(repository)
        .bind(pr_number)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn set_cancelled(&self, owner: &str, repository: &str, pr_number: i64) -> Result<()> {
        sqlx::query(
            "UPDATE code_reviews SET cancelled = 1 WHERE owner = ? AND repository = ? AND pr_number = ?",
        )
        .bind(owner)
        .bind(repository)
        .bind(pr_number)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_status(
        &self,
        owner: &str,
        repository: &str,
        pr_number: i64,
        status: &ReviewStatus,
    ) -> Result<()> {
        sqlx::query(
            "UPDATE code_reviews SET status = ? WHERE owner = ? AND repository = ? AND pr_number = ?",
        )
        .bind(status_to_str(status))
        .bind(owner)
        .bind(repository)
        .bind(pr_number)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn delete_review(&self, owner: &str, repository: &str, pr_number: i64) -> Result<()> {
        let mut tx = self.pool.begin().await?;

        let queries = [
            "DELETE FROM code_reviews WHERE owner = ? AND repository = ? AND pr_number = ?",
            "DELETE FROM review_viewed_files WHERE owner = ? AND repository = ? AND pr_number = ?",
        ];

        for query in queries {
            sqlx::query(query)
                .bind(owner)
                .bind(repository)
                .bind(pr_number)
                .execute(&mut *tx)
                .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    pub async fn viewed_files(
        &self,
        owner: &str,
        repository: &str,
        pr_number: i64,
    ) -> Result<Vec<ViewedFile>> {
        let rows = sqlx::query_as::<_, ViewedFile>(
            "SELECT filename, sha FROM review_viewed_files \
             WHERE owner = ? AND repository = ? AND pr_number = ?",
        )
        .bind(owner)
        .bind(repository)
        .bind(pr_number)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    pub async fn set_file_viewed(&self, request: &SetFileViewedRequest) -> Result<()> {
        if !request.viewed {
            sqlx::query(
                "DELETE FROM review_viewed_files \
                 WHERE owner = ? AND repository = ? AND pr_number = ? AND filename = ?",
            )
            .bind(&request.owner)
            .bind(&request.repository)
            .bind(request.pr_number)
            .bind(&request.filename)
            .execute(&self.pool)
            .await?;

            return Ok(());
        }

        sqlx::query(
            "INSERT INTO review_viewed_files (owner, repository, pr_number, filename, sha) \
             VALUES (?, ?, ?, ?, ?) \
             ON CONFLICT(owner, repository, pr_number, filename) DO UPDATE SET sha = excluded.sha",
        )
        .bind(&request.owner)
        .bind(&request.repository)
        .bind(request.pr_number)
        .bind(&request.filename)
        .bind(&request.sha)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
