# Getting started

## Sign in

The first launch opens the welcome window.

1. Click **Continue with GitHub**. Your browser opens GitHub's authorization page.
2. Authorize Git Pal. GitHub sends you back to the app.

Git Pal asks for the `repo`, `read:org`, `gist`, `read:user` and `user:email` scopes.

### Use a personal access token

Prefer a token? Click **Use a token** under the sign-in button.

1. Click **Create Token**. GitHub opens with the required scopes already selected.
2. Generate the token, paste it in the field and click **Submit**.

:::warning
Git Pal talks to `github.com`. Self-hosted GitHub Enterprise Server isn't supported yet.
:::

## Open Git Pal from anywhere

Once signed in, press the global shortcut to open the command palette:

| macOS | Windows | Linux |
| --- | --- | --- |
| <kbd>⌘</kbd> <kbd>G</kbd> | <kbd>Ctrl</kbd> <kbd>Win</kbd> <kbd>G</kbd> | <kbd>Ctrl</kbd> <kbd>G</kbd> |

You can change it in [Settings > Shortcuts](./settings#shortcuts).

Git Pal lives in your menu bar (the system tray on Windows and Linux). It has no Dock icon until you open the review or settings window. Launching it again simply shows the palette.

## Your first review

1. Press the global shortcut and pick a pull request, for example from **Review Requested**.
2. Press <kbd>⌘</kbd> <kbd>↵</kbd> (<kbd>Ctrl</kbd> <kbd>↵</kbd>) to have an agent review it.
3. The review window opens. Comments land in the diff once the agent is done.
4. Keep the comments you agree with, add your own, then **Submit review**.

Read on:

- [Command palette](./command-palette): search pull requests, repositories and code.
- [Code review](./code-review): AI reviews, notes, templates and the agent chat.
- [Settings](./settings): harness, notifications, themes, shortcuts and scope.
