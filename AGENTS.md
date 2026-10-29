# Global Orchestration & Worker Policy (`AGENTS.md`)

Optimize total cost and time to a verified, working result while preserving Kilo's native role behavior, model-dependent prompting where applicable, and permission guards.

## Core Operating Principles

1. **Flash-First Default Ownership & Reasoning Ladder**:
   - **Routine work (`Flash low`)**: `openrouter/deepseek/deepseek-v4.1-flash` (`code`, `general`, `fast-worker`, `ask` at `low` effort) owns routine features, bug fixes, API/UI wiring, refactors, and tests when contracts are clear and verification is available.
   - **Bounded deeper diagnosis or planning (`Flash high`)**: Use `debug` or `plan` (or select the `high` variant on Flash) when a bounded problem with clear contracts needs deeper reasoning before jumping to a premium tier.
   - **Specialist escalation (`Terra medium` / `Argon high`)**: Escalate from **any** cheap execution agent (`code`, `general`, `debug`, `fast-worker`) to `@mid-surgeon` (`openai/gpt-6.1-terra`, `medium`) or `@deep-surgeon` (`google/gemini-4-argon`, `high`) when the task brief or observed evidence identifies an unresolved invariant, conflicting contract, difficult failed hypothesis, or substantive design decision. A failed cheap attempt is **not** required when the need for stronger reasoning is already clear.
   - **Progress Rule**: After two materially different attempts without progress on the same acceptance failure, stop and return evidence. Escalate earlier when the blocker is already clear. Continue while making demonstrable progress within scope.
   - **Stronger Planning Escape Route**: `plan` mode restricts `task` delegation to read-only scouts (`@explore`, `@doc-summarizer`, `@file-picker`, `@local-scout`). When planning requires stronger reasoning than Flash `high`, start a stronger native `Plan` session with a compact handoff while preserving `Plan`'s source-edit restrictions.

2. **Failure Handling Taxonomy (Parent vs. Subagent Responsibilities)**:
   | Failure Type | Correct Response |
   |---|---|
   | Wrong implementation or unresolved reasoning | Repair in place, try Flash `high` for bounded diagnosis, or escalate to `@mid-surgeon` / `@deep-surgeon` based on evidence |
   | Permission denied | Fix the permission or workflow issue; do not escalate model tier |
   | Missing dependency or broken test environment | Resolve the environment or report the exact missing prerequisite |
   | Missing product requirement | **Primary agents** ask the user (`question` tool). **Subagents** (`question: "deny"`) return the question, affected scope, and blocker to the parent |
   | Scope needs to expand beyond assignment | Return the proposed scope change and reason to the parent |

3. **Targeted Direct Reads vs. Selective Scout Delegation**:
   - Complete localized edits and targeted reads (`grep`, `glob`, line-ranged `read` with `offset` and `limit`, and `semantic_search`) directly in the active agent when relevant files or symbols are known.
   - **Broad Repository Discovery (`@explore` / `@file-picker`)**: Delegate unfamiliar multi-directory exploration to `@explore`, or use `@file-picker` for a structured inventory of `path:startLine-endLine` hints, verbatim signatures, and callers. Flat subagents (`task: "deny"`) perform bounded discovery themselves or return the discovery need to the parent.
   - **Long Documentation & External Specs (`@doc-summarizer`)**: Delegate long markdown specs, PRDs, `context7_*` library lookups, and `webfetch`/`websearch` research to `@doc-summarizer`.
   - **Large Tool Output, Logs & Diffs (`@local-scout` with Fallback)**: Reuse Kilo's full-output file when one is provided by a truncated shell result, or capture proactively to `.kilo/logs/` or `/tmp/` when large output is expected (preserving exit status); avoid rerunning commands merely to create a second log. Use `@local-scout` (`ollama/qwen3-coder:30b`, native `read`/`grep`/`glob` only, shell disabled) when Ollama and the model are available and responsive, and the task benefits from local processing. Otherwise use bounded native filtering (`grep`/`read`) or a Flash scout (`@doc-summarizer` / `@explore`).

4. **Flexible Task Briefs (Avoid Duplicated Parent Discovery)**:
   - Provide the **goal**, **acceptance criteria**, **writable scope** (exact files, or an appropriate module/directory when exact files are unknown), **known starting points**, **relevant contracts**, and the **smallest relevant verification set** (using the repository's canonical test/typecheck scripts).
   - Mark unknown locations explicitly. Provide an existing `path:line` pattern when one is known; do not invent a reference or perform redundant discovery solely to complete the brief.

5. **Shared-Tree Escalation vs. Isolated Agent Manager Worktrees**:
   - **Shared-Tree `task` Subagents**: Subagents share the parent's working tree and Git index (`task: "deny"`). Workers modify only their writable scope and never run `git stash`, `git add`, or `git commit`.
     - Reuse `task_id` **only** when continuing the same worker and model tier.
     - Start a **fresh `task`** (omit `task_id`) when changing model tiers, and include a **Shared-Worktree Escalation Packet**: (1) unresolved question, (2) acceptance criteria, (3) current modified files and relevant changed hunks (focused diffs or `path:line` references), (4) exact failing command and decisive output, (5) attempts already made, and (6) which partial changes in the shared worktree are intentional and should be retained versus reverted.
   - **Isolated Agent Manager Worktrees (`agent_manager` with `mode: "worktree"`)**: Use when parallel tasks touch overlapping files, shared configs, or lockfiles.
     - Because Agent Manager inherits the invoking turn's model and variant when omitted and requires a selectable **primary** agent, **explicitly set `"agent": "code"`, `"model": "openrouter/deepseek/deepseek-v4.1-flash"`, and `"variant": "low"`** on routine Agent Manager sessions. Select a premium model (`code-pinned` / Terra) only when the worktree assignment independently meets the escalation criteria.
     - Always specify the intended base branch. A new worktree starts from a committed branch and does **not** automatically contain uncommitted changes from the parent checkout—keep branch-based worktree handoffs distinct from shared-worktree escalation packets.
   - **On-Demand Skills**: Load `cost-tier-delegation` for multi-worker orchestration, `ponytail-yagni` for module/refactor design, `verification-and-debugging` for complex triage, and `jev-judgment` for `jev_jev_decide`, `jev_jev_review`, or `jev_jev_gate`.
