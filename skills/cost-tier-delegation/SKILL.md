---
name: cost-tier-delegation
description: Playbook for coordinating multi-worker parallel tasks, worktree isolation, and task_id resumption across @fast-worker, @mid-surgeon, and @deep-surgeon. Load only when decomposing complex multi-module features across multiple subagents.
---

# Multi-Worker Delegation & Parallel Coordination Playbook

Use this playbook when coordinating complex, multi-module features across multiple subagents.

## 1. Distinguishing Routing, Failover, and Quality Escalation
Keep these three mechanisms distinct:
- **`options.provider.allow_fallbacks`**: Fails over across hosting providers (e.g., OpenAI -> Azure) for the *same* model.
- **`options.models`**: Fails over to alternate models only on request/API errors (rate limits, outages, context validation). It never evaluates code quality.
- **Quality Escalation**: Deliberately assigning or reassigning work to a stronger specialist (`@fast-worker` -> `@mid-surgeon` -> `@deep-surgeon`) when complexity, risk, or verification failures require it.

## 2. Preserving Prompt Cache Continuity
- **Prefer Pinned Subagents for Multi-Turn Loops (>3–5 Turns)**: While the parent session uses `typesafe/jev-router` for flexible orchestration, any sustained edit/test/debug loop exceeding 3–5 turns should be delegated to a pinned subagent (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`) or run on a direct pinned model (`gpt-6.1-terra`, `gpt-6.1-sol`, `gemini-4-argon`, `claude-sonnet-5.5`) so every turn hits a warm single-model KV cache.
- **Resume `task_id` on Follow-Ups**: When iterating on or repairing a subagent's patch, resume its returned `task_id` instead of spawning a new child session.

## 3. Parallel Execution & Workspace Isolation
- **Background Scouts**: Launch independent read-only scouts (`@explore`, `@file-picker`, `@local-scout`) with `background: true` when investigating multiple subsystems simultaneously.
- **Disjoint Write Ownership**: Subagents launched via `task` have isolated transcripts but share the parent's working tree on disk. Never let two concurrent writers touch the same file:
  - Assign strictly disjoint writable file paths to simultaneous implementation workers, OR
  - Serialize overlapping edits, OR
  - Use separate Agent Manager git worktrees for large independent streams.
- **Swarm Board Coordination**: When parallel workers are active, use `board_post` and `board_read` for concise updates if a shared interface changes or a blocker affects a sibling worker.
