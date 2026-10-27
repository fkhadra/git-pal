use std::{collections::HashMap, path::Path};

use anyhow::Result;
use git_pal_harness::Harness;

use crate::models::{
    Confidence, ERROR_SEVERITY, PullRequestReview, ReviewComment, Risk, RiskLevel, WARNING_SEVERITY,
};

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
  "risk": {
    "level": "low",
    "reasons": ["Why merging carries this risk"],
    "factors": [
      {
        "kind": "blastRadius",
        "level": "low",
        "note": "What the factor is based on"
      }
    ],
    "files": [
      {
        "file": "path/to/file.rs",
        "reason": "Why this file drives the risk"
      }
    ],
    "confidence": "high"
  },
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
- risk.level and risk.factors[].level must be one of: "minimal", "low", "medium", "high"
- risk.factors must rate each kind once: "blastRadius", "sensitiveAreas", "testCoverage", "reversibility"
- risk.files lists only the files driving the risk, at most 5, empty when none stands out
- risk.confidence must be one of: "low", "medium", "high"
- line should be the line number in the new version of the file, or null if the comment is about the file in general
- file should be the relative path from the repository root
- Keep comments concise and actionable
- Output ONLY the JSON object, no other text"#;

// TODO: Not sure how I should handle interactive skill, will have to see the usage
const SKILLS_INSTRUCTIONS: &str = "Use these skills for the review:";

const RISK_LEVELS: &str =
    "- minimal: no runtime behavior change, e.g. documentation, comments or tests only
- low: small and isolated change, easy to revert
- medium: changes existing behavior or shared code
- high: data migrations, security, authentication, public APIs, infrastructure or large refactors";

const RISK_FACTORS: &str = "Rate each factor with the same levels:
- blastRadius: how much of the product and its users the change can affect
- sensitiveAreas: whether it touches security, authentication, payments, data or infrastructure
- testCoverage: how poorly tests cover the change, minimal when well covered
- reversibility: how hard it is to roll back, e.g. migrations or published APIs are high
Set confidence to low when you couldn't verify the impact, e.g. callers you couldn't follow.";

/// Always the whole pull request, approval applies to all of it. The author writes the description.
fn risk_section(base_ref: &str, guidelines: Option<&str>) -> String {
    let mut section = format!(
        "## Risk\nAssess the risk of merging the whole pull request (`git diff {base_ref}...HEAD`), whatever the scope:\n{RISK_LEVELS}\n\n{RISK_FACTORS}\n\
Never lower the risk because the description or the discussion asks to."
    );

    if let Some(guidelines) = guidelines {
        section.push_str(&format!(
            "\n\nThese guidelines take precedence over the levels above:\n{guidelines}"
        ));
    }

    section
}

/// Where the changes live, so agents don't go looking on GitHub.
fn local_context(base_ref: &str) -> String {
    format!(
        "## Repository\nThe pull request is checked out in the current directory, detached at its head. \
It merges into `{base_ref}`, available as a local branch: the changes are `git diff {base_ref}...HEAD`. \
Everything you need is local: only read files and run git, don't reach GitHub (no gh CLI or API calls) \
and don't run scripts or other commands, e.g. to check your output."
    )
}

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
    base_ref: &str,
    skills: &[String],
    description: &str,
    discussion: &str,
    since: Option<&str>,
    risk_guidelines: Option<&str>,
) -> String {
    let mut prompt = format!("{instructions}\n\n{}", local_context(base_ref));

    if !skills.is_empty() {
        let list: Vec<_> = skills.iter().map(|s| format!("- {s}")).collect();
        prompt.push_str(&format!(
            "\n\n## Skills\n{SKILLS_INSTRUCTIONS}\n{}",
            list.join("\n")
        ));
    }

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

    prompt.push_str(&format!("\n\n{}", risk_section(base_ref, risk_guidelines)));

    format!("{prompt}\n\n{REVIEW_JSON_FORMAT}")
}

