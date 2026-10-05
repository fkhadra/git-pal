pub mod git;
pub mod models;
pub mod review;
pub mod templates;

use anyhow::Result;
use sqlx::{QueryBuilder, Row, Sqlite, SqlitePool};

use crate::models::{
    CodeReview, GetSavedReviewRequest, ReviewComment, ReviewListEntry, SetFileViewedRequest,
    ViewedFile,
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
        let pending_count = self.comments.iter().filter(|c| c.is_pending()).count();

        ReviewListEntry {
            id: self.id,
            owner: self.owner.clone(),
            repository: self.repository.clone(),
            pr_number: self.pr_number,
            pr_title: self.pr_title.clone(),
            branch: self.branch.clone(),
            head_sha: self.head_sha.clone(),
            submitted_head_sha: self.submitted_head_sha.clone(),
            reviewed_at: self.reviewed_at.clone(),
            reviewed: self.reviewed,
            comment_count,
            error_count,
            warning_count,
            pending_count,
            harness: self.harness,
            model: self.model.clone(),
        }
    }
}

/// `?, ?, …`, one bound placeholder per id
fn push_ids(query: &mut QueryBuilder<Sqlite>, ids: &[i64]) {
    let mut list = query.separated(", ");
    for id in ids {
        list.push_bind(*id);
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
            "SELECT id, owner, repository, pr_number, pr_title, branch, head_sha, submitted_head_sha, summary, comments, reviewed_at, template, harness, model, error, warning, cancelled, reviewed \
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
            "SELECT id, owner, repository, pr_number, pr_title, branch, head_sha, submitted_head_sha, summary, comments, reviewed_at, template, harness, model, error, warning, cancelled, reviewed \
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
            "INSERT INTO code_reviews (owner, repository, pr_number, pr_title, branch, head_sha, submitted_head_sha, summary, comments, reviewed_at, template, harness, model, error, warning, cancelled, reviewed) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) \
             ON CONFLICT(owner, repository, pr_number) DO UPDATE SET \
                pr_title = excluded.pr_title, \
                branch = excluded.branch, \
                head_sha = excluded.head_sha, \
                submitted_head_sha = excluded.submitted_head_sha, \
                summary = excluded.summary, \
                comments = excluded.comments, \
                reviewed_at = excluded.reviewed_at, \
                template = excluded.template, \
                harness = excluded.harness, \
                model = excluded.model, \
                error = excluded.error, \
                warning = excluded.warning, \
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
        .bind(&review.submitted_head_sha)
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
        .bind(review.harness.map(|h| serde_json::to_string(&h)).transpose()?)
        .bind(&review.model)
        .bind(&review.error)
        .bind(&review.warning)
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

    /// Marks the pending notes as posted and the review as submitted at `head_sha`.
    pub async fn mark_submitted(
        &self,
        owner: &str,
        repository: &str,
        pr_number: i64,
        head_sha: &str,
    ) -> Result<()> {
        let Some(review) = self.get_review(owner, repository, pr_number).await? else {
            return Ok(());
        };

        let comments: Vec<ReviewComment> = review
            .comments
            .into_iter()
            .map(|comment| ReviewComment {
                posted: comment.posted || comment.is_pending(),
                ..comment
            })
            .collect();

        sqlx::query(
            "UPDATE code_reviews SET comments = ?, submitted_head_sha = ? WHERE owner = ? AND repository = ? AND pr_number = ?",
        )
        .bind(serde_json::to_string(&comments)?)
        .bind(head_sha)
        .bind(owner)
        .bind(repository)
        .bind(pr_number)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Deletes the reviews and their viewed files, returns the pull requests of those that existed.
    pub async fn delete_reviews(&self, ids: &[i64]) -> Result<Vec<GetSavedReviewRequest>> {
        if ids.is_empty() {
            return Ok(vec![]);
        }

        let mut tx = self.pool.begin().await?;

        let mut viewed_files = QueryBuilder::<Sqlite>::new(
            "DELETE FROM review_viewed_files WHERE (owner, repository, pr_number) IN \
             (SELECT owner, repository, pr_number FROM code_reviews WHERE id IN (",
        );
        push_ids(&mut viewed_files, ids);
        viewed_files.push("))");
        viewed_files.build().execute(&mut *tx).await?;

        let mut reviews = QueryBuilder::<Sqlite>::new("DELETE FROM code_reviews WHERE id IN (");
        push_ids(&mut reviews, ids);
        reviews.push(") RETURNING owner, repository, pr_number");
        let rows = reviews.build().fetch_all(&mut *tx).await?;

        tx.commit().await?;

        let prs = rows
            .iter()
            .map(|row| GetSavedReviewRequest {
                owner: row.get("owner"),
                repository: row.get("repository"),
                pr_number: row.get("pr_number"),
            })
            .collect();

        Ok(prs)
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
