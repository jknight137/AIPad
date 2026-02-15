# Codex Roadmap: AIPad to Daily-Driver Productivity

## Product Goal
Build a reliable, AI-powered note-taking and execution system that supports capture -> plan -> schedule -> do -> review, with strong task tracking and integrations to external tools.

## Review Findings (Prioritized)

### P0 - Functional/Correctness Defects
1. Broken AI chat helper in store (type and runtime mismatch).
- `src/lib/stores/ollama.ts:72` calls `m.chat(model, messages as any)` but service expects an options object.
- `src/lib/stores/ollama.ts:74` reads `result.message?.content` even though `chat()` returns an `OllamaMessage`.
- `npm run check` currently fails on this.

2. Encryption service has TypeScript API mismatches.
- `src/lib/services/encryption.ts:40` and `src/lib/services/encryption.ts:85` use `ArrayBuffer` signatures with `Uint8Array` values.
- `npm run check` reports crypto typing errors in this file.

3. Terminal mount lifecycle is typed incorrectly and currently fails check.
- `src/lib/components/terminal/TerminalView.svelte:35` uses `onMount(async () => ...)` with async return cleanup, which Svelte typing rejects.

4. Todo status typing and transitions are inconsistent.
- `src/lib/components/productivity/TodosView.svelte:115` and `src/lib/components/productivity/TodosView.svelte:127` pass raw `string` to typed setters.
- `src/lib/stores/todos.ts:114` sets `completed_at` on done; returning to inbox via `setStatus` in UI does not clear `completed_at`.

### P1 - Security and Safety Risks
1. Broad shell permissions with permissive config.
- `src-tauri/capabilities/default.json:8`-`src-tauri/capabilities/default.json:12` grants spawn/execute/stdin/kill/open.
- `src-tauri/tauri.conf.json:46` enables shell open globally.

2. CSP disabled.
- `src-tauri/tauri.conf.json:27` has `"csp": null`.

3. AI tool execution guardrails are weak.
- `src/lib/components/terminal/TerminalView.svelte:126` executes `run_command` tool calls directly from model output.
- `src/lib/services/ollama.ts:205` prompt says ask before destructive actions, but no enforcement layer exists.

### P1 - UX/Product Gaps vs Goal
1. Keyboard shortcut hints do not match actual behavior.
- Actual mapping is numeric in `src/App.svelte:50`-`src/App.svelte:59`.
- Sidebar shows letter shortcuts in `src/lib/components/layout/Sidebar.svelte:16`-`src/lib/components/layout/Sidebar.svelte:25`.

2. Ollama endpoint setting is not wired.
- URL input is present in `src/lib/components/settings/SettingsView.svelte:82`.
- Reconnect only calls health check (`src/lib/components/settings/SettingsView.svelte:24`) and never calls `setOllamaBaseUrl` (`src/lib/services/ollama.ts:11`).

3. Calendar mode switch is cosmetic.
- UI toggles month/week/day at `src/lib/components/calendar/CalendarView.svelte:105`.
- Rendering remains month grid (`src/lib/components/calendar/CalendarView.svelte:112`) regardless of selected mode.

4. PTY resize command is stubbed.
- `src-tauri/src/lib.rs:116`-`src-tauri/src/lib.rs:123` acknowledges resize is not implemented.

### P2 - Reliability and Maintainability
1. Potential in-place mutation in derived notes list.
- `src/lib/stores/notes.ts:22` sorts `$notes` in place.

2. Vault writes are not awaited; errors can be dropped.
- `src/lib/stores/vault.ts:79`, `src/lib/stores/vault.ts:92`, `src/lib/stores/vault.ts:101` call `saveVault(...)` inside store updates without awaiting.

3. Pomodoro session insertion is fire-and-forget.
- `src/lib/stores/pomodoro.ts:64` calls `execute(...)` without await/error handling.

4. Repository hygiene gaps.
- No `.gitignore` found at project root.
- No test scripts in `package.json:6`-`package.json:12`.

## Implementation Plan

## Phase 1: Stabilize Core (P0)
### 1.1 Fix typecheck blockers
- Refactor `chatWithOllama` to call service correctly with `chat({ model, messages, stream: false })`.
- Return assistant content directly from `OllamaMessage.content`.
- Fix encryption helpers to consistently accept/return `Uint8Array` and only convert to/from `ArrayBuffer` where required.
- Refactor terminal setup so `onMount` is synchronous and async work is invoked internally with explicit cleanup handling.
- Normalize select handlers in todos with typed casts/guards.

### 1.2 Correct state transitions
- Ensure `completed_at` is cleared when moving done -> non-done status.
- Add regression checks for status transitions and serialization.

