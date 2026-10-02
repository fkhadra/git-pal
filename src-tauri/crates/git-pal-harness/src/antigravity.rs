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

const PROGRAM: &str = "agy";
const SETTINGS: &str = ".gemini/antigravity-cli/settings.json";
const GLOBAL_SKILLS: &str = ".gemini/config/skills";
const SUCCESS: &str = "SUCCESS";

/// Headless runs deny anything not allowed, writes included. Only the global settings
/// honor these rules, a denied command ends the run.
const ALLOWED_COMMANDS: &[&str] = &[
    // matches every git command, compound lines run once each part is allowed
    "command(git)",
    "command(cat)",
    "command(ls)",
    "command(grep)",
    "command(rg)",
    "command(head)",
    "command(tail)",
];

/// Listing models is a network call, kept once some are found.
static MODELS: OnceLock<Vec<Model>> = OnceLock::new();

fn listed_models() -> Option<&'static Vec<Model>> {
    if let Some(models) = MODELS.get() {
        return Some(models);
    }

    let models = parse_models(&cli_output(PROGRAM, &["models"])?);
    if models.is_empty() {
        return None;
    }

    Some(MODELS.get_or_init(|| models))
}

pub struct Antigravity;

impl Adapter for Antigravity {
    fn program(&self) -> &'static str {
        PROGRAM
    }

    fn models(&self) -> Vec<Model> {
        listed_models().cloned().unwrap_or_default()
    }

    // nothing tells it, the top listed model is the one answering
    fn default_model(&self) -> Option<String> {
        listed_models()?.first().map(|m| m.id.clone())
    }

    fn skills(&self) -> Vec<Skill> {
        let Some(home) = env::var_os("HOME").map(PathBuf::from) else {
            return vec![];
        };

        let mut skills = user_skills(&home.join(GLOBAL_SKILLS));
        skills.sort_by(|a, b| a.name.cmp(&b.name));
        skills
    }

    fn prepare(&self, _cwd: &Path) {
        if let Some(home) = env::var_os("HOME") {
            allow_commands(&PathBuf::from(home).join(SETTINGS));
        }
    }

    fn run_args(&self, prompt: &str, _skills: &[String], model: Option<&str>) -> Vec<String> {
        args(prompt.to_string(), model, None)
    }

    fn run_output(&self, stdout: &str) -> Result<String> {
        let mut answer = None;
        // names the call a denial cut the run on
        let mut failed_call = None;

        for line in stdout.lines() {
            if let Some(call) = failed_call_label(line) {
                failed_call = Some(call);
            }

            for item in parse_line(line) {
                match item {
                    StreamItem::Block(Block::Text { text }) => answer = Some(text),
                    StreamItem::Result {
                        is_error: true,
                        text,
                    } => match &failed_call {
                        Some(call) => bail!("antigravity failed: {text}: {call}"),
                        None => bail!("antigravity failed: {text}"),
                    },
                    _ => {}
                }
            }
        }

        answer.ok_or_else(|| anyhow!("antigravity returned no answer"))
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

fn args(prompt: String, model: Option<&str>, conversation: Option<&str>) -> Vec<String> {
    let mut args = vec![
        "-p".to_string(),
        prompt,
        "--output-format".to_string(),
        "stream-json".to_string(),
    ];

    if let Some(model) = model {
        args.extend(["--model".to_string(), model.to_string()]);
    }

    if let Some(conversation) = conversation {
        args.extend(["--conversation".to_string(), conversation.to_string()]);
    }

    args
}

/// Adds the missing read-only rules to `permissions.allow`, leaving the rest untouched.
fn allow_commands(path: &Path) {
    let mut settings: Value = fs::read_to_string(path)
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_else(|| json!({}));

    if !merge_allowed(&mut settings) {
        return;
    }

    if let Some(dir) = path.parent()
        && let Err(e) = fs::create_dir_all(dir)
    {
        log::error!("Failed to create {}: {e}", dir.display());
        return;
    }

    if let Err(e) = fs::write(
        path,
        serde_json::to_string_pretty(&settings).unwrap_or_default(),
    ) {
        log::error!("Failed to write {}: {e}", path.display());
    }
}

/// Whether `settings` lacked some of the rules, now added.
fn merge_allowed(settings: &mut Value) -> bool {
    let Some(root) = settings.as_object_mut() else {
        return false;
    };

    let permissions = root.entry("permissions").or_insert_with(|| json!({}));
    let Some(allow) = permissions
        .as_object_mut()
        .map(|p| p.entry("allow").or_insert_with(|| json!([])))
        .and_then(Value::as_array_mut)
    else {
        return false;
    };

    let missing: Vec<&str> = ALLOWED_COMMANDS
        .iter()
        .copied()
        .filter(|rule| !allow.iter().any(|r| r == rule))
        .collect();

    allow.extend(missing.iter().map(|rule| json!(rule)));
    !missing.is_empty()
}

/// The command line of a failed tool step, its whole input otherwise. A denied step may
/// only show up as failed, without the active state before it.
fn failed_call_label(line: &str) -> Option<String> {
    let value: Value = serde_json::from_str(line).ok()?;
    let step = &value["step_update"];
    if step["step_type"] != "tool" || step["state"] != "ERROR" {
        return None;
    }

    let input = &step["tool_info"]["parameters"];
    match input["CommandLine"].as_str() {
        Some(command) => Some(command.to_string()),
        None => Some(input.to_string()),
    }
}

/// Models of `agy models`, `id<TAB>Label` per line.
fn parse_models(output: &str) -> Vec<Model> {
    output
        .lines()
        .filter_map(|line| line.split_once('\t'))
        .map(|(id, label)| Model {
            id: id.trim().to_string(),
            label: label.trim().to_string(),
        })
        .collect()
}

fn parse_line(line: &str) -> Vec<StreamItem> {
    let Ok(value) = serde_json::from_str::<Value>(line) else {
        return vec![];
    };

    match value["event"].as_str() {
        Some("init") => value["conversation_id"]
            .as_str()
            .map(|id| vec![StreamItem::SessionId(id.to_string())])
            .unwrap_or_default(),
        Some("step_update") => parse_step(&value["step_update"]).into_iter().collect(),
        Some("result") => parse_result(&value["result"]),
        _ => vec![],
    }
}

/// Tool steps, identified by their index in the conversation.
fn parse_step(step: &Value) -> Option<StreamItem> {
    if step["step_type"] != "tool" {
        return None;
    }

    let id = step["step_index"].as_i64()?.to_string();
    let info = &step["tool_info"];

    match step["state"].as_str()? {
        "ACTIVE" => Some(StreamItem::Block(Block::ToolUse {
            id,
            name: step["tool_name"].as_str()?.to_string(),
            input: info["parameters"].clone(),
        })),
        state => {
            let content = info["output"]
                .as_str()
                .or(info["error"]["message"].as_str())
                .unwrap_or_default();

            Some(StreamItem::Block(Block::ToolResult {
                tool_use_id: id,
                content: content.to_string(),
                is_error: state != "DONE",
            }))
        }
    }
}

/// Only the final answer is streamed. An empty one after a denied tool means the run was cut.
fn parse_result(result: &Value) -> Vec<StreamItem> {
    let response = result["response"].as_str().unwrap_or_default();
    let is_success = result["status"] == SUCCESS;
    let denied = result["denied_actions"]
        .as_array()
        .filter(|actions| !actions.is_empty());

    if let Some(actions) = denied
        && response.is_empty()
    {
        let names: Vec<_> = actions
            .iter()
            .filter_map(|a| a["action"].as_str())
            .collect();
        return vec![StreamItem::Result {
            is_error: true,
            text: format!(
                "Antigravity denied a {} permission it needed",
                names.join(", ")
            ),
        }];
    }

    let mut items = vec![];
    if !response.is_empty() {
        items.push(StreamItem::TextDelta(response.to_string()));
        items.push(StreamItem::Block(Block::Text {
            text: response.to_string(),
        }));
    }

    items.push(StreamItem::Result {
        is_error: !is_success,
        text: response.to_string(),
    });
    items
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_models() {
        let output =
            "Fetching available models...\ngemini-3.8-flash-high\tGemini 3.8 Flash (High)\n";

        let models = parse_models(output);
        assert_eq!(models.len(), 1);
        assert_eq!(models[0].id, "gemini-3.8-flash-high");
    }

    #[test]
    fn merges_missing_rules_once() {
        let mut settings = json!({
            "colorScheme": "tokyo night",
            "permissions": { "allow": ["command(git)", "command(npm test)"] }
        });

        assert!(merge_allowed(&mut settings));
        assert!(!merge_allowed(&mut settings));

        let allow = settings["permissions"]["allow"].as_array().unwrap();
        assert_eq!(allow.len(), ALLOWED_COMMANDS.len() + 1);
        assert!(allow.contains(&json!("command(npm test)")));
        assert_eq!(settings["colorScheme"], "tokyo night");
    }

    #[test]
    fn parses_tool_steps() {
        let active = r#"{"event":"step_update","step_update":{"step_index":2,"state":"ACTIVE","step_type":"tool","tool_name":"run_command","tool_info":{"name":"run_command","parameters":{"CommandLine":"git status --short"}}}}"#;
        let done = r#"{"event":"step_update","step_update":{"step_index":2,"state":"DONE","step_type":"tool","tool_name":"run_command","tool_info":{"name":"run_command","output":"?? a.txt\r\n"}}}"#;
        let error = r#"{"event":"step_update","step_update":{"step_index":3,"state":"ERROR","step_type":"tool","tool_name":"run_command","tool_info":{"error":{"message":"denied"}}}}"#;

        assert_eq!(
            parse_line(active),
            vec![StreamItem::Block(Block::ToolUse {
                id: "2".into(),
                name: "run_command".into(),
                input: json!({"CommandLine": "git status --short"}),
            })]
        );
        assert_eq!(
            parse_line(done),
            vec![StreamItem::Block(Block::ToolResult {
                tool_use_id: "2".into(),
                content: "?? a.txt\r\n".into(),
                is_error: false,
            })]
        );
        assert!(matches!(
            parse_line(error).as_slice(),
            [StreamItem::Block(Block::ToolResult { is_error: true, .. })]
        ));
    }

    #[test]
    fn parses_answer_and_cut_runs() {
        let answer = r#"{"event":"result","result":{"conversation_id":"c","status":"SUCCESS","response":"done\n"}}"#;
        let cut = r#"{"event":"result","result":{"status":"SUCCESS","response":"","denied_actions":[{"action":"command"}]}}"#;

        let denied = r#"{"event":"step_update","step_update":{"step_index":2,"state":"ERROR","step_type":"tool","tool_name":"run_command","tool_info":{"parameters":{"CommandLine":"git status && git branch -a"},"error":{"message":"denied"}}}}"#;

        assert_eq!(Antigravity.run_output(answer).unwrap(), "done\n");
        assert!(Antigravity.run_output(cut).is_err());

        let error = Antigravity
            .run_output(&format!("{denied}\n{cut}"))
            .unwrap_err()
            .to_string();
        assert!(error.ends_with("git status && git branch -a"), "{error}");
    }

    #[test]
    fn parses_conversation_id() {
        let init = r#"{"event":"init","conversation_id":"abc","init":{"cwd":"/tmp"}}"#;
        assert_eq!(parse_line(init), vec![StreamItem::SessionId("abc".into())]);
    }
}
