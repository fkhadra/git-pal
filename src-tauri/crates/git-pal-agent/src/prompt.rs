use crate::models::{ContextItem, PullRequestKey};

// title used in the agent history
const TITLE_MAX_CHARS: usize = 60;

pub fn system_prompt(
    pr: &PullRequestKey,
    title: &str,
    base_ref: &str,
    description: &str,
    discussion: &str,
) -> String {
    let mut prompt = format!(
        "You are assisting with the review of the GitHub pull request {owner}/{repo}#{number}: \"{title}\".\n\
         The current directory is a git worktree checked out at the pull request head (detached HEAD).\n\
         The base branch is `{base_ref}`, inspect the changes with `git diff {base_ref}...HEAD`.\n\
         Answer the user's questions about this pull request. Do not modify any file.",
        owner = pr.owner,
        repo = pr.repository,
        number = pr.pr_number,
    );

    if !description.is_empty() {
        prompt.push_str(&format!("\n\n## Pull request description\n{description}"));
    }

    if discussion.is_empty() {
        return prompt;
    }

    format!("{prompt}\n\n## Existing discussion on the pull request\n{discussion}")
}

/// Prefixes the user prompt with the context they attached.
pub fn user_prompt(prompt: &str, context: &[ContextItem]) -> String {
    if context.is_empty() {
        return prompt.to_string();
    }

    let items: Vec<String> = context
        .iter()
        .map(|item| match item {
            ContextItem::PullRequest => "- The whole pull request".to_string(),
            ContextItem::File { path } => format!("- The changes in `{path}`"),
            ContextItem::Comment {
                path,
                line,
                author,
                body,
            } => comment_context(path, *line, author, body),
        })
        .collect();

    format!("Context:\n{}\n\n{prompt}", items.join("\n"))
}

fn comment_context(path: &str, line: Option<i64>, author: &str, body: &str) -> String {
    let location = match line {
        Some(line) => format!("`{path}` line {line}"),
        None => format!("`{path}`"),
    };
    let quoted: Vec<String> = body.lines().map(|l| format!("  > {l}")).collect();

    format!(
        "- A comment by {author} on {location}:\n{}",
        quoted.join("\n")
    )
}

pub fn conversation_title(prompt: &str) -> String {
    let first_line = prompt.lines().next().unwrap_or_default().trim();
    if first_line.chars().count() <= TITLE_MAX_CHARS {
        return first_line.to_string();
    }

    let mut title: String = first_line.chars().take(TITLE_MAX_CHARS).collect();
    title.push('…');
    title
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_prompt_lists_context() {
        let context = vec![
            ContextItem::PullRequest,
            ContextItem::File {
                path: "src/a.rs".into(),
            },
        ];

        assert_eq!(
            user_prompt("why?", &context),
            "Context:\n- The whole pull request\n- The changes in `src/a.rs`\n\nwhy?"
        );
        assert_eq!(user_prompt("why?", &[]), "why?");
    }

    #[test]
    fn user_prompt_quotes_comments() {
        let context = vec![ContextItem::Comment {
            path: "src/a.rs".into(),
            line: Some(3),
            author: "@octocat".into(),
            body: "Why?\nSeems off".into(),
        }];

        assert_eq!(
            user_prompt("explain", &context),
            "Context:\n- A comment by @octocat on `src/a.rs` line 3:\n  > Why?\n  > Seems off\n\nexplain"
        );
    }

    #[test]
    fn title_uses_truncated_first_line() {
        assert_eq!(conversation_title("Explain\nmore"), "Explain");

        let long = "a".repeat(TITLE_MAX_CHARS + 5);
        assert_eq!(
            conversation_title(&long).chars().count(),
            TITLE_MAX_CHARS + 1
        );
    }
}
