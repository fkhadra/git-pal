use std::{
    env, fs,
    path::{Path, PathBuf},
    sync::OnceLock,
};

use anyhow::{Result, anyhow, bail};
use serde_json::{Value, json};

use crate::{
    Adapter, Block, ChatOptions, Model, Skill, StreamItem, cli_output, prompt_with_context,
    skills::user_skills,
};

const PROGRAM: &str = "cursor-agent";
const DEFAULT_MARKER: &str = "(current";
const TOOL_CALL_SUFFIX: &str = "ToolCall";

/// Read-only: allowed commands run, file writes and any other command are rejected.
const ALLOWED_TOOLS: &[&str] = &[
    "Shell(ls)",
    "Shell(cat)",
    "Shell(grep)",
    "Shell(head)",
    "Shell(tail)",
    "Shell(git)",
];
const DENIED_TOOLS: &[&str] = &["Write(**)"];

type Listing = (Vec<Model>, Option<String>);

/// Listing models is a network call, kept once some are found.
static LISTING: OnceLock<Listing> = OnceLock::new();

fn listing() -> Option<&'static Listing> {
    if let Some(listing) = LISTING.get() {
        return Some(listing);
    }

    let listing = parse_models(&cli_output(PROGRAM, &["models"])?);
    if listing.0.is_empty() {
        return None;
    }

    Some(LISTING.get_or_init(|| listing))
}

pub struct Cursor;

impl Adapter for Cursor {
    fn program(&self) -> &'static str {
        PROGRAM
    }

    fn models(&self) -> Vec<Model> {
        listing()
            .map(|(models, _)| models.clone())
            .unwrap_or_default()
    }

    fn default_model(&self) -> Option<String> {
        listing().and_then(|(_, default)| default.clone())
    }

    fn skills(&self) -> Vec<Skill> {
        let Some(home) = env::var_os("HOME").map(PathBuf::from) else {
            return vec![];
        };

        let mut skills: Vec<Skill> = [".cursor/skills", ".agents/skills"]
            .iter()
            .flat_map(|dir| user_skills(&home.join(dir)))
            .collect();

        skills.sort_by(|a, b| a.name.cmp(&b.name));
        skills.dedup_by(|a, b| a.name == b.name);
        skills
    }

    fn prepare(&self, cwd: &Path) {
        configure_project(cwd);
    }

    fn run_args(&self, prompt: &str, _skills: &[String], model: Option<&str>) -> Vec<String> {
        let mut args = base_args();

        if let Some(model) = model {
            args.extend(["--model".to_string(), model.to_string()]);
        }

        args.push(prompt.to_string());
        args
    }

    /// The last message holds the answer, `result` glues every message together.
    fn run_output(&self, stdout: &str) -> Result<String> {
        let mut answer = None;

        for line in stdout.lines() {
            for item in parse_line(line) {
                match item {
                    StreamItem::Block(Block::Text { text }) => answer = Some(text),
                    StreamItem::Result {
                        is_error: true,
                        text,
                    } => bail!("cursor failed: {text}"),
                    _ => {}
                }
            }
        }

        answer.ok_or_else(|| anyhow!("cursor returned no answer"))
    }

    fn chat_args(&self, options: &ChatOptions) -> Vec<String> {
        let mut args = base_args();

        if let Some(model) = options.model {
            args.extend(["--model".to_string(), model.to_string()]);
        }

        if let Some(session_id) = options.session_id {
            args.extend(["--resume".to_string(), session_id.to_string()]);
        }

        args.push(prompt_with_context(options));
        args
    }

    fn parse_line(&self, line: &str) -> Vec<StreamItem> {
        parse_line(line)
    }
}

fn base_args() -> Vec<String> {
    ["-p", "--output-format", "stream-json", "--trust"]
        .map(String::from)
        .to_vec()
}

/// Permissions of the worktree, `.cursor/cli.json`.
fn configure_project(dir: &Path) {
    let cursor_dir = dir.join(".cursor");
    if let Err(e) = fs::create_dir_all(&cursor_dir) {
        log::error!("Failed to create {}: {e}", cursor_dir.display());
        return;
    }

    let config = json!({
        "permissions": { "allow": ALLOWED_TOOLS, "deny": DENIED_TOOLS }
    });
    let path = cursor_dir.join("cli.json");

    if let Err(e) = fs::write(
        &path,
        serde_json::to_string_pretty(&config).unwrap_or_default(),
    ) {
        log::error!("Failed to write {}: {e}", path.display());
    }
}

/// Models of `cursor-agent models` (`id - Label`), and the one marked as current.
fn parse_models(output: &str) -> (Vec<Model>, Option<String>) {
    let mut default = None;

    let models = output
        .lines()
        .filter_map(|line| line.split_once(" - "))
        .map(|(id, label)| {
            let id = id.trim().to_string();
            if label.contains(DEFAULT_MARKER) {
                default = Some(id.clone());
            }

            let label = label.split(DEFAULT_MARKER).next().unwrap_or(label).trim();
            Model {
                id,
                label: label.to_string(),
            }
        })
        .collect();

    (models, default)
}

