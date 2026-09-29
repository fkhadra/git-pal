use std::{collections::HashMap, path::PathBuf, process::Stdio};

use anyhow::{Result, bail};
use tokio::{
    io::{AsyncBufReadExt, AsyncReadExt, BufReader},
    process::Command,
    sync::oneshot,
};

use git_pal_harness::{ChatOptions, Harness, StreamItem};

use crate::models::{AgentEvent, Block};

pub struct RunOptions {
    pub harness: Harness,
    pub cwd: PathBuf,
    pub prompt: String,
    pub system_prompt: String,
    pub model: Option<String>,
    pub session_id: Option<String>,
    pub env: HashMap<String, String>,
}

#[derive(Debug, Default)]
pub struct RunOutcome {
    pub blocks: Vec<Block>,
    pub session_id: Option<String>,
    pub cancelled: bool,
}

/// Runs a chat turn with the harness and forwards its progress. Resolves once the process exits or is cancelled.
pub async fn run(
    opts: RunOptions,
    mut on_event: impl FnMut(AgentEvent),
    mut cancel: oneshot::Receiver<()>,
) -> Result<RunOutcome> {
    let adapter = opts.harness.adapter();
    adapter.prepare(&opts.cwd);

    let mut cmd = Command::from(git_pal_harness::command(opts.harness, &opts.cwd, &opts.env));

    cmd.args(adapter.chat_args(&ChatOptions {
        prompt: &opts.prompt,
        system_prompt: &opts.system_prompt,
        model: opts.model.as_deref(),
        session_id: opts.session_id.as_deref(),
    }))
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .kill_on_drop(true);

    let mut child = cmd.spawn()?;
    let stdout = child.stdout.take().expect("stdout is piped");
    let mut stderr = child.stderr.take().expect("stderr is piped");

    // drain stderr concurrently so a full pipe never blocks the process
    let stderr_task = tokio::spawn(async move {
        let mut buf = String::new();
        let _ = stderr.read_to_string(&mut buf).await;
        buf
    });

    let mut lines = BufReader::new(stdout).lines();
    let mut outcome = RunOutcome::default();
    let mut pending_text = String::new();
    let mut error: Option<String> = None;

    loop {
        let line = tokio::select! {
            _ = &mut cancel => {
                outcome.cancelled = true;
                let _ = child.kill().await;
                break;
            }
            line = lines.next_line() => line?,
        };

        let Some(line) = line else {
            break;
        };

        for item in adapter.parse_line(&line) {
            match item {
                StreamItem::SessionId(id) => outcome.session_id = Some(id),
                StreamItem::TextDelta(text) => {
                    pending_text.push_str(&text);
                    on_event(AgentEvent::TextDelta { text });
                }
                StreamItem::Block(block) => {
                    // completed text replaces the streamed deltas
                    if matches!(block, Block::Text { .. }) {
                        pending_text.clear();
                    } else {
                        on_event(AgentEvent::Block {
                            block: block.clone(),
                        });
                    }
                    outcome.blocks.push(block);
                }
                StreamItem::Result { is_error, text } => {
                    if is_error {
                        error = Some(text);
                    }
                }
            }
        }
    }

    if !pending_text.is_empty() {
        outcome.blocks.push(Block::Text { text: pending_text });
    }

    if outcome.cancelled {
        return Ok(outcome);
    }

    let status = child.wait().await?;
    let stderr = stderr_task.await.unwrap_or_default();

    if let Some(error) = error {
        bail!("Agent failed: {error}");
    }

    if !status.success() {
        bail!("Agent exited with {status}: {}", stderr.trim());
    }

    Ok(outcome)
}
