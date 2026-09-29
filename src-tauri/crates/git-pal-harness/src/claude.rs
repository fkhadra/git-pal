mod skills;

use std::{
    env, fs,
    path::{Path, PathBuf},
};

use anyhow::Result;
use serde_json::Value;

use crate::{Adapter, Block, ChatOptions, Model, Skill, StreamItem};

/// Tool outputs can be huge (file dumps), keep what is useful to display.
const MAX_TOOL_RESULT_CHARS: usize = 4000;

/// Read-only until the agent is allowed to fix pull requests.
const DISALLOWED_TOOLS: &str = "Edit,Write,NotebookEdit";

const ALLOWED_TOOLS: &[&str] = &[
    "Bash(ls:*)",
    "Bash(cat:*)",
    "Bash(grep:*)",
    "Bash(tail:*)",
    "Bash(more:*)",
    "Bash(less:*)",
    "Bash(awk:*)",
    "Bash(git:*)",
];

/// Set when launched from a Claude Code session; they would hijack the spawned `claude`.
const ENV_DENYLIST: &[&str] = &[
    "CLAUDECODE",
    "CLAUDE_CODE_BRIDGE_SESSION_ID",
    "CLAUDE_CODE_CHILD_SESSION",
    "CLAUDE_CODE_ENTRYPOINT",
    "CLAUDE_CODE_EXECPATH",
    "CLAUDE_CODE_MESSAGING_SOCKET",
    "CLAUDE_CODE_MESSAGING_TOKEN",
    "CLAUDE_CODE_PARENT_SESSION_ID",
    "CLAUDE_CODE_SESSION_ID",
    "CLAUDE_CODE_SSE_PORT",
];

pub struct Claude;

impl Adapter for Claude {
    fn program(&self) -> &'static str {
        "claude"
    }

    fn models(&self) -> Vec<Model> {
        [("opus", "Opus"), ("sonnet", "Sonnet"), ("haiku", "Haiku")]
            .into_iter()
            .map(|(id, label)| Model {
                id: id.to_string(),
                label: label.to_string(),
            })
            .collect()
    }

    fn env_denylist(&self) -> &'static [&'static str] {
        ENV_DENYLIST
    }

    fn skills(&self) -> Vec<Skill> {
        env::var_os("HOME")
            .map(|home| skills::list(&PathBuf::from(home).join(".claude")))
            .unwrap_or_default()
    }

    fn prepare(&self, cwd: &Path) {
        configure_project(cwd);
    }

    fn run_args(&self, prompt: &str, skills: &[String]) -> Vec<String> {
        let mut args = ["-p", "--output-format", "json", prompt]
            .map(String::from)
            .to_vec();

        // `-p` denies tools lacking permission
        if !skills.is_empty() {
            let allowed: Vec<_> = skills.iter().map(|s| format!("Skill({s})")).collect();
            args.extend(["--allowedTools".to_string(), allowed.join(",")]);
        }

        args
    }

    fn run_output(&self, stdout: &str) -> Result<String> {
        let parsed: Value = serde_json::from_str(stdout)?;
        let text = parsed["result"].as_str().unwrap_or(stdout);

        Ok(text.to_string())
    }

    fn chat_args(&self, options: &ChatOptions) -> Vec<String> {
        let mut args: Vec<String> = [
            "-p",
            options.prompt,
            "--output-format",
            "stream-json",
            "--verbose",
            "--include-partial-messages",
            "--append-system-prompt",
            options.system_prompt,
            "--disallowedTools",
            DISALLOWED_TOOLS,
        ]
        .map(String::from)
        .to_vec();

        if let Some(model) = options.model {
            args.extend(["--model".to_string(), model.to_string()]);
        }

        if let Some(session_id) = options.session_id {
            args.extend(["--resume".to_string(), session_id.to_string()]);
        }

        args
    }

    fn parse_line(&self, line: &str) -> Vec<StreamItem> {
        parse_line(line)
    }
}