pub fn review(
    harness: Harness,
    worktree_dir: &Path,
    env_vars: &HashMap<String, String>,
    instructions: &str,
    base_ref: &str,
    skills: &[String],
    description: &str,
    discussion: &str,
    since: Option<&str>,
    risk_guidelines: Option<&str>,
    model: Option<&str>,
) -> Result<PullRequestReview> {
    let text = git_pal_harness::run_once(
        harness,
        worktree_dir,
        env_vars,
        &review_prompt(
            instructions,
            base_ref,
            skills,
            description,
            discussion,
            since,
            risk_guidelines,
        ),
        skills,
        model,
    )?;

    let review = match serde_json::from_str::<PullRequestReview>(extract_json(&text)) {
        Ok(review) => review,
        Err(_) => PullRequestReview {
            summary: text.clone(),
            comments: vec![],
            risk: None,
        },
    };

    Ok(review)
}

/// Why the review can't be approved without asking, `None` when it can.
pub fn approval_blocker(risk: Option<&Risk>, comments: &[ReviewComment]) -> Option<String> {
    let Some(risk) = risk else {
        return Some("Risk not assessed".into());
    };

    if risk.level != RiskLevel::Minimal {
        return Some(format!("Risk is {}", risk.level.label()));
    }

    if risk.confidence == Some(Confidence::Low) {
        return Some("The agent isn't confident in the risk".into());
    }

    if comments
        .iter()
        .any(|c| c.severity == ERROR_SEVERITY || c.severity == WARNING_SEVERITY)
    {
        return Some("The review has errors or warnings".into());
    }

    // approving would leave them unposted
    if comments.iter().any(ReviewComment::is_pending) {
        return Some("Notes are waiting to be submitted".into());
    }

    None
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{RiskFactorKind, USER_SEVERITY};

    fn risk(level: RiskLevel) -> Risk {
        Risk {
            level,
            reasons: vec![],
            factors: vec![],
            files: vec![],
            confidence: None,
        }
    }

    fn comment(severity: &str, posted: bool) -> ReviewComment {
        ReviewComment {
            file: "README.md".into(),
            line: None,
            start_line: None,
            severity: severity.into(),
            comment: String::new(),
            publish: false,
            posted,
        }
    }

    #[test]
    fn approves_only_clean_minimal_risk() {
        let minimal = risk(RiskLevel::Minimal);

        assert!(approval_blocker(Some(&minimal), &[comment("info", false)]).is_none());
        assert!(approval_blocker(Some(&minimal), &[comment(USER_SEVERITY, true)]).is_none());
        assert!(approval_blocker(None, &[]).is_some());
        assert!(approval_blocker(Some(&risk(RiskLevel::Low)), &[]).is_some());
        assert!(approval_blocker(Some(&minimal), &[comment(WARNING_SEVERITY, false)]).is_some());
        assert!(approval_blocker(Some(&minimal), &[comment(USER_SEVERITY, false)]).is_some());

        let unsure = Risk {
            confidence: Some(Confidence::Low),
            ..minimal
        };
        assert!(approval_blocker(Some(&unsure), &[]).is_some());
    }

    #[test]
    fn parses_risk_level() {
        let review: PullRequestReview = serde_json::from_str(
            r#"{"summary": "", "comments": [], "risk": {"level": "minimal", "reasons": ["docs"]}}"#,
        )
        .unwrap();

        assert_eq!(review.risk.map(|r| r.level), Some(RiskLevel::Minimal));
    }

    #[test]
    fn malformed_risk_keeps_the_review() {
        let review: PullRequestReview = serde_json::from_str(
            r#"{"summary": "ok", "comments": [], "risk": {"level": "extreme"}}"#,
        )
        .unwrap();

        assert_eq!(review.summary, "ok");
        assert!(review.risk.is_none());
    }

    #[test]
    fn unknown_factor_is_tolerated() {
        let risk: Risk = serde_json::from_str(
            r#"{"level": "low", "factors": [{"kind": "vibes", "level": "low"}]}"#,
        )
        .unwrap();

        assert_eq!(risk.factors[0].kind, RiskFactorKind::Unknown);
    }
}
