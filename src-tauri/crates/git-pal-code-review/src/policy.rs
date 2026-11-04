use globset::{Glob, GlobBuilder, GlobSet, GlobSetBuilder};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::models::{ReviewTemplate, RiskLevel};

const SUPPORTED_VERSION: u32 = 1;

const DEFAULT_SKIP_LABELS: [&str; 2] = ["do not merge", "do not review"];

/// `git-pal.yml`, unset fields leave the template's value untouched.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default)]
pub struct RepoPolicy {
    pub version: u32,
    pub auto_review: RepoAutoReview,
    pub auto_approve: RepoAutoApprove,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default)]
pub struct RepoAutoReview {
    pub enabled: Option<bool>,
    pub skip_labels: Option<Vec<String>>,
    pub skip_approved: Option<bool>,
    pub claim_for_team: Option<bool>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default)]
pub struct RepoAutoApprove {
    pub enabled: Option<bool>,
    pub max_risk: Option<RiskLevel>,
    pub require_green_ci: Option<bool>,
    /// Globs keeping a pull request touching them from being auto approved
    pub skip_paths: Vec<String>,
}

/// Why the repository policy shaped the review.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "code-review.ts")]
pub enum PolicySource {
    Repository,
    /// The template ignores the repository policy
    Overridden,
}

/// Auto review and approval rules once the template and the repository policy are combined.
#[derive(Debug, Clone, PartialEq)]
pub struct Policy {
    /// `None` when only the template applies
    pub source: Option<PolicySource>,
    pub auto_review: bool,
    pub skip_labels: Vec<String>,
    pub skip_approved: bool,
    pub claim_for_team: bool,
    pub auto_approve: bool,
    pub max_risk: RiskLevel,
    pub require_green_ci: bool,
    pub skip_paths: Vec<String>,
}

fn glob(pattern: &str) -> Result<Glob, globset::Error> {
    GlobBuilder::new(pattern).literal_separator(true).build()
}

fn glob_set(patterns: &[String]) -> Result<GlobSet, globset::Error> {
    let mut builder = GlobSetBuilder::new();
    for pattern in patterns {
        builder.add(glob(pattern)?);
    }

    builder.build()
}

/// Reads `git-pal.yml`, the error explains what's wrong with it.
pub fn parse(text: &str) -> Result<RepoPolicy, String> {
    let policy: RepoPolicy = serde_saphyr::from_str(text).map_err(|e| e.to_string())?;

    if policy.version != SUPPORTED_VERSION {
        return Err(format!(
            "Unsupported version {}, expected {SUPPORTED_VERSION}",
            policy.version
        ));
    }

    // high risk is never auto approved, as in templates
    if policy.auto_approve.max_risk == Some(RiskLevel::High) {
        return Err("max_risk can't be high".into());
    }

    glob_set(&policy.auto_approve.skip_paths).map_err(|e| format!("Invalid skip path: {e}"))?;

    Ok(policy)
}

/// First changed file matching one of `patterns`.
pub fn skipped_path<'a>(patterns: &[String], files: &'a [String]) -> Option<&'a String> {
    let set = glob_set(patterns).ok()?;

    files.iter().find(|file| set.is_match(file))
}

fn from_template(template: &ReviewTemplate, source: Option<PolicySource>) -> Policy {
    Policy {
        source,
        auto_review: template.auto_review,
        skip_labels: template.skip_labels.clone(),
        skip_approved: template.skip_approved,
        claim_for_team: template.claim_for_team,
        auto_approve: template.auto_approve,
        max_risk: template.auto_approve_max_risk,
        require_green_ci: template.require_green_ci,
        skip_paths: vec![],
    }
}

/// The repository policy alone, unset fields fall back to a new template's defaults.
fn from_repo(repo: &RepoPolicy) -> Policy {
    let review = &repo.auto_review;
    let approve = &repo.auto_approve;
    let default_labels = DEFAULT_SKIP_LABELS.map(String::from).to_vec();

    Policy {
        source: Some(PolicySource::Repository),
        auto_review: review.enabled == Some(true),
        skip_labels: review.skip_labels.clone().unwrap_or(default_labels),
        skip_approved: review.skip_approved.unwrap_or(true),
        claim_for_team: review.claim_for_team.unwrap_or(false),
        auto_approve: approve.enabled == Some(true),
        max_risk: approve.max_risk.unwrap_or(RiskLevel::Minimal),
        require_green_ci: approve.require_green_ci.unwrap_or(true),
        skip_paths: approve.skip_paths.clone(),
    }
}

