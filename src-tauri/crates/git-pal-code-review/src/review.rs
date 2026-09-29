use std::{collections::HashMap, path::Path};

use anyhow::Result;
use git_pal_harness::Harness;

use crate::models::PullRequestReview;

/// Used when no template applies.
pub const BUILT_IN_INSTRUCTIONS: &str = r#"Review the code changes on the current branch compared to its base branch. Focus on:
1. Potential bugs or issues
2. Security concerns
3. Performance issues
4. Code quality and maintainability"#;

const DISCUSSION_INSTRUCTIONS: &str = "The pull request already has the discussion below. \
Don't repeat points already raised. If a raised concern is still not addressed by the code, you may flag it again.";

const REVIEW_JSON_FORMAT: &str = r#"Output your review as a JSON object with this exact structure:
{
  "summary": "Brief overall summary of the changes and your assessment",
  "comments": [
    {
      "file": "path/to/file.rs",
      "line": 42,
      "severity": "warning",
      "comment": "Your review comment here"
    }
  ]
}

Rules for the JSON output:
- severity must be one of: "error", "warning", "info"
- line should be the line number in the new version of the file, or null if the comment is about the file in general
- file should be the relative path from the repository root
- Keep comments concise and actionable
- Output ONLY the JSON object, no other text"#;

/// Narrows an incremental review to the commits pushed since `since`, overriding the instructions' scope.
fn incremental_scope(since: &str) -> String {
    format!(
        "## Scope\nThis pull request was already reviewed up to commit {since}. \
Only review the changes made since then (`git diff {since}..HEAD`), use the rest of the branch as context only."
    )
}

/// The output format is always appended so the review can be parsed whatever the instructions.
fn review_prompt(
    instructions: &str,
    description: &str,
    discussion: &str,
    since: Option<&str>,
) -> String {
    let mut prompt = instructions.to_string();

    if let Some(since) = since {
        prompt.push_str(&format!("\n\n{}", incremental_scope(since)));
    }

    if !description.is_empty() {
        prompt.push_str(&format!("\n\n## Pull request description\n{description}"));
    }

    if !discussion.is_empty() {
        // maybe I should let the user decide if he/she wants to include the discussions
        prompt.push_str(&format!(
            "\n\n## Existing discussion\n{DISCUSSION_INSTRUCTIONS}\n\n{discussion}"
        ));
    }

    format!("{prompt}\n\n{REVIEW_JSON_FORMAT}")
}

pub fn review(
    harness: Harness,
    worktree_dir: &Path,
    env_vars: &HashMap<String, String>,
    instructions: &str,
    description: &str,
    discussion: &str,
    since: Option<&str>,
) -> Result<PullRequestReview> {
    let text = git_pal_harness::run_once(
        harness,
        worktree_dir,
        env_vars,
        &review_prompt(instructions, description, discussion, since),
    )?;

    let review = match serde_json::from_str::<PullRequestReview>(extract_json(&text)) {
        Ok(review) => review,
        Err(_) => PullRequestReview {
            summary: text.clone(),
            comments: vec![],
        },
    };

    Ok(review)
}

/// Extract JSON from text that may be wrapped in markdown code blocks.
fn extract_json(text: &str) -> &str {
    let trimmed = text.trim();

    // Try to find JSON within ```json ... ``` blocks
    if let Some(start) = trimmed.find("```json") {
        let json_start = start + 7;
        if let Some(end) = trimmed[json_start..].find("```") {
            return trimmed[json_start..json_start + end].trim();
        }
    }

    // Try to find JSON within ``` ... ``` blocks
    if let Some(start) = trimmed.find("```") {
        let json_start = start + 3;
        let json_start = trimmed[json_start..]
            .find('\n')
            .map(|n| json_start + n + 1)
            .unwrap_or(json_start);
        if let Some(end) = trimmed[json_start..].find("```") {
            return trimmed[json_start..json_start + end].trim();
        }
    }

    // Try to find a JSON object directly
    if let Some(start) = trimmed.find('{')
        && let Some(end) = trimmed.rfind('}')
    {
        return &trimmed[start..=end];
    }

    trimmed
}