fn configure_project(dir: &Path) {
    // Write .claude/settings.local.json in the project directory
    // This controls permissions.allow which bypasses skill confirmation prompts
    let claude_dir = dir.join(".claude");
    if let Err(e) = fs::create_dir_all(&claude_dir) {
        log::error!("Failed to create {}: {e}", claude_dir.display());
        return;
    }

    let settings = serde_json::json!({
        "permissions": {
            "allow": ALLOWED_TOOLS
        }
    });

    let settings_path = claude_dir.join("settings.local.json");
    if let Err(e) = fs::write(
        &settings_path,
        serde_json::to_string_pretty(&settings).unwrap_or_default(),
    ) {
        log::error!("Failed to write {}: {e}", settings_path.display());
    }

    // Set hasTrustDialogAccepted in ~/.claude.json for this project path
    let dir = match dir.canonicalize() {
        Ok(p) => p,
        Err(_) => dir.to_path_buf(),
    };

    let home = match env::var("HOME") {
        Ok(h) => PathBuf::from(h),
        Err(_) => return,
    };
    let config_path = home.join(".claude.json");

    let mut config: serde_json::Value = match fs::read_to_string(&config_path) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => serde_json::json!({}),
    };

    let dir_str = dir.to_string_lossy();
    let projects = config.as_object_mut().and_then(|o| {
        o.entry("projects")
            .or_insert_with(|| serde_json::json!({}))
            .as_object_mut()
    });

    if let Some(projects) = projects {
        let entry = projects
            .entry(dir_str.as_ref())
            .or_insert_with(|| serde_json::json!({}));
        if let Some(obj) = entry.as_object_mut() {
            obj.entry("hasTrustDialogAccepted")
                .or_insert(serde_json::Value::Bool(true));
        }
    }

    if let Err(e) = fs::write(
        &config_path,
        serde_json::to_string_pretty(&config).unwrap_or_default(),
    ) {
        log::error!("Failed to write {}: {e}", config_path.display());
    }
}

fn parse_line(line: &str) -> Vec<StreamItem> {
    let Ok(value) = serde_json::from_str::<Value>(line) else {
        return vec![];
    };

    // skip subagent traffic, only the main conversation is displayed
    if value
        .get("parent_tool_use_id")
        .is_some_and(|p| !p.is_null())
    {
        return vec![];
    }

    match value["type"].as_str() {
        Some("system") => parse_system(&value),
        Some("stream_event") => parse_stream_event(&value),
        Some("assistant") => parse_content(&value, parse_assistant_block),
        Some("user") => parse_content(&value, parse_user_block),
        Some("result") => parse_result(&value),
        _ => vec![],
    }
}

fn parse_system(value: &Value) -> Vec<StreamItem> {
    if value["subtype"] != "init" {
        return vec![];
    }

    value["session_id"]
        .as_str()
        .map(|id| vec![StreamItem::SessionId(id.to_string())])
        .unwrap_or_default()
}

fn parse_stream_event(value: &Value) -> Vec<StreamItem> {
    let delta = &value["event"]["delta"];
    if delta["type"] != "text_delta" {
        return vec![];
    }

    delta["text"]
        .as_str()
        .map(|text| vec![StreamItem::TextDelta(text.to_string())])
        .unwrap_or_default()
}

fn parse_content(value: &Value, parse_block: fn(&Value) -> Option<Block>) -> Vec<StreamItem> {
    let Some(content) = value["message"]["content"].as_array() else {
        return vec![];
    };

    content
        .iter()
        .filter_map(parse_block)
        .map(StreamItem::Block)
        .collect()
}

fn parse_assistant_block(block: &Value) -> Option<Block> {
    match block["type"].as_str()? {
        "text" => Some(Block::Text {
            text: block["text"].as_str()?.to_string(),
        }),
        "tool_use" => Some(Block::ToolUse {
            id: block["id"].as_str()?.to_string(),
            name: block["name"].as_str()?.to_string(),
            input: block["input"].clone(),
        }),
        _ => None,
    }
}