### Phase 1 Exit Criteria
- `npm run check` passes with 0 errors.
- `npm run build` passes.
- Todo done/undo behavior is consistent in UI and DB.

## Phase 2: Security + Safety Hardening (P1)
### 2.1 Reduce shell attack surface
- Scope shell permissions in `src-tauri/capabilities/default.json` to minimum required commands.
- Revisit/remove `"shell": { "open": true }` unless strictly needed.
- Add command allowlist and explicit denylist for destructive patterns in backend command executor path.

### 2.2 AI tool-call confirmation policy
- Implement required confirmation UI before executing risky tool calls (`rm`, overwrite, recursive delete, etc.).
- Add deterministic policy function independent from model prompt text.

### 2.3 Desktop security baseline
- Define and apply explicit CSP in `tauri.conf.json`.
- Document threat model for local AI + terminal features.

### Phase 2 Exit Criteria
- Tool calls are policy-gated.
- High-risk shell operations require user confirmation.
- Security settings documented and enforced in config.

## Phase 3: Product Coherence for Daily Driver (P1)
### 3.1 Fix settings wiring
- Connect settings endpoint input to `setOllamaBaseUrl(...)`.
- Persist endpoint, model, and connectivity diagnostics.

### 3.2 Calendar/time-management completion
- Implement real `week` and `day` views with shared source of truth.
- Implement PTY resize end-to-end.
- Add friction-free time-block creation from todo items.

### 3.3 Navigation and UX consistency
- Align displayed shortcuts with real bindings (or vice versa).
- Add command palette / quick capture from anywhere.

### Phase 3 Exit Criteria
- View toggles produce distinct working layouts.
- External endpoint changes immediately affect AI calls.
- Shortcut docs and behavior match.

## Phase 4: "Best Time Management + Organization" Layer
### 4.1 Unified productivity model
- Introduce canonical entities:
- Task, Project, Goal, Context, TimeBlock, Routine, ReferenceNote.
- Add bidirectional links:
- Note <-> Task, Task <-> CalendarBlock, Task <-> ExternalToolItem.

### 4.2 Planning workflows
- Daily planning screen:
- Inbox triage, top 3 outcomes, schedule focus blocks, risk list.
- Weekly review:
- Carryover analysis, completion trends, WIP limits, backlog grooming.

### 4.3 AI copilot workflows
- AI-assisted task decomposition from notes and dumps.
- Deadline risk detection and proactive scheduling suggestions.
- Context-aware prioritization (importance, urgency, effort, energy window).

### Phase 4 Exit Criteria
- End-to-end flow supports daily and weekly cadence without tool-switching.
- AI suggestions are actionable and auditable (user can accept/reject each).

## Phase 5: Integrations and Mapping to Other Tools
### 5.1 Integration architecture
- Add connector interface and sync engine:
- `source`, `external_id`, `sync_state`, `last_synced_at`, conflict policy.

### 5.2 First connectors (pragmatic sequence)
1. Google Calendar / Outlook Calendar (events + time blocks).
2. GitHub issues / Linear / Jira (task mapping).
3. Slack/Email capture hooks (inbox ingestion).

### 5.3 Reliability for sync
- Idempotent upserts, retry queue, conflict resolution UI, per-connector toggles.

### Phase 5 Exit Criteria
- User can map todos to at least one external task system and one calendar provider.
- Sync failures are visible and recoverable.

## Phase 6: Quality System and Release Readiness
### 6.1 Testing and tooling
- Add `vitest` + unit tests for stores/services.
- Add integration tests for DB migrations and key workflows.
- Add minimal Playwright smoke tests for critical UI paths.
- Add lint/format scripts and CI pipeline.

### 6.2 Repo hygiene
- Add `.gitignore` for `node_modules`, `dist`, `src-tauri/target`, local DB/store artifacts, logs.
- Add contribution and release checklist docs.

### Phase 6 Exit Criteria
- CI gates typecheck + tests + build.
- Release process is repeatable with documented checks.

## Suggested Build Order (Immediate)
1. Phase 1.1 + 1.2 in one branch.
2. Phase 2 security hardening before expanding integrations.
3. Phase 3 UX coherence to make daily usage stable.
4. Phase 4 organizational intelligence.
5. Phase 5 connectors.
6. Phase 6 hardening and release automation.

## Current Validation Snapshot
- `npm run check`: failing (8 errors across `ollama.ts`, `encryption.ts`, `TerminalView.svelte`, `TodosView.svelte`).
- `npm run build`: passes; reports empty `charts` chunk and mixed static/dynamic import warning for `ollama.ts`.
