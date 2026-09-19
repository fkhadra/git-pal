<div align="center">
  <img src="download-page/assets/logo.png" alt="Git Pal" width="128" height="128" />
  <h1>Git Pal</h1>
  <p><strong>Git in your flow, not in your way</strong></p>
  <p>A beautiful command palette for GitHub. Quickly access your pull requests, repositories, and workflows without leaving your keyboard.</p>

  <div>
    <img alt="Active Development" src="https://img.shields.io/badge/%E2%9A%A1-Active%20Development-yellow?style=flat-square" />
    <img alt="Platform" src="https://img.shields.io/badge/platform-macOS-blue?style=flat-square" />
    <img alt="Built with Tauri" src="https://img.shields.io/badge/built%20with-Tauri%20v2-orange?style=flat-square" />
    <img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  </div>
</div>

<br />

<p align="center">
  <img src="download-page/assets/home.png" alt="Git Pal command palette" width="700" />
</p>

## Features

### Pull Requests & Mentions

See review requests and mentions in one centralized place.

<p align="center">
  <img src="download-page/assets/mentioned.png" alt="Pull requests and mentions" width="700" />
</p>

### Repository Browser

Browse your repositories and organizations.

<p align="center">
  <img src="download-page/assets/repository.png" alt="Repository browser" width="700" />
</p>

### Code Search

Search code across your repositories powered by GitHub's search. Scope searches to a specific organization or repository.

<p align="center">
  <img src="download-page/assets/code-search.png" alt="Code search" width="700" />
</p>

### GitHub Integration

Seamless OAuth authentication with support for GitHub Enterprise via personal access tokens.

<p align="center">
  <img src="download-page/assets/login-screen.png" alt="GitHub authentication" width="700" />
</p>

### More

- **Global shortcut** — Summon the palette from anywhere with a keyboard shortcut (default `Cmd+G`, configurable)
- **Workflow runner** — List and trigger GitHub Actions workflows with custom inputs
- **Auto-updates** — Get notified when a new version is available
- **Launch on login** — Optionally start Git Pal when your system boots
- **Secure** — OAuth tokens stored in the system keychain. Settings stored locally at `~/.config/git-pal`. No telemetry

## Installation

Download the latest [installer](https://gitpal.pushpull.sh/), open it, and drag Git Pal into your Applications folder.

| Platform | Status |
|----------|--------|
| macOS | ✅ |
| Windows | ✅ |
| Linux | Coming soon |

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/)
- Tauri v2 [system dependencies](https://v2.tauri.app/start/prerequisites/)

### Getting started

```bash
# Install dependencies
pnpm install

# Run in development mode (starts both Vite dev server and Tauri)
pnpm tauri dev

# Build for production
pnpm tauri build
```

## FAQ

**Why does it ask for my password on the first launch?**
Git Pal stores the OAuth token in the system keychain. macOS requires your password to authorize keychain access on first use.

**Does it support GitHub Enterprise?**
Yes — connect using a personal access token (PAT).

**Is my data secure?**
All data stays on your machine. Settings are stored locally at `~/.config/git-pal`, tokens live in the system keychain, and there is no telemetry.

## License

MIT
