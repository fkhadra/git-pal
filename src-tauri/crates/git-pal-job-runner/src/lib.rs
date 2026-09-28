use std::{
    collections::HashMap,
    sync::{Arc, Mutex, OnceLock},
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tokio::sync::watch::{self, Sender, error};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "jobs.ts")]
pub enum JobKind {
    Review,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "jobs.ts")]
pub enum JobStatus {
    Queued,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "jobs.ts")]
pub struct Job {
    pub job_id: String,
    pub kind: JobKind,
    pub name: String,
    pub status: JobStatus,
    pub payload: Option<serde_json::Value>,
    pub started_at: u128,
    pub updated_at: Option<u128>,
    pub error: Option<String>,
    #[serde(skip)]
    #[ts(skip)]
    cancel: Sender<()>,
}

type EventCallback = Box<dyn Fn(Job) + Send + Sync>;

pub struct JobRunner {
    jobs: Arc<Mutex<HashMap<String, RecurringJob>>>,
    tasks: Arc<Mutex<HashMap<String, Job>>>,
    emit_event: Arc<OnceLock<EventCallback>>,
}

struct RecurringJob {
    kill_sig: Sender<()>,
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis()
}

fn emit(emit_event: &OnceLock<EventCallback>, job: &Job) {
    if let Some(callback) = emit_event.get() {
        callback(job.clone());
    }
}

/// Notifies listeners of the final state then forgets the task, failures are kept by the caller.
fn finish_task(
    tasks: &Mutex<HashMap<String, Job>>,
    emit_event: &OnceLock<EventCallback>,
    id: &str,
    update: impl FnOnce(&mut Job),
) {
    update_task(tasks, emit_event, id, update);
    tasks.lock().unwrap().remove(id);
}

/// Updates a task then notifies listeners.
fn update_task(
    tasks: &Mutex<HashMap<String, Job>>,
    emit_event: &OnceLock<EventCallback>,
    id: &str,
    update: impl FnOnce(&mut Job),
) {
    let mut tasks = tasks.lock().unwrap();
    let Some(task) = tasks.get_mut(id) else {
        return;
    };

    update(task);
    task.updated_at = Some(now_millis());
    emit(emit_event, task);
}

impl JobRunner {
    pub fn new() -> Self {
        JobRunner {
            jobs: Arc::new(Mutex::new(HashMap::new())),
            tasks: Arc::new(Mutex::new(HashMap::new())),
            emit_event: Arc::new(OnceLock::new()),
        }
    }

    /// Sets the callback notified on every task status change. Only the first call is kept.
    pub fn set_emitter<F>(&self, emit_event: F)
    where
        F: Fn(Job) + Send + Sync + 'static,
    {
        let _ = self.emit_event.set(Box::new(emit_event));
    }

    pub fn start_job<F, Fut>(&self, job_name: String, interval: std::time::Duration, callback: F)
    where
        F: Fn() -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = ()> + Send + 'static,
    {
        let sig = Sender::new(());
        let mut rx = sig.subscribe();
        let mut int = tokio::time::interval(interval);

        self.jobs
            .lock()
            .unwrap()
            .insert(job_name, RecurringJob { kill_sig: sig });

        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = rx.changed() => {
                        break;
                    }
                    _ = int.tick() => {
                        callback().await;
                    }
                }
            }
        });
    }

    pub fn stop_job(&self, job_name: &str) -> Result<(), error::SendError<()>> {
        if let Some(j) = self.jobs.lock().unwrap().remove(job_name) {
            j.kill_sig.send(())?;
        }
        Ok(())
    }

    /// Spawns a one-off task with lifecycle event tracking.
    pub fn run<F, Fut>(&self, job_id: String, name: String, kind: JobKind, task: F)
    where
        F: FnOnce() -> Fut + Send + 'static,
        Fut: std::future::Future<Output = Result<serde_json::Value, String>> + Send + 'static,
    {
        let (cancel_tx, mut cancel_rx) = watch::channel(());

        let job = Job {
            job_id: job_id.clone(),
            kind,
            name,
            status: JobStatus::Queued,
            payload: None,
            started_at: now_millis(),
            updated_at: None,
            error: None,
            cancel: cancel_tx,
        };

        emit(&self.emit_event, &job);
        self.tasks.lock().unwrap().insert(job_id.clone(), job);

        let tasks = self.tasks.clone();
        let emit_event = self.emit_event.clone();

        tokio::spawn(async move {
            update_task(&tasks, &emit_event, &job_id, |t| {
                t.status = JobStatus::Running;
            });

            let result = tokio::select! {
                _ = cancel_rx.changed() => {
                    finish_task(&tasks, &emit_event, &job_id, |t| {
                        t.status = JobStatus::Cancelled;
                    });
                    return;
                }
                result = task() => result,
            };

            match result {
                Ok(value) => finish_task(&tasks, &emit_event, &job_id, |t| {
                    t.status = JobStatus::Completed;
                    t.payload = Some(value);
                }),
                Err(err) => {
                    log::error!("Job error: {err}");
                    finish_task(&tasks, &emit_event, &job_id, |t| {
                        t.status = JobStatus::Failed;
                        t.error = Some(err);
                    });
                }
            }
        });
    }

    pub fn cancel(&self, job_id: &str) -> bool {
        match self.tasks.lock().unwrap().get(job_id) {
            Some(task) => task.cancel.send(()).is_ok(),
            None => false,
        }
    }

    pub fn status(&self, job_id: &str) -> Option<JobStatus> {
        self.tasks
            .lock()
            .unwrap()
            .get(job_id)
            .map(|t| t.status.clone())
    }

    pub fn tasks(&self) -> Vec<Job> {
        self.tasks.lock().unwrap().values().cloned().collect()
    }
}
