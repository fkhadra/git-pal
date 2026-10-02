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

const PROGRAM: &str = "opencode";
const GLOBAL_CONFIG: &str = ".config/opencode/opencode.json";
/// Leaves a repository's own `opencode.json` alone
const PROJECT_CONFIG: &str = ".opencode/opencode.json";
const SKILL_DIRS: &[&str] = &[
    ".config/opencode/skills",
    ".claude/skills",
    ".agents/skills",
];

/// Read-only: no edit tool, only these commands run, any other is denied without ending the run.
const ALLOWED_COMMANDS: &[&str] = &[
    "ls", "ls *", "cat *", "grep *", "rg *", "head *", "tail *", "git *",
];

const LIST_ATTEMPTS: usize = 2;

/// Listing models is slow, kept once some are found.
static MODELS: OnceLock<Vec<Model>> = OnceLock::new();

fn listed_models() -> Option<&'static Vec<Model>> {
    if let Some(models) = MODELS.get() {
        return Some(models);
    }

    // the first call after the background server stopped starts it and lists nothing
    let models = (0..LIST_ATTEMPTS).find_map(|_| {
        let models = parse_models(&cli_output(PROGRAM, &["models"])?);
        (!models.is_empty()).then_some(models)
    })?;

    Some(MODELS.get_or_init(|| models))
}

pub struct OpenCode;

impl Adapter for OpenCode {
    fn program(&self) -> &'static str {
        PROGRAM
    }

    fn models(&self) -> Vec<Model> {
        listed_models().cloned().unwrap_or_default()
    }

    fn default_model(&self) -> Option<String> {
        let home = env::var_os("HOME").map(PathBuf::from)?;
        let configured = fs::read_to_string(home.join(GLOBAL_CONFIG))
            .ok()
            .and_then(|text| serde_json::from_str::<Value>(&text).ok())
            .and_then(|config| config["model"].as_str().map(String::from));

        configured.or_else(|| listed_models()?.first().map(|m| m.id.clone()))
    }

    fn skills(&self) -> Vec<Skill> {
        let Some(home) = env::var_os("HOME").map(PathBuf::from) else {
            return vec![];
        };

        let mut skills: Vec<Skill> = SKILL_DIRS
            .iter()
            .flat_map(|dir| user_skills(&home.join(dir)))
            .collect();

        skills.sort_by(|a, b| a.name.cmp(&b.name));
        skills.dedup_by(|a, b| a.name == b.name);
        skills
    }

    fn prepare(&self, cwd: &Path) {
        configure_project(&cwd.join(PROJECT_CONFIG));
    }

    fn run_args(&self, prompt: &str, _skills: &[String], model: Option<&str>) -> Vec<String> {
        args(prompt.to_string(), model, None)
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
                    } => bail!("opencode failed: {text}"),
                    _ => {}
                }
            }
        }

        answer.ok_or_else(|| anyhow!("opencode returned no answer"))
    }

    fn chat_args(&self, options: &ChatOptions) -> Vec<String> {
        args(
            prompt_with_context(options),
            options.model,
            options.session_id,
        )
    }

    fn parse_line(&self, line: &str) -> Vec<StreamItem> {
        parse_line(line)
    }
}

fn args(prompt: String, model: Option<&str>, session: Option<&str>) -> Vec<String> {
    let mut args: Vec<String> = ["run", "--format", "json"].map(String::from).to_vec();

    if let Some(model) = model {
        args.extend(["--model".to_string(), model.to_string()]);
    }

    if let Some(session) = session {
        args.extend(["--session".to_string(), session.to_string()]);
    }

    args.push(prompt);
    args
}

fn read_only_permission() -> Value {
    let mut bash = serde_json::Map::from_iter([("*".to_string(), json!("deny"))]);
    for command in ALLOWED_COMMANDS {
        bash.insert(command.to_string(), json!("allow"));
    }

    json!({ "edit": "deny", "bash": bash })
}

/// Sets the read-only `permission` of the worktree, keeping the rest of an existing config.
fn configure_project(path: &Path) {
    let mut config: Value = fs::read_to_string(path)
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_else(|| json!({}));

    let Some(root) = config.as_object_mut() else {
        return;
    };
    root.insert("permission".to_string(), read_only_permission());

    if let Some(dir) = path.parent()
        && let Err(e) = fs::create_dir_all(dir)
    {
        log::error!("Failed to create {}: {e}", dir.display());
        return;
    }

    if let Err(e) = fs::write(
        path,
        serde_json::to_string_pretty(&config).unwrap_or_default(),
    ) {
        log::error!("Failed to write {}: {e}", path.display());
    }
}

