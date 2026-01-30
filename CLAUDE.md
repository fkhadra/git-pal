# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Git Pal is a Tauri v2 desktop application for GitHub productivity. It provides a command palette interface for quickly accessing GitHub pull requests, repositories, and workflows.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS 4
- **Backend**: Rust (Tauri 2), with workspace crates for GitHub API and settings
- **State Management**: Valtio, TanStack Query
- **UI**: Base UI (Radix), cmdk (command palette), Lucide icons

## Development Commands

```bash
# Install dependencies
pnpm install

# Run in development mode (starts both Vite and Tauri)
pnpm tauri dev

# Build for production
pnpm tauri build

# Frontend only (without Tauri)
pnpm dev

# Type check
pnpm build  # runs tsc && vite build
```

## Project Structure

```
src/                    # React frontend
├── features/
│   ├── palette/        # Main command palette UI (HomePage, PullRequestsPage, etc.)
│   ├── settings/       # Settings page components
│   ├── setup/          # Initial auth/setup flow
│   └── shared/         # Shared context (AppContext)
├── components/         # Reusable UI components
├── models/             # TypeScript types (generated from ts-rs)
├── commands.ts         # Tauri invoke wrappers
└── App.tsx             # Main app with view routing

src-tauri/              # Rust backend
├── src/
│   ├── lib.rs          # Tauri app setup, plugins, tray menu
│   ├── commands.rs     # Tauri command handlers
│   ├── window.rs       # Window management
│   └── core/           # App state, vault (keyring), notifications
├── crates/
│   ├── git-pal-github/ # GitHub API client (GraphQL + REST)
│   └── git-pal-settings/ # Settings persistence (redb)
└── Cargo.toml          # Workspace root
```

## Key Patterns

- **Path alias**: Use `~/` for imports from `src/` (e.g., `import { Button } from "~/components"`)
- **Tauri commands**: Frontend calls `invoke()` via `src/commands.ts`, backend handlers in `src-tauri/src/commands.rs`
- **Type generation**: Types in `src/models/` are generated from Rust using ts-rs
- **Views**: App has three views (`palette`, `settings`, `setup`) controlled by `globalThis.currentView`
- **GitHub API**: Uses both GraphQL (`query.graphql`) and REST APIs via `git-pal-github` crate

## Rust Workspace

The Rust backend uses a Cargo workspace with these crates:
- `git-pal-github`: GitHub API client with OAuth, GraphQL queries, and REST endpoints
- `git-pal-settings`: Settings persistence using redb (embedded database)
- `git-pal-codegen`: Code generation utilities

## Tauri Plugins in Use

- `tauri-plugin-single-instance`: Prevents multiple app instances
- `tauri-plugin-deep-link`: Handles OAuth callbacks
- `tauri-plugin-autostart`: Launch on login
- `tauri-plugin-updater`: Auto-updates
- `tauri-plugin-global-shortcut`: System-wide keyboard shortcut
- `tauri-plugin-log`: File logging
- `keyring`: Secure token storage (system keychain)
