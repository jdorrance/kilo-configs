---
name: cost-tier-delegation
description: Playbook for Flash-first execution, evidence-based tier escalation, mandatory independent Terra review and Plan critique (@reviewer), shared-tree subagents (@doc-summarizer, @file-picker, @local-scout, @fast-worker, @mid-surgeon, @deep-surgeon), and isolated Agent Manager git worktrees. Load when decomposing multi-step work, escalating across model tiers, or running the independent review gate.
---

# Flash-First Delegation, Escalation & Independent Review Playbook

Use this playbook when deciding whether to keep work in the active agent, delegate to shared-tree `task` subagents, escalate to a stronger model tier, launch isolated Agent Manager git worktrees, or invoke `@reviewer` for Plan critique or final review. Repository-specific contracts and canonical verification commands take precedence over generic defaults (without overriding runtime tool permissions).

## 1. Reasoning Ladder, Plan Critique & Upfront Escalation
- **Routine Implementation (`Flash low`)**: `code`, `general`, `fast-worker`, and `ask` (`openrouter/deepseek/deepseek-v4.1-flash`, `low` effort/variant) own routine features, bug fixes, API/UI wiring, refactors, and tests when contracts are clear and verification is available. If primary `code` already holds the relevant files in context, finish the edit/test loop directly rather than spawning `@fast-worker`.
- **Bounded Deeper Diagnosis or Planning (`Flash high`)**: Use `debug` or `plan` (or switch the active Flash variant to `high`) when a bounded problem with clear contracts needs deeper reasoning.
- **Selective Plan & Architecture Critique (`@reviewer` from `Plan`)**: `plan.permission.task` allows read-only `@reviewer` (`openai/gpt-6.1-terra`, `medium`). Before committing to an uncertain implementation, `plan` can delegate a focused design critique to `@reviewer` to check whether the design preserves public contracts, whether migration/rollback assumptions hold, whether the proposed concurrency model has a race, whether an existing abstraction/caller was overlooked, and whether acceptance criteria will detect likely failures. When whole-session planning exceeds Flash `high`, start a stronger native `Plan` session while preserving `Plan` source-edit restrictions.
- **Specialist Escalation (`Terra medium` / `Argon high`)**: Escalate upfront or mid-task from **any** cheap execution path (`code`, `general`, `debug`, `fast-worker`) to `@mid-surgeon` (`openai/gpt-6.1-terra`, `medium`) or `@deep-surgeon` (`google/gemini-4-argon`, `high`) when architectural uncertainty, conflicting cross-module contracts, difficult invariants, or substantive design decisions justify it. Neither two failed cheap attempts nor a Flash-`high` detour is required when the need for stronger reasoning is already clear.
- **Two-Attempt Progress Rule & Failure Handling**:
  - Stop and return evidence after **two materially different attempts without progress** on the same acceptance failure, or earlier when the blocker is already clear. Continue while making demonstrable progress within scope.
  - **Primary vs. Child Responsibilities**: Primary agents ask the user (`question` tool) when a product requirement is missing. Subagents receive `question: "deny"` and `task: "deny"`, so they must return missing product decisions or broad discovery needs to the parent (or perform bounded discovery within their own scope).

## 2. Flexible Task Briefs & Worker Return Contract
- **Brief Inputs**: Provide the **goal**, **acceptance criteria**, **writable scope** (exact files, or an appropriate module/directory when exact files are unknown), **known starting points**, **relevant contracts**, and the **smallest relevant verification set** (using canonical project test/typecheck commands). Mark unknown locations explicitly and provide an existing `path:line` pattern only when one is already known—never invent a reference or perform redundant parent discovery solely to complete the brief.
- **Worker Return Contract**: Every implementation worker (`general`, `fast-worker`, `mid-surgeon`, `deep-surgeon`) must return:
  - `status`: `complete` | `partial` | `blocked`
  - `review_required`: `true` | `false` and the concrete reason
  - Modified file paths, symbols/hunks changed, and exact verification commands + outcomes

