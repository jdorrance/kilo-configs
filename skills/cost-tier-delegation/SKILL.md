---
name: cost-tier-delegation
description: Playbook for continuity-based delegation across primary modes, shared-tree pinned subagents (@fast-worker, @mid-surgeon, @deep-surgeon), and isolated Agent Manager git worktrees. Load only when decomposing multi-step or parallel work.
---

# Continuity-Based Delegation & Parallel Worktree Playbook

Use this playbook when deciding whether to keep work in the current agent, delegate to shared-tree `task` subagents, or launch isolated Agent Manager git worktrees.

## 1. Distinguishing Routing, Failover, and Quality Escalation
Keep these three mechanisms distinct:
- **`options.provider.allow_fallbacks`**: Fails over across hosting providers (e.g., OpenAI -> Azure) for the *same* model.
- **`options.models`**: Fails over to alternate models only on request/API errors (rate limits, outages, context validation). It never evaluates code quality.
- **Quality Escalation**: Deliberately assigning or reassigning work to a stronger specialist (`@fast-worker` -> `@mid-surgeon` -> `@deep-surgeon`) when evidence shows a scope or capability mismatch or when repeated attempts fail to resolve the same underlying problem.

## 2. Continuity-Based Execution vs. Delegation
- **Keep Coherent Loops Together**: Keep an active implementation and verification loop with its current worker while it is making progress. Do not interrupt a working loop purely because it crossed an arbitrary turn count; delegation carries handoff, context-rebuild, and verification overhead.
- **When to Use `code` vs. `code-pinned`**:
  - Use **`code`** (`typesafe/jev-router`) when you want adaptive model/effort selection across varied turns. Note that `plugins[].models` and `cost_tier` act as routing preferences (while `excluded_models` is strictly enforced).
  - Switch to **`code-pinned`** (`gpt-6.1-terra`) or pin `claude-sonnet-5.5` via `/models` when starting a sustained single-thread coding session where you want known model identity (activating model-specific prompts and GPT's native `apply_patch` tool) and single-model prefix cache continuity.
- **Delegate When Work is Separable or Benefits from Isolation**:
  - Delegate to `@fast-worker`, `@mid-surgeon`, `@deep-surgeon`, or `@general` when a subtask is independently executable, would pollute the parent context with noisy exploration/test output, or requires a different capability tier.
  - All three coding workers intentionally omit custom `prompt` overrides so they inherit Kilo's native `SystemPrompt.provider(input.model)` coding instructions alongside the shared contract in `AGENTS.md`.
- **Resume `task_id` on Follow-Ups**: Always pass the returned `task_id` back to `task` when iterating on a child agent's recent work so its conversation history and eligible prompt cache prefix remain intact.

## 3. Choosing the Right Parallel Isolation Mechanism
Kilo provides two distinct execution layers plus Kilo Swarm for messaging:

| Scenario | Recommended Mechanism | Workspace & Git Scope | Coordination Method |
|---|---|---|---|
| **Independent parallel features, competing implementations, or large refactors** | **Agent Manager Worktrees** (`agent_manager` tool with `mode: "worktree"`, or `Cmd+Shift+N`) | Isolated git checkout under `.kilo/worktrees/`, dedicated branch, separate terminal | `agent_manager` (`action: "list"` / `"prompt"`), git commits, PR review panel |
| **Tightly coupled subtasks within the current branch** | **`task` Subagents** (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`) | Shared working tree with the parent session (separate transcript only) | Strictly disjoint writable file paths + Kilo Swarm (`board_post` / `board_read`) |
| **Parallel read-only discovery** | **Background Scouts** (`@explore`, `@file-picker`, `@local-scout` with `background: true`) | Read-only access to current workspace | Automatic result injection into parent session on completion |
