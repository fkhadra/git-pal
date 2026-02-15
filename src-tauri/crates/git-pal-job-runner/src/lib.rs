use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};
use tokio::sync::watch::{Sender, error};

pub struct JobRunner {
    jobs: Arc<Mutex<HashMap<String, Job>>>,
}

struct Job {
    kill_sig: Sender<()>,
}

impl JobRunner {
    pub fn new() -> Self {
        JobRunner {
            jobs: Arc::new(Mutex::new(HashMap::new())),
        }
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
            .insert(job_name, Job { kill_sig: sig });

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
}
