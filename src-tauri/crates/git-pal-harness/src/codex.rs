use std::{env, fs, path::PathBuf};

use anyhow::{Result, bail};
use serde::Deserialize;
use serde_json::Value;

use crate::{Adapter, Block, ChatOptions, Model, Skill, StreamItem, skills::read_skills};

/// Read-only until the agent is allowed to fix pull requests.
const SANDBOX: &str = "sandbox_mode=\"read-only\"";

const MODELS_CACHE: &str = "models_cache.json";
const CONFIG: &str = "config.toml";
const LISTED_MODEL: &str = "list";
const SHELL_TOOL: &str = "Shell";

#[derive(Deserialize)]
struct ModelsCache {
    #[serde(default)]
    models: Vec<CachedModel>,
}

#[derive(Deserialize)]
struct CachedModel {
    slug: String,
    display_name: String,
    #[serde(default)]
    visibility: String,
    #[serde(default)]
    priority: i64,
}

pub struct Codex;

impl Adapter for Codex {
    fn program(&self) -> &'static str {
        "codex"
    }

    fn models(&self) -> Vec<Model> {
        codex_home()
            .and_then(|home| fs::read_to_string(home.join(MODELS_CACHE)).ok())
            .map(|text| listed_models(&text))
            .unwrap_or_default()
    }

    fn default_model(&self) -> Option<String> {
        codex_home()
            .and_then(|home| fs::read_to_string(home.join(CONFIG)).ok())
            .and_then(|config| configured_model(&config))
            // Codex picks the top listed model otherwise
            .or_else(|| self.models().into_iter().next().map(|m| m.id))
    }

    fn skills(&self) -> Vec<Skill> {
        let mut dirs: Vec<PathBuf> = codex_home().into_iter().collect();
        if let Some(home) = env::var_os("HOME") {
            dirs.push(PathBuf::from(home).join(".agents"));
        }

        let mut skills: Vec<Skill> = dirs
            .iter()
            .flat_map(|dir| user_skills(&dir.join("skills")))
            .collect();

        skills.sort_by(|a, b| a.name.cmp(&b.name));
        skills.dedup_by(|a, b| a.name == b.name);
        skills
    }

    // skills need no permission, the prompt names them
    fn run_args(&self, prompt: &str, _skills: &[String], model: Option<&str>) -> Vec<String> {
        let mut args: Vec<String> = ["exec", "--json", "-c", SANDBOX].map(String::from).to_vec();

        if let Some(model) = model {
            args.extend(["-m".to_string(), model.to_string()]);
        }

        args.push(prompt.to_string());
        args
    }

    fn run_output(&self, stdout: &str) -> Result<String> {
        let mut answer = None;

        for line in stdout.lines() {
            for item in parse_line(line) {
                match item {
                    StreamItem::Block(Block::Text { text }) => answer = Some(text),
                    StreamItem::Result {
                        is_error: true,
                        text,
                    } => bail!("codex failed: {text}"),
                    _ => {}
                }
            }
        }

        answer.ok_or_else(|| anyhow::anyhow!("codex returned no answer"))
    }

    fn chat_args(&self, options: &ChatOptions) -> Vec<String> {
        let mut args: Vec<String> = ["exec"].map(String::from).to_vec();

        if options.session_id.is_some() {
            args.push("resume".to_string());
        }

        // a JSON string is a valid TOML string
        let instructions = serde_json::to_string(options.system_prompt).unwrap_or_default();
        args.extend(
            [
                "--json",
                "-c",
                SANDBOX,
                "-c",
                &format!("developer_instructions={instructions}"),
            ]
            .map(String::from),
        );

        if let Some(model) = options.model {
            args.extend(["-m".to_string(), model.to_string()]);
        }

        if let Some(session_id) = options.session_id {
            args.push(session_id.to_string());
        }

        args.push(options.prompt.to_string());
        args
    }

    fn parse_line(&self, line: &str) -> Vec<StreamItem> {
        parse_line(line)
    }
}

/// `$CODEX_HOME`, `~/.codex` by default
fn codex_home() -> Option<PathBuf> {
    if let Some(home) = env::var_os("CODEX_HOME") {
        return Some(PathBuf::from(home));
    }

    env::var_os("HOME").map(|home| PathBuf::from(home).join(".codex"))
}

/// Top-level `model = "…"` of Codex's config.
fn configured_model(config: &str) -> Option<String> {
    config
        .lines()
        .map(str::trim)
        .take_while(|line| !line.starts_with('['))
        .find_map(|line| {
            let (key, value) = line.split_once('=')?;
            if key.trim() != "model" {
                return None;
            }

            Some(value.trim().trim_matches('"').to_string())
        })
}

/// Models Codex lists in its picker, by its own order.
fn listed_models(cache: &str) -> Vec<Model> {
    let Ok(cache) = serde_json::from_str::<ModelsCache>(cache) else {
        return vec![];
    };

    let mut models: Vec<_> = cache
        .models
        .into_iter()
        .filter(|m| m.visibility == LISTED_MODEL)
        .collect();

    models.sort_by_key(|m| m.priority);
    models
        .into_iter()
        .map(|m| Model {
            id: m.slug,
            label: m.display_name,
        })
        .collect()
}

/// Skills under `dir`, minus Codex's hidden built-in ones (`.system`).
fn user_skills(dir: &PathBuf) -> Vec<Skill> {
    let Ok(entries) = fs::read_dir(dir) else {
        return vec![];
    };

    entries
        .flatten()
        .filter(|entry| !entry.file_name().to_string_lossy().starts_with('.'))
        .flat_map(|entry| read_skills(&entry.path(), None))
        .collect()
}

