use anyhow::{Result, anyhow, bail};
use regex::Regex;
use sqlx::{Row, Sqlite, Transaction};

use crate::{
    CodeReviewStore,
    models::{ReviewTemplate, ReviewTemplateInput, TemplateChoice},
};

fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn validate(input: &ReviewTemplateInput) -> Result<ReviewTemplateInput> {
    let name = input.name.trim();
    if name.is_empty() {
        bail!("Name is required");
    }

    if input.content.trim().is_empty() {
        bail!("Content is required");
    }

    let matcher = input
        .matcher
        .as_deref()
        .map(str::trim)
        .filter(|m| !m.is_empty());

    if let Some(matcher) = matcher {
        Regex::new(matcher).map_err(|e| anyhow!("Invalid matcher: {e}"))?;
    }

    Ok(ReviewTemplateInput {
        name: name.to_string(),
        content: input.content.clone(),
        matcher: matcher.map(str::to_string),
        is_default: input.is_default,
    })
}

/// First template whose matcher accepts `full_name` ("owner/repo"), else the default one.
pub fn resolve<'a>(templates: &'a [ReviewTemplate], full_name: &str) -> Option<&'a ReviewTemplate> {
    let matching = templates.iter().find(|t| {
        t.matcher
            .as_deref()
            .and_then(|m| Regex::new(m).ok())
            .is_some_and(|re| re.is_match(full_name))
    });

    matching.or_else(|| templates.iter().find(|t| t.is_default))
}

async fn clear_default(tx: &mut Transaction<'_, Sqlite>) -> Result<()> {
    sqlx::query("UPDATE review_templates SET is_default = 0")
        .execute(&mut **tx)
        .await?;

    Ok(())
}

impl CodeReviewStore {
    pub async fn list_templates(&self) -> Result<Vec<ReviewTemplate>> {
        let rows = sqlx::query_as::<_, ReviewTemplate>(
            "SELECT id, name, content, matcher, is_default, position, created_at, updated_at \
             FROM review_templates ORDER BY position, id",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows)
    }

    pub async fn get_template(&self, id: i64) -> Result<Option<ReviewTemplate>> {
        let row = sqlx::query_as::<_, ReviewTemplate>(
            "SELECT id, name, content, matcher, is_default, position, created_at, updated_at \
             FROM review_templates WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row)
    }

    pub async fn create_template(&self, input: &ReviewTemplateInput) -> Result<ReviewTemplate> {
        let input = validate(input)?;
        let now = now();
        let mut tx = self.pool.begin().await?;

        if input.is_default {
            clear_default(&mut tx).await?;
        }

        let row = sqlx::query(
            "INSERT INTO review_templates (name, content, matcher, is_default, position, created_at, updated_at) \
             VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM review_templates), ?, ?) \
             RETURNING id",
        )
        .bind(&input.name)
        .bind(&input.content)
        .bind(&input.matcher)
        .bind(input.is_default)
        .bind(&now)
        .bind(&now)
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;

        self.get_template(row.get::<i64, _>("id"))
            .await?
            .ok_or_else(|| anyhow!("Template not found"))
    }

    pub async fn update_template(
        &self,
        id: i64,
        input: &ReviewTemplateInput,
    ) -> Result<ReviewTemplate> {
        let input = validate(input)?;
        let mut tx = self.pool.begin().await?;

        if input.is_default {
            clear_default(&mut tx).await?;
        }

        sqlx::query(
            "UPDATE review_templates \
             SET name = ?, content = ?, matcher = ?, is_default = ?, updated_at = ? WHERE id = ?",
        )
        .bind(&input.name)
        .bind(&input.content)
        .bind(&input.matcher)
        .bind(input.is_default)
        .bind(now())
        .bind(id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        self.get_template(id)
            .await?
            .ok_or_else(|| anyhow!("Template not found"))
    }

    pub async fn delete_template(&self, id: i64) -> Result<()> {
        sqlx::query("DELETE FROM review_templates WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Saves the order of `ids`, the first one takes precedence when several match.
    pub async fn reorder_templates(&self, ids: &[i64]) -> Result<()> {
        let mut tx = self.pool.begin().await?;

        for (position, id) in ids.iter().enumerate() {
            sqlx::query("UPDATE review_templates SET position = ? WHERE id = ?")
                .bind(position as i64)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    /// `None` means the built-in instructions apply.
    /// `Auto` reuses `remembered` (the previous review's template) while it still exists.
    pub async fn resolve_template(
        &self,
        choice: &TemplateChoice,
        remembered: Option<&TemplateChoice>,
        full_name: &str,
    ) -> Result<Option<ReviewTemplate>> {
        match (choice, remembered) {
            (TemplateChoice::BuiltIn, _)
            | (TemplateChoice::Auto, Some(TemplateChoice::BuiltIn)) => Ok(None),
            (TemplateChoice::Template { id }, _) => self
                .get_template(*id)
                .await?
                .map(Some)
                .ok_or_else(|| anyhow!("Template not found")),
            (TemplateChoice::Auto, Some(TemplateChoice::Template { id })) => {
                match self.get_template(*id).await? {
                    Some(template) => Ok(Some(template)),
                    None => self.match_template(full_name).await,
                }
            }
            (TemplateChoice::Auto, _) => self.match_template(full_name).await,
        }
    }

    async fn match_template(&self, full_name: &str) -> Result<Option<ReviewTemplate>> {
        let templates = self.list_templates().await?;
        Ok(resolve(&templates, full_name).cloned())
    }
}

/// Choice to remember once `template` was resolved.
pub fn used_choice(template: Option<&ReviewTemplate>) -> TemplateChoice {
    match template {
        Some(t) => TemplateChoice::Template { id: t.id },
        None => TemplateChoice::BuiltIn,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn template(id: i64, matcher: Option<&str>, is_default: bool) -> ReviewTemplate {
        ReviewTemplate {
            id,
            name: format!("t{id}"),
            content: String::new(),
            matcher: matcher.map(str::to_string),
            is_default,
            position: id,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    #[test]
    fn first_match_wins_over_default() {
        let templates = vec![
            template(1, None, true),
            template(2, Some("^acme/"), false),
            template(3, Some("frontend$"), false),
        ];

        assert_eq!(resolve(&templates, "acme/frontend").map(|t| t.id), Some(2));
        assert_eq!(resolve(&templates, "other/frontend").map(|t| t.id), Some(3));
        assert_eq!(resolve(&templates, "other/api").map(|t| t.id), Some(1));
    }

    #[test]
    fn nothing_when_no_match_and_no_default() {
        let templates = vec![template(1, Some("^acme/"), false)];
        assert!(resolve(&templates, "other/api").is_none());
    }

    #[test]
    fn validate_normalizes_and_rejects_bad_input() {
        let input = |name: &str, matcher: Option<&str>| ReviewTemplateInput {
            name: name.into(),
            content: "Focus on tests".into(),
            matcher: matcher.map(str::to_string),
            is_default: false,
        };

        assert_eq!(validate(&input(" A ", Some("  "))).unwrap().matcher, None);
        assert_eq!(validate(&input(" A ", None)).unwrap().name, "A");
        assert!(validate(&input("", None)).is_err());
        assert!(validate(&input("A", Some("("))).is_err());
    }
}