fn parse_user_block(block: &Value) -> Option<Block> {
    if block["type"] != "tool_result" {
        return None;
    }

    Some(Block::ToolResult {
        tool_use_id: block["tool_use_id"].as_str()?.to_string(),
        content: truncate(tool_result_text(&block["content"])),
        is_error: block["is_error"].as_bool().unwrap_or(false),
    })
}

/// Tool result content is either a string or a list of text parts.
fn tool_result_text(content: &Value) -> String {
    if let Some(text) = content.as_str() {
        return text.to_string();
    }

    content
        .as_array()
        .map(|parts| {
            parts
                .iter()
                .filter_map(|p| p["text"].as_str())
                .collect::<Vec<_>>()
                .join("\n")
        })
        .unwrap_or_default()
}

fn truncate(text: String) -> String {
    if text.chars().count() <= MAX_TOOL_RESULT_CHARS {
        return text;
    }

    let mut truncated: String = text.chars().take(MAX_TOOL_RESULT_CHARS).collect();
    truncated.push_str("\n…");
    truncated
}

fn parse_result(value: &Value) -> Vec<StreamItem> {
    vec![StreamItem::Result {
        is_error: value["is_error"].as_bool().unwrap_or(false),
        text: value["result"].as_str().unwrap_or_default().to_string(),
    }]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_init_session() {
        let line = r#"{"type":"system","subtype":"init","session_id":"abc","cwd":"/tmp"}"#;
        assert_eq!(parse_line(line), vec![StreamItem::SessionId("abc".into())]);
    }

    #[test]
    fn ignores_other_system_events() {
        let line = r#"{"type":"system","subtype":"hook_started","session_id":"abc"}"#;
        assert!(parse_line(line).is_empty());
    }

    #[test]
    fn parses_text_delta_only() {
        let text = r#"{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hi"}},"parent_tool_use_id":null}"#;
        let json = r#"{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{"}},"parent_tool_use_id":null}"#;

        assert_eq!(parse_line(text), vec![StreamItem::TextDelta("hi".into())]);
        assert!(parse_line(json).is_empty());
    }

    #[test]
    fn parses_assistant_blocks_and_skips_thinking() {
        let line = r#"{"type":"assistant","message":{"content":[{"type":"thinking","thinking":""},{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"ls"}},{"type":"text","text":"done"}]},"parent_tool_use_id":null}"#;

        assert_eq!(
            parse_line(line),
            vec![
                StreamItem::Block(Block::ToolUse {
                    id: "t1".into(),
                    name: "Bash".into(),
                    input: serde_json::json!({"command": "ls"}),
                }),
                StreamItem::Block(Block::Text {
                    text: "done".into()
                }),
            ]
        );
    }

    #[test]
    fn parses_tool_results() {
        let string = r#"{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"t1","content":"a\nb","is_error":false}]},"parent_tool_use_id":null}"#;
        let parts = r#"{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"t2","content":[{"type":"text","text":"x"},{"type":"text","text":"y"}],"is_error":true}]}}"#;

        assert_eq!(
            parse_line(string),
            vec![StreamItem::Block(Block::ToolResult {
                tool_use_id: "t1".into(),
                content: "a\nb".into(),
                is_error: false,
            })]
        );
        assert_eq!(
            parse_line(parts),
            vec![StreamItem::Block(Block::ToolResult {
                tool_use_id: "t2".into(),
                content: "x\ny".into(),
                is_error: true,
            })]
        );
    }

    #[test]
    fn skips_subagent_lines() {
        let line = r#"{"type":"assistant","message":{"content":[{"type":"text","text":"sub"}]},"parent_tool_use_id":"t1"}"#;
        assert!(parse_line(line).is_empty());
    }

    #[test]
    fn parses_result() {
        let line = r#"{"type":"result","subtype":"success","is_error":false,"result":"done","session_id":"abc"}"#;
        assert_eq!(
            parse_line(line),
            vec![StreamItem::Result {
                is_error: false,
                text: "done".into()
            }]
        );
    }

    #[test]
    fn ignores_invalid_json() {
        assert!(parse_line("not json").is_empty());
    }
}
