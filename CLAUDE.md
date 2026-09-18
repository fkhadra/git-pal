# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Git Pal is a Tauri v2 desktop application for GitHub productivity. It provides a command palette interface for quickly accessing GitHub pull requests, repositories, and workflows.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS 4
- **Backend**: Rust (Tauri 2), with workspace crates for GitHub API and settings
- **State Management**: Valtio, TanStack Query
- **UI**: shadcn/ui on the **Base UI** base, cmdk (command palette), Lucide icons

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
pnpm typecheck
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
├── components/
│   ├── ui/             # shadcn registry components (managed by the CLI)
│   └── form/           # app-owned form components
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

- **Path alias**: Use `~/` for imports from `src/` (e.g., `import { Button } from "~/components/ui/button"`)
- **Tauri commands**: Frontend calls `invoke()` via `src/commands.ts`, backend handlers in `src-tauri/src/commands.rs`
- **Type generation**: Types in `src/models/` are generated from Rust using ts-rs
- **Views**: App has three views (`palette`, `settings`, `setup`) controlled by `globalThis.currentView`
- **GitHub API**: Uses both GraphQL (`query.graphql`) and REST APIs via `git-pal-github` crate

## UI Components (shadcn/ui)

`src/components/ui/` is owned by the shadcn CLI. Everything else under
`src/components/` is app-owned and the CLI never touches it.

```bash
pnpm ui add <component>            # add or re-sync a component
pnpm ui add <component> --dry-run  # preflight: files and deps that would change
pnpm ui add <component> --diff     # show local deltas vs the registry
pnpm typecheck                     # always run right after an add
```

The CLI is pinned as a devDependency so it always matches the `shadcn/tailwind.css`
that `src/style.css` imports. Use `pnpm ui`, not `pnpm dlx shadcn@latest`.

**Never run `shadcn init`** — `components.json` is hand-maintained. `init` would
rewrite `src/style.css` (losing the Satoshi import, `--body-bg`, and the
transparent-window rules).

- The base is **Base UI, not Radix** (`"style": "base-nova"`). Use Base UI's
  `render={<Button />}` prop, never Radix's `asChild`.
- `cn` comes from the `cn` package: `import { cn } from "cn"`. `clsx`,
  `tailwind-merge` and `tailwind-variants` are not dependencies.
- `aliases.utils` points at `~/libs/cn`, **not** `~/libs/utils` — the latter holds
  app helpers (`themeSwitcher`, `nil`, `withDelay`) and must never be a registry
  write target.
- Generated files carry deliberate local deltas so the app looks unchanged. Biggest
  ones: `ui/command.tsx` (gradient selected state, plus a `pointer-events-none`
  item with a click overlay so mouse hover does not fight keyboard nav),
  `ui/button.tsx` (size scale sits one notch above upstream), `ui/tooltip.tsx`
  (bespoke SVG arrow), `ui/dialog.tsx` (app dialog skin). Re-apply after any
  `--overwrite`.
- `--radius` is `0.5rem` so the derived `--radius-*` scale matches Tailwind's
  defaults exactly.
- Import components directly (`~/components/ui/button`). There is no barrel.

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
