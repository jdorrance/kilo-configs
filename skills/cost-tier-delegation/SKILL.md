---
name: cost-tier-delegation
description: Playbook for continuity-based delegation across primary modes, shared-tree subagents (@fast-worker, @mid-surgeon, @deep-surgeon), and isolated Agent Manager git worktrees. Load only when decomposing multi-step or parallel work.
---

# Continuity-Based Delegation & Parallel Worktree Playbook

Use this playbook when deciding whether to keep work in the current agent, delegate to shared-tree `task` subagents, or use Agent Manager git worktrees.

## 1. Routing, Failover, and Evidence-Based Escalation
- **`options.provider.allow_fallbacks`**: Fails over across hosting providers for the *same* model (with `azure` ignored on OpenAI routes so encrypted reasoning blobs never mix across OpenAI and Azure).
- **`options.models`**: Fails over to alternate models only on request/API errors; omitted on coding workers so they remain strictly pinned to their target model identity.
- **Evidence-Based Escalation**: Escalate (`@fast-worker` -> `@mid-surgeon` -> `@deep-surgeon`, or swap to a fresh model/hypothesis) only when concrete evidence shows an unresolved invariant, conflicting contract, failed verification hypothesis, or scope expanding beyond assigned writable paths—not merely because a file contains async or auth code.

## 2. Continuity-Based Execution vs. Delegation
- **Keep Coherent Loops Together**: Keep an active implementation and verification loop with its current worker while it is making progress.
- **When to Use `code` vs. `code-pinned` (or Direct Terra on `code`)**:
  - Use **`code`** (`typesafe/jev-router`) when you want adaptive model/effort selection across `deepseek-v4.1-flash`, `gpt-6-luna`, `gpt-6.1-terra`, and `gpt-6.1-sol`. Note that `typesafe/jev-router` is opaque to Kilo at request construction time, so Kilo uses generic model prompts/tools rather than model-specific `apply_patch`.
  - Switch to **`code-pinned`** (`gpt-6.1-terra`, configured with native `question`, `suggest`, and `plan_enter` permissions) or select `openrouter/openai/gpt-6.1-terra` directly on `code` when you want known GPT model identity (`apply_patch` + GPT prompt) and single-model prefix cache affinity.
- **Delegate When Work is Separable or Context-Heavy**:
  - Delegate to `@fast-worker` (`deepseek-v4.1-flash`, `reasoning.effort: "low"`), `@mid-surgeon` (`gpt-6.1-terra`), `@deep-surgeon` (`gemini-4-argon`), or `@general` (`gpt-6.1-terra`) when a subtask is independently executable or isolates noisy exploration/test output from the parent transcript.
  - Pass file paths (rather than pasting huge logs) when delegating to `@local-scout` so the parent context stays small.
- **Resume `task_id` on Follow-Ups**: Pass the returned `task_id` back to `task` when iterating on a child agent's work (including when a child hits its `steps` ceiling before verification).

## 3. Choosing the Right Parallel Isolation Mechanism

| Scenario | Recommended Mechanism | Workspace & Git Scope | Coordination & Git Rules |
|---|---|---|---|
| **Tightly coupled subtasks within the current branch** | **`task` Subagents** (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`) | Shared working tree & Git index with parent (separate transcript only) | Assign strictly disjoint writable paths, use `board_post` / `board_read`, and keep `git add` / `git stash` / `git commit` strictly in the parent session |
| **User-requested parallel features or competing implementations** | **Agent Manager Worktrees** (`agent_manager` with `mode: "worktree"`, or `Cmd+Shift+N`) | Isolated `.kilo/worktrees/` checkout, branch, and terminal (runs primary agents like `code` or `code-pinned`) | Coordinate via `agent_manager` (`action: "list"` / `"prompt"`), commits, and the PR diff panel |
| **Parallel read-only discovery** | **Background Scouts** (`@explore`, `@file-picker`, `@local-scout` with `background: true`) | Read-only access to current workspace | Automatic result injection into parent session on completion |
