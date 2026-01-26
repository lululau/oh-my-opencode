# Search Default Directory Fix

## Problem Summary
- When using oh-my-opencode with OpenCode Desktop, the plugin's search tools (grep/glob/ast-grep) defaulted to `"."`.
- In the Desktop process, `process.cwd()` can be the filesystem root (`/`), so `"."` becomes `/`.
- This caused `rg`, `find`, and `ast-grep` to scan the entire system, spiking CPU usage.
- OpenCode's built-in tools resolve search roots from `Instance.directory` (project root) before invoking ripgrep, so they stay scoped to the project.

## Root Cause
oh-my-opencode's tool implementations used relative `"."` or user-provided paths without anchoring them to the project directory. In Desktop, the process working directory is not guaranteed to be the project root.

## Fix Overview
1. Introduced a shared default directory helper that stores the project root from plugin init (`ctx.directory`).
2. Updated grep/glob/ast-grep tool implementations to resolve missing or relative paths against that default directory and pass absolute paths to their CLIs.

## Code Changes
- Added `src/shared/default-directory.ts` with `setDefaultDirectory`, `getDefaultDirectory`, and `resolveDefaultDirectoryPath`.
- Set default directory during plugin initialization in `src/index.ts`.
- Resolved paths in:
  - `src/tools/grep/tools.ts`
  - `src/tools/glob/tools.ts`
  - `src/tools/ast-grep/tools.ts`

## Behavior After Fix
- If the tool call omits `path`/`paths`, searches default to the project root (`ctx.directory`).
- If `path`/`paths` are relative, they are resolved against the project root.
- If `path`/`paths` are absolute, they are used as-is.

## Notes
This aligns oh-my-opencode search tools with OpenCode’s own behavior, which scopes search to the active project directory rather than the process working directory.