/// The stricter of the template and the repository policy.
fn merge(template: &ReviewTemplate, repo: &RepoPolicy) -> Policy {
    let review = &repo.auto_review;
    let approve = &repo.auto_approve;

    let mut skip_labels = template.skip_labels.clone();
    for label in review.skip_labels.iter().flatten() {
        if !skip_labels.contains(label) {
            skip_labels.push(label.clone());
        }
    }

    Policy {
        source: Some(PolicySource::Repository),
        auto_review: template.auto_review && review.enabled != Some(false),
        skip_labels,
        skip_approved: template.skip_approved || review.skip_approved == Some(true),
        claim_for_team: template.claim_for_team || review.claim_for_team == Some(true),
        auto_approve: template.auto_approve && approve.enabled != Some(false),
        max_risk: approve
            .max_risk
            .map_or(template.auto_approve_max_risk, |max| {
                max.min(template.auto_approve_max_risk)
            }),
        require_green_ci: template.require_green_ci || approve.require_green_ci == Some(true),
        skip_paths: approve.skip_paths.clone(),
    }
}

/// Rules for a review, `None` when neither a template nor a followed repository policy applies.
pub fn effective(
    template: Option<&ReviewTemplate>,
    repo: Option<&RepoPolicy>,
    follow_repo: bool,
) -> Option<Policy> {
    match (template, repo) {
        (Some(template), None) => Some(from_template(template, None)),
        (Some(template), Some(_)) if template.override_repository => {
            Some(from_template(template, Some(PolicySource::Overridden)))
        }
        (Some(template), Some(repo)) => Some(merge(template, repo)),
        (None, Some(repo)) if follow_repo => Some(from_repo(repo)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn template() -> ReviewTemplate {
        ReviewTemplate {
            id: 1,
            name: "t".into(),
            content: String::new(),
            matcher: None,
            is_default: true,
            skills: vec![],
            risk_guidelines: None,
            auto_review: true,
            skip_labels: vec!["wip".into()],
            skip_approved: false,
            claim_for_team: false,
            override_repository: false,
            auto_approve: true,
            auto_approve_max_risk: RiskLevel::Medium,
            require_green_ci: false,
            position: 0,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    const REPO: &str = "
version: 1
auto_review:
  skip_labels: [do not merge, wip]
  claim_for_team: true
auto_approve:
  max_risk: low
  require_green_ci: true
  skip_paths: ['.github/workflows/**']
";

    #[test]
    fn parse_rejects_bad_files() {
        assert!(parse(REPO).is_ok());
        assert!(parse("version: 2").is_err());
        assert!(parse("version: 1\nauto_approve:\n  max_risk: high").is_err());
        assert!(parse("version: 1\nauto_approve:\n  skip_paths: ['[']").is_err());
        assert!(parse("version: [").is_err());
    }

    #[test]
    fn stricter_wins_when_merged() {
        let repo = parse(REPO).unwrap();
        let policy = effective(Some(&template()), Some(&repo), false).unwrap();

        assert_eq!(policy.source, Some(PolicySource::Repository));
        assert_eq!(policy.skip_labels, ["wip", "do not merge"]);
        assert!(policy.claim_for_team);
        assert!(policy.auto_approve);
        assert_eq!(policy.max_risk, RiskLevel::Low);
        assert!(policy.require_green_ci);
        assert_eq!(policy.skip_paths, [".github/workflows/**"]);
    }

    #[test]
    fn repo_never_enables_what_the_template_disables() {
        let repo = parse("version: 1\nauto_approve:\n  enabled: true").unwrap();
        let template = ReviewTemplate {
            auto_approve: false,
            ..template()
        };

        assert!(
            !effective(Some(&template), Some(&repo), true)
                .unwrap()
                .auto_approve
        );
    }

    #[test]
    fn override_ignores_the_repo() {
        let repo = parse(REPO).unwrap();
        let template = ReviewTemplate {
            override_repository: true,
            ..template()
        };
        let policy = effective(Some(&template), Some(&repo), false).unwrap();

        assert_eq!(policy.source, Some(PolicySource::Overridden));
        assert_eq!(policy.max_risk, RiskLevel::Medium);
        assert!(policy.skip_paths.is_empty());
    }

    #[test]
    fn repo_alone_applies_only_when_followed() {
        let repo = parse("version: 1\nauto_review:\n  enabled: true").unwrap();

        assert!(effective(None, Some(&repo), false).is_none());

        let policy = effective(None, Some(&repo), true).unwrap();
        assert!(policy.auto_review);
        assert!(!policy.auto_approve);
        assert!(policy.require_green_ci);
    }

    #[test]
    fn skip_paths_match_changed_files() {
        let patterns = vec![".github/workflows/**".to_string(), "*.lock".to_string()];
        let files =
            |names: &[&str]| -> Vec<String> { names.iter().map(|n| n.to_string()).collect() };

        let changed = files(&["src/main.rs", ".github/workflows/ci.yml"]);
        assert_eq!(
            skipped_path(&patterns, &changed).map(String::as_str),
            Some(".github/workflows/ci.yml")
        );
        assert!(skipped_path(&patterns, &files(&["sub/Cargo.lock"])).is_none());
    }
}