## 3. Mandatory Independent Terra Review Gate (`@reviewer`)
This instruction-level completion policy pairs cheap Flash execution with an independent strong review (`openrouter/openai/gpt-6.1-terra`, `medium`) on all non-trivial work:
- **When `@reviewer` Is Mandatory (Evaluate by Behavioral Risk, Not File/Call Count)**:
  - Substantive behavioral changes, new features, or non-obvious bug fixes.
  - Changes to public contracts, authorization, security, data integrity, migrations, concurrency, or state transitions.
  - Changes with unresolved uncertainty, inadequate verification, earlier repeated failed hypotheses, or an explicit user request for careful review.
  - Clearly mechanical changes (formatting, spelling, **behavior-preserving generated updates**, straightforward equivalent renames) may skip review with a brief stated reason. Generated API clients, protobuf/schema output, dependency lockfiles, database migrations, and shipped bundles can alter behavior and are **not** automatically exempt. If classification is uncertain, require review.
  - Run **one bounded foreground review per completed task or coherent change set** after writes and targeted verification settle—never per file or intermediate edit, and never concurrently with active edits to the reviewed files.
  - The primary agent must evaluate the actual changes against these criteria itself (never relying solely on a worker's `review_required` flag). Passing tests or favorable advisory Jev scores (`jev_jev_review` / `jev_jev_gate`) **never waive** a required `@reviewer` gate.
- **How the Primary Invokes `@reviewer`**:
  1. Start a **fresh foreground `task`** targeting `reviewer` (**omit** the implementation worker's `task_id`), explicitly selecting `model: "openrouter/openai/gpt-6.1-terra"` and `variant: "medium"` (using the installed `task` schema) and verifying the resolved model/effort so saved session selections cannot override it.
  2. Tie the review to an explicit **change-set identity**: `reviewed baseline revision + captured change set (including untracked file contents, since git diff alone does not cover untracked files) + verification results + verdict`. Because `@reviewer` is strictly read-only with shell (`bash`) disabled, capture large diffs to `/tmp/` or `.kilo/logs/` when needed and supply in the brief:
     - **Goal, Acceptance Criteria & Contracts**: What the change must accomplish and preserve.
     - **Review Baseline & Change-Set Identity**: Baseline revision, identification of any pre-existing user changes, and a lightweight content digest or inventory of tracked diffs + untracked files.
     - **Diff, Untracked Contents & Readable Paths**: Inline diff or path to the captured diff file, plus untracked-file paths/contents so `@reviewer` can independently read surrounding source and callers.
     - **Verification Evidence**: Exact verification commands run, results, and decisive output.
     - **Known Risks & Specific Questions**: Edge cases or assumptions to scrutinize.
  3. **Required `@reviewer` Output**:
     - **Verdict**: `pass` | `changes_required` | `blocked`
     - **Findings**: Severity, exact `path:line`, concrete failure scenario, and suggested correction for each issue.
     - **Reviewed Scope, Change-Set Identity & Unverified Assumptions**: Files/contracts inspected, the baseline/change-set reviewed, and any remaining unverified assumptions.
  4. **Fix, Invalidation & Focused Recheck Loop**:
     - If `@reviewer` returns `changes_required`, the parent or implementation worker fixes the findings and reruns relevant verification.
     - Resume the **same `@reviewer` session** (via the reviewer's `task_id`) for a focused recheck rather than restarting a full review from scratch (this also avoids paying a fresh OpenAI cache-write penalty on the entire repository context).
     - **Broad Invalidation Rule**: Any subsequent material edit affecting the reviewed change set—including changes to a configuration file, shared helper, schema, or dependency, even when the originally reviewed files remain untouched—invalidates an earlier `pass` and requires a focused recheck.
     - If a required review cannot finish, report the review as incomplete—never silently substitute Flash or claim final completion.

## 4. Shared-Worktree Escalation vs. Isolated Agent Manager Worktrees

| Mechanism | When to Use | Model & Variant Selection | Workspace State & Handoff Contract |
|---|---|---|---|
| **Same-Tier `task` Continuation** (`task_id` provided) | Continuing the **exact same worker or `@reviewer` session** | Preserves the child session's stored model | Shares parent working tree & Git index; pass incremental instructions or focused recheck diff |
| **Fresh-Task Tier Escalation** (`@mid-surgeon`, `@deep-surgeon` — **omit `task_id`**) | Escalating from `code`, `debug`, `general`, or `@fast-worker` to a stronger implementation tier | Omit `task_id` so `task.ts` does not reuse the prior cheap model | Shares parent working tree (sees uncommitted partial edits); pass the **6-item Shared-Worktree Escalation Packet** below |
| **Independent Review / Plan Critique** (`@reviewer` — **omit implementation `task_id`**) | Selective architecture/plan critique in `plan`, or mandatory final review in `code`/`debug` | Explicitly select `reviewer` on `openai/gpt-6.1-terra` (`medium`); resume reviewer's own `task_id` only for focused rechecks | Read-only access to workspace and `/tmp/**` (`bash` disabled); parent supplies baseline/change-set + verification output |
| **Agent Manager Worktree** (`agent_manager` with `mode: "worktree"`) | Parallel mutations touching overlapping files, shared configs, or lockfiles | **Explicitly pass** `{"agent": "code", "model": "openrouter/deepseek/deepseek-v4.1-flash", "variant": "low"}` for routine tasks (only primary agents are valid) | Starts a new checkout from an **explicitly specified base branch** (does **not** contain uncommitted parent edits); **verify and review the integrated result** after merging branches |

### Shared-Worktree Escalation Packet (When Omitting `task_id` on Implementation Escalation)
1. **Unresolved Question**: Specific invariant, root cause, or design question blocking completion.
2. **Acceptance Criteria**: Exact conditions required for completion.
3. **Current Modified Files & Changed Hunks**: Focused diffs or `path:line` references (not `git diff --stat` alone).
4. **Exact Failing Command & Decisive Output**: Verbatim error or failing assertion.
5. **Attempts Already Made**: Hypotheses tested and why each failed.
6. **Disposition of Partial Worktree Changes**: Which partial edits in the shared worktree are intentional and should be retained versus reverted.

## 5. Discovery & Output-Digest Scouts
- **Reuse Kilo's Captured Output Files**: When a noisy shell command is truncated by Kilo, reuse the full-output file path returned by Kilo (strict scouts and `@reviewer` retain read access to truncation storage and `/tmp/**`). Capture proactively to `.kilo/logs/` or `/tmp/` when large output is expected, preserving exit status; never rerun a command solely to create a second log.
- **`@local-scout` Availability, Cost Math & Fallback**: A 20K-input / 1K-output Flash scout call costs ~$0.00365 at the `$0.15/$0.65` ceiling before caching, so a slow local 30B invocation only pays off when Ollama is warm and responsive. Use `@local-scout` (`ollama/qwen3-coder:30b`, native `read`/`grep`/`glob` only, shell disabled) when Ollama and the model are warm (`ollama ps` shows 32K context allocated without CPU offload) and the task benefits from local processing; otherwise use bounded native filtering (`grep`/`read`) or a Flash scout (`@doc-summarizer` / `@explore`).
