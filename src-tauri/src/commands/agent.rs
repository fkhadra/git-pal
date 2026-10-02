use anyhow::anyhow;
use tauri::{Manager, State, ipc::Channel};

use crate::core::AppState;

use git_pal_agent::{
    models::{
        AgentEvent, AgentMessage, Block, Conversation, PullRequestKey, Role, SendMessageRequest,
    },
    prompt,
    runner::{self, RunOptions},
};
use git_pal_code_review::git;
use git_pal_github::rest::GetPullRequestRequest;
use git_pal_harness::{Harness, Model, shell};

use super::Result;
use super::github::discussion_summary;

/// Sends a message to the PR agent. Progress and failures are streamed through `on_event`.
#[tauri::command]
pub async fn agent_send(
    app_handle: tauri::AppHandle,
    request: SendMessageRequest,
    on_event: Channel<AgentEvent>,
) -> Result<i64> {
    let state: State<'_, AppState> = app_handle.state();
    let pr = PullRequestKey {
        owner: request.owner.clone(),
        repository: request.repository.clone(),
        pr_number: request.pr_number,
    };

    let conversation_id = match request.conversation_id {
        Some(id) => id,
        None => {
            state
                .agent_store
                .create_conversation(
                    &pr,
                    &prompt::conversation_title(&request.prompt),
                    state.get_settings().harness,
                )
                .await?
        }
    };

    if state
        .agent_runs
        .lock()
        .unwrap()
        .contains_key(&conversation_id)
    {
        return Err(anyhow!("Agent is already running").into());
    }

    state
        .agent_store
        .add_message(
            conversation_id,
            Role::User,
            &[Block::Text {
                text: request.prompt.clone(),
            }],
        )
        .await?;

    let _ = on_event.send(AgentEvent::Started { conversation_id });

    if let Err(err) = run_agent(&state, &pr, conversation_id, request, &on_event).await {
        log::error!("Agent failed: {err}");
        let _ = on_event.send(AgentEvent::Error {
            message: err.to_string(),
        });
    }

    Ok(conversation_id)
}

async fn run_agent(
    state: &AppState,
    pr: &PullRequestKey,
    conversation_id: i64,
    request: SendMessageRequest,
    on_event: &Channel<AgentEvent>,
) -> anyhow::Result<()> {
    let pr_request = GetPullRequestRequest {
        owner: pr.owner.clone(),
        repository: pr.repository.clone(),
        number: pr.pr_number,
    };
    let details = state.github_client.get_pull_request(&pr_request).await?;
    let discussion = discussion_summary(state, &pr_request).await;

    let conversation = state
        .agent_store
        .get_conversation(conversation_id)
        .await?
        .ok_or_else(|| anyhow!("Conversation not found"))?;

    let repositories_dir = state.repositories_dir();
    if !git::worktree_dir(&repositories_dir, &pr.owner, &pr.repository, pr.pr_number)
        .join(".git")
        .exists()
    {
        let _ = on_event.send(AgentEvent::PreparingRepository);
    }

    let (owner, repository, pr_number) = (pr.owner.clone(), pr.repository.clone(), pr.pr_number);
    let (cwd, env) = tokio::task::spawn_blocking(move || -> anyhow::Result<_> {
        let mut cwd = git::worktree_dir(&repositories_dir, &owner, &repository, pr_number);
        if !cwd.join(".git").exists() {
            cwd = git::prepare_worktree(&repositories_dir, &owner, &repository, pr_number)?;
        }

        Ok((cwd, shell::get_shell_env()?.clone()))
    })
    .await??;

    let (cancel_tx, cancel_rx) = tokio::sync::oneshot::channel();
    state
        .agent_runs
        .lock()
        .unwrap()
        .insert(conversation_id, cancel_tx);

    let options = RunOptions {
        harness: conversation.harness,
        cwd,
        prompt: prompt::user_prompt(&request.prompt, &request.context),
        system_prompt: prompt::system_prompt(
            pr,
            &details.title,
            &details.base_ref,
            &details.prompt_description(),
            &discussion,
        ),
        model: request
            .model
            .or_else(|| state.get_settings().model(conversation.harness)),
        session_id: conversation.session_id,
        env,
    };

    let result = runner::run(
        options,
        |event| {
            let _ = on_event.send(event);
        },
        cancel_rx,
    )
    .await;

    state.agent_runs.lock().unwrap().remove(&conversation_id);
    let outcome = result?;

    if let Some(session_id) = &outcome.session_id {
        state
            .agent_store
            .set_session_id(conversation_id, session_id)
            .await?;
    }

    if outcome.blocks.is_empty() {
        return Ok(());
    }

    let message = state
        .agent_store
        .add_message(conversation_id, Role::Assistant, &outcome.blocks)
        .await?;
    let _ = on_event.send(AgentEvent::Done { message });

    Ok(())
}

#[tauri::command]
pub async fn harness_model(
    state: State<'_, AppState>,
    harness: Option<Harness>,
) -> Result<Option<String>> {
    let settings = state.get_settings();
    let harness = harness.unwrap_or(settings.harness);

    // off the main thread, inferring the default may list models over the network
    let model = tokio::task::spawn_blocking(move || settings.model(harness))
        .await
        .map_err(anyhow::Error::from)?;

    Ok(model)
}

#[tauri::command]
pub async fn list_models(
    state: State<'_, AppState>,
    harness: Option<Harness>,
) -> Result<Vec<Model>> {
    let harness = harness.unwrap_or(state.get_settings().harness);

    // off the main thread, some harnesses list their models over the network
    let models = tokio::task::spawn_blocking(move || harness.adapter().models())
        .await
        .map_err(anyhow::Error::from)?;

    Ok(models)
}

#[tauri::command]
pub fn agent_cancel(state: State<'_, AppState>, conversation_id: i64) {
    if let Some(cancel) = state.agent_runs.lock().unwrap().remove(&conversation_id) {
        let _ = cancel.send(());
    }
}

#[tauri::command]
pub async fn agent_list_conversations(
    state: State<'_, AppState>,
    request: PullRequestKey,
) -> Result<Vec<Conversation>> {
    Ok(state.agent_store.list_conversations(&request).await?)
}

#[tauri::command]
pub async fn agent_messages(
    state: State<'_, AppState>,
    conversation_id: i64,
) -> Result<Vec<AgentMessage>> {
    Ok(state.agent_store.messages(conversation_id).await?)
}

#[tauri::command]
pub async fn agent_delete_conversation(
    state: State<'_, AppState>,
    conversation_id: i64,
) -> Result<()> {
    agent_cancel(state.clone(), conversation_id);
    state
        .agent_store
        .delete_conversation(conversation_id)
        .await?;

    Ok(())
}
