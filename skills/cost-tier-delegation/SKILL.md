---
name: cost-tier-delegation
description: Playbook for Flash-first execution, evidence-based tier escalation across primary modes, shared-tree subagents (@doc-summarizer, @file-picker, @local-scout, @fast-worker, @mid-surgeon, @deep-surgeon), and isolated Agent Manager git worktrees. Load when decomposing multi-step work or escalating across model tiers.
---

# Flash-First Delegation, Escalation & Worktree Playbook

Use this playbook when deciding whether to keep work in the active agent, delegate to shared-tree `task` subagents, escalate to a stronger model tier, or launch isolated Agent Manager git worktrees.

## 1. Reasoning Ladder & Escalation Policy
- **Three-Step Reasoning Ladder (Without Mandatory Traversal)**:
  - **Routine implementation (`Flash low`)**: `code`, `general`, `fast-worker`, and `ask` (`openrouter/deepseek/deepseek-v4.1-flash`, `low`) own routine features, bug fixes, API/UI wiring, refactors, and tests when contracts are clear and verification is available. If primary `code` already holds the relevant files in context, finish the edit/test loop directly rather than spawning `@fast-worker`.
  - **Bounded deeper diagnosis or planning (`Flash high`)**: Use `debug` or `plan` (or switch the active Flash variant to `high`) when a bounded problem with clear contracts needs deeper reasoning before escalating to a premium model.
  - **Specialist escalation (`Terra medium` / `Argon high`)**: Escalate from **any** cheap execution path (`code`, `general`, `debug`, `fast-worker`) to `@mid-surgeon` (`openai/gpt-6.1-terra`, `medium`) or `@deep-surgeon` (`google/gemini-4-argon`, `high`) when the task brief or observed evidence identifies an unresolved invariant, conflicting cross-module contract, difficult failed hypothesis, or substantive design decision. Skip cheaper tiers immediately when the need for stronger reasoning is already clear upfront.
- **Two-Attempt Progress Rule & Failure Handling**:
  - Stop and return evidence after **two materially different attempts without progress** on the same acceptance failure, or earlier when the blocker is already clear. Continue while making demonstrable progress within scope.
  - **Primary vs. Child Responsibilities**: Primary agents ask the user (`question` tool) when a product requirement is missing. Subagents receive `question: "deny"` and `task: "deny"`, so they must return missing product decisions or broad discovery requests to the parent (or perform bounded discovery within their own scope).
- **Stronger Planning Route**:
  - `plan` mode restricts `task` calls to read-only scouts (`@explore`, `@doc-summarizer`, `@file-picker`, `@local-scout`). When planning exceeds Flash `high`, start a stronger native `Plan` session with a compact handoff while preserving native `Plan` source-edit restrictions.

## 2. Flexible Task Briefs for `@fast-worker` & `@general`
Provide the **goal**, **acceptance criteria**, **writable scope** (exact files, or an appropriate module/directory when exact files are unknown), **known starting points**, **relevant contracts**, and the **smallest relevant verification set** (using canonical project test/typecheck commands). Mark unknown locations explicitly and provide an existing `path:line` pattern only when one is already known—never invent a reference or perform redundant parent discovery solely to complete the brief.

## 3. Shared-Worktree Escalation vs. Isolated Agent Manager Worktrees

| Mechanism | When to Use | Model & Variant Selection | Workspace State & Handoff Contract |
|---|---|---|---|
| **Same-Tier `task` Continuation** (`task_id` provided) | Continuing the **exact same worker and model tier** | Preserves the child session's stored model | Shares parent working tree & Git index; pass incremental instructions |
| **Fresh-Task Tier Escalation** (`@mid-surgeon`, `@deep-surgeon` — **omit `task_id`**) | Escalating from `code`, `debug`, `general`, or `@fast-worker` to a stronger model tier | Omit `task_id` so `task.ts` does not reuse the prior cheap model | Shares parent working tree (sees uncommitted partial edits); pass the **6-item Shared-Worktree Escalation Packet** below |
| **Agent Manager Worktree** (`agent_manager` with `mode: "worktree"`) | Parallel mutations touching overlapping files, shared configs, or lockfiles | **Explicitly pass** `{"agent": "code", "model": "openrouter/deepseek/deepseek-v4.1-flash", "variant": "low"}` for routine tasks (otherwise `agent-manager.ts` inherits the caller's model/variant; only primary agents are valid) | Starts a new checkout from an **explicitly specified base branch** (does **not** contain uncommitted parent worktree edits) |

### Shared-Worktree Escalation Packet (When Omitting `task_id` on `task`)
1. **Unresolved Question**: Specific invariant, root cause, or design question blocking completion.
2. **Acceptance Criteria**: Exact conditions required for completion.
3. **Current Modified Files & Changed Hunks**: Focused diffs or `path:line` references (not `git diff --stat` alone).
4. **Exact Failing Command & Decisive Output**: Verbatim error or failing assertion.
5. **Attempts Already Made**: Hypotheses tested and why each failed.
6. **Disposition of Partial Worktree Changes**: Which partial edits in the shared worktree are intentional and should be retained versus reverted.

## 4. Discovery & Output-Digest Scouts
- **Reuse Kilo's Captured Output Files**: When a noisy shell command is truncated by Kilo, reuse the full-output file path returned by Kilo (strict scouts retain read access to truncation storage). Capture proactively to `.kilo/logs/` or `/tmp/` when large output is expected, preserving exit status; never rerun a command solely to create a second log.
- **`@local-scout` Availability & Fallback**: Use `@local-scout` (`ollama/qwen3-coder:30b`, native `read`/`grep`/`glob` only, shell disabled) when Ollama and the model are available and responsive (`ollama ps` shows 32K context allocated without heavy CPU offload) and the task benefits from local processing. Otherwise use bounded native filtering (`grep`/`read`) or a Flash scout (`@doc-summarizer` / `@explore`).
