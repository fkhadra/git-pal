use std::env;
use std::sync::LazyLock;
use std::{collections::HashMap, process::Command};

use anyhow::{Context, Result, anyhow};

static SHELL_ENV: LazyLock<Result<HashMap<String, String>>> = LazyLock::new(load_shell_env);

pub fn get_shell_env() -> Result<&'static HashMap<String, String>> {
    SHELL_ENV.as_ref().map_err(|e| anyhow!("{e}"))
}

pub fn get_default_shell() -> String {
    env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string())
}

fn load_shell_env() -> Result<HashMap<String, String>> {
    let shell = get_default_shell();

    let stdout = Command::new(&shell)
        .args(["-ilc", "env"])
        .output()
        .context("Failed to retrieve env variables")?
        .stdout;

    let output = String::from_utf8_lossy(&stdout);

    let envs: HashMap<String, String> = output
        .lines()
        .filter_map(|line| {
            let (key, value) = line.split_once('=')?;
            Some((key.to_string(), value.to_string()))
        })
        .collect();

    Ok(envs)
}
