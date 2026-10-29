---
name: cost-tier-delegation
description: Playbook for continuity-based delegation across primary modes, shared-tree subagents (@doc-summarizer, @file-picker, @local-scout, @fast-worker, @mid-surgeon, @deep-surgeon), and isolated Agent Manager git worktrees. Load only when decomposing multi-step or parallel work.
---

# Continuity-Based Delegation & Parallel Worktree Playbook

Use this playbook when deciding whether to keep work in the current agent, delegate to shared-tree `task` subagents, or use Agent Manager git worktrees.

## 1. Direct Execution vs. Targeted Delegation (Cache Economics First)
- **Why Already-Cached Parent Context Should Stay in the Parent**:
  - Cached input on `openai/gpt-6.1-terra` ($0.05/M tokens) costs almost the same as uncached input on `deepseek/deepseek-v4.1-flash` ($0.045/M tokens). Delegating context the parent has *already* cached saves almost nothing on input while adding orchestration overhead, extra output tokens, and latency.
  - Delegate only when it **prevents the parent from ingesting new bulky material**, isolates an independent noisy subtask, or substitutes a much cheaper end-to-end completion.
- **When to Delegate Discovery & Summarization (Before the Parent Ingests Bulk Source)**:
  - **`@explore`**: Unknown ownership across unfamiliar directories.
  - **`@file-picker`**: When you need a structured inventory of `path:startLine-endLine` spans, verbatim signatures, and callers to partition work across implementation subagents.
  - **`@doc-summarizer`**: Long external library documentation (`context7_*`), web pages (`webfetch` / `websearch`), or lengthy markdown specs/PRDs (callable from `code`, `plan`, and `debug`).
  - **`@local-scout`**: Verbose local build/test logs or large diffs saved to `.kilo/logs/` or `/tmp/` (pass the file path after any deterministic `rg`/`jq` filtering so the parent never ingests the raw log).

## 2. Worker Selection, Same-Tier Resumption & Fresh-Task Escalation
- **Choose the Right Tier Immediately**: Pick the lowest-cost worker (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`, or `@general`) likely to finish cleanly. Skip cheaper tiers immediately when cross-module invariants, subtle concurrency/state requirements, or complex debugging are already evident.
- **Keep Coherent Loops Together**: Keep an active edit/test/verify loop with its current worker while it is making progress. Read current relevant source before the first edit, and reread or expand to callers/types/tests when source may have changed or context is missing.
- **Resume for Same Worker/Model; Start Fresh When Escalating Tier**:
  - Pass the returned `task_id` back to `task` **only** when continuing the same worker and model tier.
  - In Kilo's `task.ts`, a resumed child session's stored model takes precedence over a newly selected subagent's default model. Therefore, when escalating from `@fast-worker` to `@mid-surgeon` or `@deep-surgeon`, **start a new task (omit `task_id`)** and pass the previous findings, failed hypotheses, changed files, and validation evidence in the new brief.

## 3. Choosing the Right Parallel Isolation Mechanism

| Scenario | Recommended Mechanism | Workspace & Git Scope | Coordination & Git Rules |
|---|---|---|---|
| **Tightly coupled subtasks with disjoint files** | **`task` Subagents** (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`, `@general`) | Shared working tree & Git index with parent (separate transcript only) | Assign strictly disjoint writable paths, use `board_post` / `board_read`, and keep `git add` / `git stash` / `git commit` in the parent session |
| **Independent mutations touching shared configs, lockfiles, or overlapping modules** | **Agent Manager Worktrees** (`agent_manager` with `mode: "worktree"`, or `Cmd+Shift+N`) | Isolated `.kilo/worktrees/` checkout, branch, and terminal (runs primary agents like `code`, `code-jev`, or `code-pinned`) | Coordinate via `agent_manager` (`action: "list"` / `"prompt"`), commits, and the PR diff panel |
| **Parallel read-only discovery & doc synthesis** | **Background Scouts** (`@explore`, `@file-picker`, `@doc-summarizer`, `@local-scout` with `background: true`) | Read-only access to current workspace / `.kilo/logs` / `/tmp` | Automatic concise result injection into parent session on completion |
