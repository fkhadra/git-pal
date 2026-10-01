pub mod claude;
pub mod codex;
pub mod shell;
mod skills;

use std::{
    collections::HashMap,
    path::Path,
    process::{Command, Stdio},
};

use anyhow::{Result, bail};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "harness.ts")]
pub enum Harness {
    #[default]
    Claude,
    Codex,
}

impl Harness {
    pub fn adapter(self) -> &'static dyn Adapter {
        match self {
            Harness::Claude => &claude::Claude,
            Harness::Codex => &codex::Codex,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Harness::Claude => "claude",
            Harness::Codex => "codex",
        }
    }
}

impl TryFrom<String> for Harness {
    type Error = String;

    fn try_from(s: String) -> std::result::Result<Self, Self::Error> {
        match s.as_str() {
            "claude" => Ok(Harness::Claude),
            "codex" => Ok(Harness::Codex),
            other => Err(format!("unknown Harness: {other}")),
        }
    }
}

/// Content of a message, whatever the harness producing it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export, export_to = "harness.ts")]
pub enum Block {
    Text {
        text: String,
    },
    ToolUse {
        id: String,
        name: String,
        #[ts(type = "unknown")]
        input: serde_json::Value,
    },
    ToolResult {
        #[serde(rename = "toolUseId")]
        tool_use_id: String,
        content: String,
        #[serde(rename = "isError")]
        is_error: bool,
    },
}

/// What a line of a harness' streamed output means.
#[derive(Debug, PartialEq)]
pub enum StreamItem {
    SessionId(String),
    TextDelta(String),
    Block(Block),
    Result { is_error: bool, text: String },
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "harness.ts")]
pub struct Model {
    pub id: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "harness.ts")]
pub struct Skill {
    pub name: String,
    pub description: String,
}

pub struct ChatOptions<'a> {
    pub prompt: &'a str,
    pub system_prompt: &'a str,
    pub model: Option<&'a str>,
    /// Continues this session when set
    pub session_id: Option<&'a str>,
}

pub trait Adapter: Sync {
    /// Executable looked up on the user's PATH
    fn program(&self) -> &'static str;

    /// Models to choose from, the harness' own default applies when none is picked
    fn models(&self) -> Vec<Model>;

    /// Model the harness runs when none is picked
    fn default_model(&self) -> Option<String>;

    /// Variables that must not reach the spawned process
    fn env_denylist(&self) -> &'static [&'static str] {
        &[]
    }

    /// Skills available in every project
    fn skills(&self) -> Vec<Skill> {
        vec![]
    }

    /// Setup needed before running in `cwd`, e.g. tool permissions
    fn prepare(&self, _cwd: &Path) {}

    /// Arguments of a single read-only run of `prompt` with `model`, allowed to use `skills`
    fn run_args(&self, prompt: &str, skills: &[String], model: Option<&str>) -> Vec<String>;

    /// Final answer out of a single run's stdout
    fn run_output(&self, stdout: &str) -> Result<String>;

    /// Arguments of a streamed, read-only chat turn
    fn chat_args(&self, options: &ChatOptions) -> Vec<String>;

    fn parse_line(&self, line: &str) -> Vec<StreamItem>;
}

/// Command running `harness` in `cwd` with `env`, minus the variables it must not see.
pub fn command(harness: Harness, cwd: &Path, env: &HashMap<String, String>) -> Command {
    let adapter = harness.adapter();
    let mut cmd = Command::new(adapter.program());
    cmd.current_dir(cwd).envs(env);

    for key in adapter.env_denylist() {
        cmd.env_remove(key);
    }

    cmd
}

/// Runs `prompt` to completion and returns the final answer.
pub fn run_once(
    harness: Harness,
    cwd: &Path,
    env: &HashMap<String, String>,
    prompt: &str,
    skills: &[String],
    model: Option<&str>,
) -> Result<String> {
    let adapter = harness.adapter();
    adapter.prepare(cwd);

    let output = command(harness, cwd, env)
        .args(adapter.run_args(prompt, skills, model))
        .stdin(Stdio::null())
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);

        log::error!("{} failed: {stderr}", adapter.program());
        bail!("{} failed: {stderr}", adapter.program());
    }

    adapter.run_output(&String::from_utf8(output.stdout)?)
}