fn parse_line(line: &str) -> Vec<StreamItem> {
    let Ok(value) = serde_json::from_str::<Value>(line) else {
        return vec![];
    };

    match value["type"].as_str() {
        Some("system") if value["subtype"] == "init" => value["session_id"]
            .as_str()
            .map(|id| vec![StreamItem::SessionId(id.to_string())])
            .unwrap_or_default(),
        Some("assistant") => parse_assistant(&value),
        Some("tool_call") => parse_tool_call(&value).into_iter().collect(),
        Some("result") => vec![StreamItem::Result {
            is_error: value["is_error"].as_bool().unwrap_or(false),
            text: value["result"].as_str().unwrap_or_default().to_string(),
        }],
        _ => vec![],
    }
}

/// Whole messages, the delta shows them as soon as they land.
fn parse_assistant(value: &Value) -> Vec<StreamItem> {
    let Some(content) = value["message"]["content"].as_array() else {
        return vec![];
    };

    content
        .iter()
        .filter_map(|block| block["text"].as_str())
        .flat_map(|text| {
            [
                StreamItem::TextDelta(text.to_string()),
                StreamItem::Block(Block::Text {
                    text: text.to_string(),
                }),
            ]
        })
        .collect()
}

/// `{"shellToolCall": {"args": …, "result": …}}`, named `Shell`.
fn parse_tool_call(value: &Value) -> Option<StreamItem> {
    let id = value["call_id"].as_str()?.to_string();
    let (kind, call) = value["tool_call"].as_object()?.iter().next()?;
    let name = kind.trim_end_matches(TOOL_CALL_SUFFIX);

    if value["subtype"] == "started" {
        return Some(StreamItem::Block(Block::ToolUse {
            id,
            name: capitalize(name),
            input: call["args"].clone(),
        }));
    }

    let result = &call["result"];
    let success = &result["success"];
    let content = match success["stdout"].as_str().or(success["content"].as_str()) {
        Some(text) => text.to_string(),
        None => result.to_string(),
    };

    Some(StreamItem::Block(Block::ToolResult {
        tool_use_id: id,
        content,
        is_error: success.is_null(),
    }))
}

fn capitalize(name: &str) -> String {
    let mut chars = name.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().chain(chars).collect(),
        None => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_models_and_current_one() {
        let output = "Available models\n\nauto - Auto (current, default)\ngpt-5.2 - GPT-5.2\n";
        let (models, default) = parse_models(output);

        assert_eq!(models.len(), 2);
        assert_eq!(models[0].label, "Auto");
        assert_eq!(default.as_deref(), Some("auto"));
    }

    #[test]
    fn parses_session_and_messages() {
        let init = r#"{"type":"system","subtype":"init","session_id":"abc","model":"Auto"}"#;
        let message = r#"{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"done"}]},"session_id":"abc"}"#;

        assert_eq!(parse_line(init), vec![StreamItem::SessionId("abc".into())]);
        assert_eq!(
            parse_line(message),
            vec![
                StreamItem::TextDelta("done".into()),
                StreamItem::Block(Block::Text {
                    text: "done".into()
                }),
            ]
        );
    }

    #[test]
    fn parses_tool_calls() {
        let started = r#"{"type":"tool_call","subtype":"started","call_id":"c1","tool_call":{"shellToolCall":{"args":{"command":"cat a.txt"}}}}"#;
        let completed = r#"{"type":"tool_call","subtype":"completed","call_id":"c1","tool_call":{"shellToolCall":{"result":{"success":{"command":"cat a.txt","stdout":"hello\n","exitCode":0}}}}}"#;
        let rejected = r#"{"type":"tool_call","subtype":"completed","call_id":"c2","tool_call":{"editToolCall":{"result":{"writePermissionDenied":{"error":"denied"}}}}}"#;

        assert_eq!(
            parse_line(started),
            vec![StreamItem::Block(Block::ToolUse {
                id: "c1".into(),
                name: "Shell".into(),
                input: json!({"command": "cat a.txt"}),
            })]
        );
        assert_eq!(
            parse_line(completed),
            vec![StreamItem::Block(Block::ToolResult {
                tool_use_id: "c1".into(),
                content: "hello\n".into(),
                is_error: false,
            })]
        );
        assert!(matches!(
            parse_line(rejected).as_slice(),
            [StreamItem::Block(Block::ToolResult { is_error: true, .. })]
        ));
    }

    #[test]
    fn keeps_last_message_of_a_run() {
        let stdout = [
            r#"{"type":"assistant","message":{"content":[{"type":"text","text":"Looking."}]}}"#,
            r#"{"type":"assistant","message":{"content":[{"type":"text","text":"{\"summary\":\"ok\"}"}]}}"#,
            r#"{"type":"result","subtype":"success","is_error":false,"result":"Looking.{\"summary\":\"ok\"}"}"#,
        ]
        .join("\n");

        assert_eq!(Cursor.run_output(&stdout).unwrap(), r#"{"summary":"ok"}"#);
    }

    #[test]
    fn resumes_without_repeating_context() {
        let options = |session_id| ChatOptions {
            prompt: "hi",
            system_prompt: "pr",
            model: None,
            session_id,
        };

        assert!(
            Cursor
                .chat_args(&options(None))
                .last()
                .unwrap()
                .contains("<context>")
        );

        let resumed = Cursor.chat_args(&options(Some("abc")));
        assert_eq!(resumed.last().unwrap(), "hi");
        assert!(resumed.windows(2).any(|w| w == ["--resume", "abc"]));
    }
}