fn parse_line(line: &str) -> Vec<StreamItem> {
    let Ok(value) = serde_json::from_str::<Value>(line) else {
        return vec![];
    };

    match value["type"].as_str() {
        Some("thread.started") => value["thread_id"]
            .as_str()
            .map(|id| vec![StreamItem::SessionId(id.to_string())])
            .unwrap_or_default(),
        Some("item.started") => parse_started(&value["item"]),
        Some("item.completed") => parse_completed(&value["item"]),
        Some("turn.completed") => vec![StreamItem::Result {
            is_error: false,
            text: String::new(),
        }],
        Some("turn.failed") => vec![StreamItem::Result {
            is_error: true,
            text: value["error"]["message"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
        }],
        _ => vec![],
    }
}

fn parse_started(item: &Value) -> Vec<StreamItem> {
    if item["type"] != "command_execution" {
        return vec![];
    }

    let Some(id) = item["id"].as_str() else {
        return vec![];
    };

    vec![StreamItem::Block(Block::ToolUse {
        id: id.to_string(),
        name: SHELL_TOOL.to_string(),
        input: serde_json::json!({ "command": item["command"] }),
    })]
}

fn parse_completed(item: &Value) -> Vec<StreamItem> {
    match item["type"].as_str() {
        // Codex doesn't stream text, the delta shows the message as soon as it lands
        Some("agent_message") => item["text"]
            .as_str()
            .map(|text| {
                vec![
                    StreamItem::TextDelta(text.to_string()),
                    StreamItem::Block(Block::Text {
                        text: text.to_string(),
                    }),
                ]
            })
            .unwrap_or_default(),
        Some("command_execution") => {
            let Some(id) = item["id"].as_str() else {
                return vec![];
            };

            vec![StreamItem::Block(Block::ToolResult {
                tool_use_id: id.to_string(),
                content: item["aggregated_output"]
                    .as_str()
                    .unwrap_or_default()
                    .to_string(),
                is_error: item["exit_code"].as_i64().is_some_and(|code| code != 0),
            })]
        }
        _ => vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_thread_id() {
        let line = r#"{"type":"thread.started","thread_id":"abc"}"#;
        assert_eq!(parse_line(line), vec![StreamItem::SessionId("abc".into())]);
    }

    #[test]
    fn parses_commands() {
        let started = r#"{"type":"item.started","item":{"id":"item_0","type":"command_execution","command":"ls","aggregated_output":"","exit_code":null,"status":"in_progress"}}"#;
        let completed = r#"{"type":"item.completed","item":{"id":"item_0","type":"command_execution","command":"ls","aggregated_output":"a.txt\n","exit_code":1,"status":"failed"}}"#;

        assert_eq!(
            parse_line(started),
            vec![StreamItem::Block(Block::ToolUse {
                id: "item_0".into(),
                name: SHELL_TOOL.into(),
                input: serde_json::json!({"command": "ls"}),
            })]
        );
        assert_eq!(
            parse_line(completed),
            vec![StreamItem::Block(Block::ToolResult {
                tool_use_id: "item_0".into(),
                content: "a.txt\n".into(),
                is_error: true,
            })]
        );
    }

    #[test]
    fn parses_messages() {
        let line = r#"{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"done"}}"#;

        assert_eq!(
            parse_line(line),
            vec![
                StreamItem::TextDelta("done".into()),
                StreamItem::Block(Block::Text {
                    text: "done".into()
                }),
            ]
        );
    }

    #[test]
    fn parses_failed_turn() {
        let line = r#"{"type":"turn.failed","error":{"message":"boom"}}"#;

        assert_eq!(
            parse_line(line),
            vec![StreamItem::Result {
                is_error: true,
                text: "boom".into()
            }]
        );
    }

    #[test]
    fn keeps_last_message_of_a_run() {
        let stdout = [
            r#"{"type":"thread.started","thread_id":"abc"}"#,
            r#"{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"first"}}"#,
            r#"{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"last"}}"#,
            r#"{"type":"turn.completed","usage":{}}"#,
        ]
        .join("\n");

        assert_eq!(Codex.run_output(&stdout).unwrap(), "last");
        assert!(
            Codex
                .run_output(r#"{"type":"turn.failed","error":{"message":"boom"}}"#)
                .is_err()
        );
    }

    #[test]
    fn resumes_with_instructions() {
        let args = Codex.chat_args(&ChatOptions {
            prompt: "hi",
            system_prompt: "say \"x\"",
            model: Some("gpt"),
            session_id: Some("abc"),
        });

        assert_eq!(
            args,
            [
                "exec",
                "resume",
                "--json",
                "-c",
                SANDBOX,
                "-c",
                r#"developer_instructions="say \"x\"""#,
                "-m",
                "gpt",
                "abc",
                "hi",
            ]
        );
    }

    #[test]
    fn reads_top_level_model_only() {
        let config = "approval = \"never\"\nmodel = \"gpt-x\"\n[profiles.a]\nmodel = \"other\"";

        assert_eq!(configured_model(config), Some("gpt-x".into()));
        assert_eq!(configured_model("[profiles.a]\nmodel = \"other\""), None);
    }

    #[test]
    fn lists_visible_models_by_priority() {
        let cache = r#"{"models":[
            {"slug":"b","display_name":"B","visibility":"list","priority":9},
            {"slug":"hidden","display_name":"H","visibility":"hide","priority":1},
            {"slug":"a","display_name":"A","visibility":"list","priority":4}
        ]}"#;

        let ids: Vec<_> = listed_models(cache).into_iter().map(|m| m.id).collect();
        assert_eq!(ids, ["a", "b"]);
    }
}
