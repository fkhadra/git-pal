use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Result, anyhow, bail};

pub fn prepare_worktree(
    repositories_dir: &Path,
    owner: &str,
    repo: &str,
    pr_number: i64,
) -> Result<PathBuf> {
    let bare_dir = ensure_bare_repo(repositories_dir, owner, repo)?;
    let pr_ref = fetch_pull_request(&bare_dir, pr_number)?;
    let worktree_dir = worktree_dir(repositories_dir, owner, repo, pr_number);

    if worktree_dir.join(".git").exists() {
        let wk = worktree_dir.to_string_lossy();
        let output = Command::new("git")
            .args(["-C", &wk, "checkout", "--detach", &pr_ref])
            .output()?;

        if !output.status.success() {
            remove_worktree(&bare_dir, &worktree_dir)?;
            add_worktree(&bare_dir, &worktree_dir, &pr_ref)?;
        } else {
            let output = Command::new("git")
                .args(["-C", &wk, "reset", "--hard", &pr_ref])
                .output()?;
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                bail!("git reset in worktree failed: {stderr}");
            }
        }
    } else {
        add_worktree(&bare_dir, &worktree_dir, &pr_ref)?;
    }

    Ok(worktree_dir)
}

/// Diff of a pull request out of the bare clone, leaving review worktrees untouched.
pub fn pull_request_diff(
    repositories_dir: &Path,
    owner: &str,
    repo: &str,
    pr_number: i64,
    base_ref: &str,
    head_sha: &str,
) -> Result<String> {
    let bare_dir = ensure_bare_repo(repositories_dir, owner, repo)?;
    fetch_pull_request(&bare_dir, pr_number)?;

    // from the merge base, like GitHub; prefixes and paths as `parseDiff` expects
    let output = Command::new("git")
        .args([
            "-C",
            &bare_dir.to_string_lossy(),
            "-c",
            "core.quotepath=false",
            "diff",
            "--no-color",
            "--no-ext-diff",
            "--src-prefix=a/",
            "--dst-prefix=b/",
            &format!("refs/heads/{base_ref}...{head_sha}"),
        ])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("git diff of pull request #{pr_number} failed: {stderr}");
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

/// Whether `sha` is still in the history of the worktree's HEAD, false once force-pushed away.
pub fn is_ancestor(worktree_dir: &Path, sha: &str) -> Result<bool> {
    let status = Command::new("git")
        .args([
            "-C",
            &worktree_dir.to_string_lossy(),
            "merge-base",
            "--is-ancestor",
            sha,
            "HEAD",
        ])
        .status()?;

    Ok(status.success())
}

pub fn worktree_dir(repositories_dir: &Path, owner: &str, repo: &str, pr_number: i64) -> PathBuf {
    repositories_dir
        .join(owner)
        .join(repo)
        .join(pr_number.to_string())
}

pub fn bare_dir(repositories_dir: &Path, owner: &str, repo: &str) -> PathBuf {
    repositories_dir.join(owner).join(format!("{repo}.git"))
}

/// Fetches the PR head from GitHub's `pull/{n}/head` ref, which also covers forks and deleted branches.
fn fetch_pull_request(bare_dir: &Path, pr_number: i64) -> Result<String> {
    let pr_ref = format!("refs/pull/{pr_number}/head");
    let output = Command::new("git")
        .args([
            "-C",
            &bare_dir.to_string_lossy(),
            "fetch",
            "origin",
            &format!("+{pr_ref}:{pr_ref}"),
        ])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("git fetch of pull request #{pr_number} failed: {stderr}");
    }

    Ok(pr_ref)
}

fn clone_bare(bare_dir: &Path, owner: &str, repo: &str) -> Result<()> {
    fs::create_dir_all(bare_dir.parent().unwrap_or(bare_dir))?;
    let url = format!("https://github.com/{owner}/{repo}.git");
    clone(&["--bare"], &url, bare_dir).map_err(|e| anyhow!("git clone --bare failed: {e}"))
}

/// HTTPS first, SSH fallback for github.com.
fn clone(args: &[&str], url: &str, dest: &Path) -> Result<()> {
    let https_err = match run_clone(args, url, dest) {
        Ok(()) => return Ok(()),
        Err(e) => e,
    };

    let Some(ssh_url) = github_ssh_url(url) else {
        return Err(https_err);
    };

    log::warn!("HTTPS clone of {url} failed, retrying over SSH");
    run_clone(args, &ssh_url, dest).map_err(|ssh_err| anyhow!("{https_err}\nSSH: {ssh_err}"))
}

fn run_clone(args: &[&str], url: &str, dest: &Path) -> Result<()> {
    let output = Command::new("git")
        .env("GIT_TERMINAL_PROMPT", "0")
        .arg("clone")
        .args(args)
        .arg(url)
        .arg(dest)
        .output()?;

    if !output.status.success() {
        bail!("{}", String::from_utf8_lossy(&output.stderr).trim());
    }
    Ok(())
}

fn github_ssh_url(url: &str) -> Option<String> {
    url.strip_prefix("https://github.com/")
        .map(|path| format!("git@github.com:{path}"))
}

fn add_worktree(bare_dir: &Path, worktree_dir: &Path, branch: &str) -> Result<()> {
    fs::create_dir_all(worktree_dir.parent().unwrap_or(worktree_dir))?;
    let output = Command::new("git")
        .args([
            "-C",
            &bare_dir.to_string_lossy(),
            "worktree",
            "add",
            &worktree_dir.to_string_lossy(),
            branch,
            "--detach",
        ])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("git worktree add failed: {stderr}");
    }
    Ok(())
}

pub fn remove_worktree(bare_dir: &Path, worktree_dir: &Path) -> Result<()> {
    let output = Command::new("git")
        .args([
            "-C",
            &bare_dir.to_string_lossy(),
            "worktree",
            "remove",
            "--force",
            &worktree_dir.to_string_lossy(),
        ])
        .output();

    // the folder is still deleted below, git's record of it stays until pruned
    match output {
        Ok(output) if !output.status.success() => log::warn!(
            "git worktree remove failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ),
        Err(e) => log::warn!("git worktree remove failed to run: {e}"),
        Ok(_) => {}
    }

    if worktree_dir.exists() {
        fs::remove_dir_all(worktree_dir)?;
    }
    Ok(())
}

/// Whether the repository's bare clone exists, otherwise the next diff or review clones it.
pub fn is_cloned(repositories_dir: &Path, owner: &str, repo: &str) -> bool {
    bare_dir(repositories_dir, owner, repo)
        .join("HEAD")
        .exists()
}

/// Ensures a bare repository exists and is up to date (including tags).
pub fn ensure_bare_repo(repositories_dir: &Path, owner: &str, repo: &str) -> Result<PathBuf> {
    let bare_dir = bare_dir(repositories_dir, owner, repo);

    if bare_dir.join("HEAD").exists() {
        let output = Command::new("git")
            .args([
                "-C",
                &bare_dir.to_string_lossy(),
                "fetch",
                "origin",
                "+refs/heads/*:refs/heads/*",
                "--tags",
                "--force",
            ])
            .output()?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log::warn!("git fetch failed, re-cloning bare: {stderr}");
            fs::remove_dir_all(&bare_dir)?;
            clone_bare(&bare_dir, owner, repo)?;
        }
    } else {
        clone_bare(&bare_dir, owner, repo)?;
    }

    Ok(bare_dir)
}
