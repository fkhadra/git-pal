use tauri::State;

use crate::core::AppState;

use git_pal_code_review::{
    models::{ReviewTemplate, ReviewTemplateInput, TemplateChoice},
    review,
};
use git_pal_harness::Skill;

use super::Result;

#[tauri::command]
pub async fn list_review_templates(state: State<'_, AppState>) -> Result<Vec<ReviewTemplate>> {
    Ok(state.code_review_store.list_templates().await?)
}

#[tauri::command]
pub async fn create_review_template(
    state: State<'_, AppState>,
    input: ReviewTemplateInput,
) -> Result<ReviewTemplate> {
    Ok(state.code_review_store.create_template(&input).await?)
}

#[tauri::command]
pub async fn update_review_template(
    state: State<'_, AppState>,
    id: i64,
    input: ReviewTemplateInput,
) -> Result<ReviewTemplate> {
    Ok(state.code_review_store.update_template(id, &input).await?)
}

#[tauri::command]
pub async fn delete_review_template(state: State<'_, AppState>, id: i64) -> Result<()> {
    Ok(state.code_review_store.delete_template(id).await?)
}

#[tauri::command]
pub async fn reorder_review_templates(state: State<'_, AppState>, ids: Vec<i64>) -> Result<()> {
    Ok(state.code_review_store.reorder_templates(&ids).await?)
}

#[tauri::command]
pub fn built_in_review_instructions() -> &'static str {
    review::BUILT_IN_INSTRUCTIONS
}

/// Template an automatic review would use, `None` for the built-in instructions.
/// A pull request reviewed before reuses its previous template.
#[tauri::command]
pub async fn resolve_review_template(
    state: State<'_, AppState>,
    owner: String,
    repository: String,
    pr_number: Option<i64>,
) -> Result<Option<ReviewTemplate>> {
    let store = &state.code_review_store;
    let existing = match pr_number {
        Some(number) => store.get_review(&owner, &repository, number).await?,
        None => None,
    };

    Ok(store
        .resolve_template(
            &TemplateChoice::Auto,
            existing.as_ref().and_then(|r| r.template.as_ref()),
            &format!("{owner}/{repository}"),
        )
        .await?)
}

#[tauri::command]
pub fn list_skills(state: State<'_, AppState>) -> Vec<Skill> {
    state.get_settings().harness.adapter().skills()
}
