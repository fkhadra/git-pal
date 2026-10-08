# Installation

Download the installer for your platform from the [latest release](https://github.com/fkhadra/git-pal/releases/latest). Once installed, Git Pal [updates itself](./tray-and-updates#updates).

## macOS

1. Download the `.dmg`: `aarch64` for Apple Silicon, `x64` for Intel.
2. Open it and drag Git Pal into your Applications folder.

The first time Git Pal reads its token, macOS may ask for your password to unlock the keychain.

## Windows

Download the `-setup.exe` (or the `.msi`) and run it.

## Linux

Download the package for your distribution:

| Distribution | Install |
| --- | --- |
| Debian, Ubuntu | `sudo apt install ./Git.Pal_*_amd64.deb` |
| Fedora, RHEL | `sudo dnf install ./Git.Pal-*.x86_64.rpm` |
| Other | `chmod +x` the `.AppImage`, then run it |

Git Pal stores your token through the Secret Service API. A keyring such as GNOME Keyring or KWallet must be running.

## AI reviews

AI reviews run a coding agent installed on your machine. Install at least one and make sure its command is on your `PATH`:

| Harness | Command |
| --- | --- |
| Claude Code | `claude` |
| Codex | `codex` |
| Cursor | `cursor-agent` |
| Antigravity | `agy` |
| OpenCode | `opencode` |

Everything else works without one.

## Where Git Pal keeps its files

Everything lives in `~/.config/git-pal`, on every platform:

| Path | Content |
| --- | --- |
| `settings.json` | Your settings |
| `git-pal.db` | Reviews, templates, agent chats and viewed files |
| `git-pal.log` | Logs |
| `repositories/` | Clones and one worktree per reviewed pull request |

Your GitHub token is not in this folder, it's in your system's credential store.