/// Models of `opencode models`, one `provider/model` per line.
fn parse_models(output: &str) -> Vec<Model> {
    output
        .lines()
        .map(str::trim)
        .filter(|line| line.contains('/') && !line.contains(' '))
        .map(|id| Model {
            id: id.to_string(),
            label: id.to_string(),
        })
        .collect()
}

fn parse_line(line: &str) -> Vec<StreamItem> {
    let Ok(value) = serde_json::from_str::<Value>(line) else {
        return vec![];
    };

    let part = &value["part"];

    match value["type"].as_str() {
        Some("step_start") => value["sessionID"]
            .as_str()
            .map(|id| vec![StreamItem::SessionId(id.to_string())])
            .unwrap_or_default(),
        // whole parts, the delta shows them as soon as they land
        Some("text") => part["text"]
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
        Some("tool_use") => parse_tool(part),
        Some("error") => vec![StreamItem::Result {
            is_error: true,
            text: value["error"]["message"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
        }],
        _ => vec![],
    }
}

/// Tools only stream once done, their call and result come together.
fn parse_tool(part: &Value) -> Vec<StreamItem> {
    let Some(id) = part["id"].as_str().or(part["partID"].as_str()) else {
        return vec![];
    };

    let state = &part["state"];
    let content = state["output"]
        .as_str()
        .or(state["error"].as_str())
        .unwrap_or_default();

    vec![
        StreamItem::Block(Block::ToolUse {
            id: id.to_string(),
            name: part["tool"].as_str().unwrap_or_default().to_string(),
            input: state["input"].clone(),
        }),
        StreamItem::Block(Block::ToolResult {
            tool_use_id: id.to_string(),
            content: content.to_string(),
            is_error: state["status"] == "error",
        }),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_models() {
        let ids: Vec<_> = parse_models("opencode/big-pickle\nanthropic/claude-sonnet-5\n")
            .into_iter()
            .map(|m| m.id)
            .collect();

        assert_eq!(ids, ["opencode/big-pickle", "anthropic/claude-sonnet-5"]);
    }

    #[test]
    fn parses_session_text_and_tools() {
        let start = r#"{"type":"step_start","sessionID":"ses_1","part":{"type":"step-start"}}"#;
        let text = r#"{"type":"text","sessionID":"ses_1","part":{"type":"text","text":"done"}}"#;
        let tool = r#"{"type":"tool_use","sessionID":"ses_1","part":{"type":"tool","id":"functions.shell:0","tool":"shell","state":{"status":"error","input":{"command":"echo x > b.txt"},"error":"Permission denied: shell"}}}"#;

        assert_eq!(
            parse_line(start),
            vec![StreamItem::SessionId("ses_1".into())]
        );
        assert_eq!(parse_line(text).len(), 2);
        assert_eq!(
            parse_line(tool),
            vec![
                StreamItem::Block(Block::ToolUse {
                    id: "functions.shell:0".into(),
                    name: "shell".into(),
                    input: json!({"command": "echo x > b.txt"}),
                }),
                StreamItem::Block(Block::ToolResult {
                    tool_use_id: "functions.shell:0".into(),
                    content: "Permission denied: shell".into(),
                    is_error: true,
                }),
            ]
        );
    }

    #[test]
    fn reports_errors() {
        let error = r#"{"type":"error","sessionID":"ses_1","error":{"type":"provider.no-route","message":"Model unavailable: nope/none"}}"#;

        assert!(OpenCode.run_output(error).is_err());
    }

    #[test]
    fn keeps_existing_config() {
        let dir = std::env::temp_dir().join("git-pal-opencode-config");
        let path = dir.join(PROJECT_CONFIG);
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, r#"{"instructions":["CONTRIBUTING.md"]}"#).unwrap();

        configure_project(&path);

        let config: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(config["instructions"][0], "CONTRIBUTING.md");
        assert_eq!(config["permission"]["edit"], "deny");
        assert_eq!(config["permission"]["bash"]["git *"], "allow");
    }
}
