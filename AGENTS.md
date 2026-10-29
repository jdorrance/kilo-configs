# Global Orchestration & Worker Policy (`AGENTS.md`)

Optimize total cost and time to a verified, working result while preserving Kilo's native role behavior, model-dependent prompting where applicable, and permission guards. Repository-specific contracts and canonical verification commands take precedence over generic workflow defaults (without overriding runtime tool permissions).

## Core Operating Principles

1. **Flash-First Default Ownership & Reasoning Ladder**:
   - **Routine work (`Flash low`)**: `openrouter/deepseek/deepseek-v4.1-flash` (`code`, `general`, `fast-worker`, `ask` at `low` effort) owns routine features, bug fixes, API/UI wiring, refactors, and tests when contracts are clear and verification is available.
   - **Bounded deeper diagnosis or planning (`Flash high`)**: Use `debug` or `plan` (or select the `high` variant on Flash) when a bounded problem with clear contracts needs deeper reasoning.
   - **Specialist escalation (`Terra medium` / `Argon high`)**: Escalate upfront or mid-task from **any** cheap execution agent (`code`, `general`, `debug`, `fast-worker`) to `@mid-surgeon` (`openai/gpt-6.1-terra`, `medium`) or `@deep-surgeon` (`google/gemini-4-argon`, `high`) when architectural uncertainty, conflicting contracts, difficult invariants, or substantive design decisions justify it. Do not require two failed cheap attempts or a Flash-`high` detour when the need is already clear.
   - **Progress Rule**: After two materially different attempts without progress on the same acceptance failure, stop and return evidence. Escalate earlier when the blocker is already clear. Continue while making demonstrable progress within scope.
   - **Stronger Planning Escape Route**: `plan` mode restricts `task` delegation to read-only scouts (`@explore`, `@doc-summarizer`, `@file-picker`, `@local-scout`). When planning requires stronger reasoning than Flash `high`, start a stronger native `Plan` session with a compact handoff while preserving `Plan`'s source-edit restrictions.

2. **Mandatory Independent Terra Review Gate (`@reviewer`)**:
   - After targeted verification settles and before claiming final completion, the **primary agent** must run one bounded foreground review per completed task or coherent change set via a **fresh `task`** targeting `@reviewer` (`openrouter/openai/gpt-6.1-terra`, `medium` variant, without the implementation worker's `task_id`) whenever the change involves:
     - Substantive behavioral changes, new features, or non-obvious bug fixes.
     - Public contracts, authorization, security, data integrity, migrations, concurrency, or state transitions.
     - Unresolved uncertainty, inadequate verification, earlier repeated failed hypotheses, or an explicit user request for careful review.
   - Clearly mechanical edits (formatting, spelling, generated updates, straightforward equivalent renames) may skip `@reviewer` with a brief stated reason. Judge by **behavioral risk** (not file or tool-call count); if uncertain, require review.
   - Implementation subagents (`general`, `fast-worker`, `mid-surgeon`, `deep-surgeon`) must return `review_required: true|false`, the reason, changed paths, and verification results, but the primary must independently evaluate the actual diff against this gate. Passing tests or advisory `jev_jev_review` / `jev_jev_gate` scores never waive a required `@reviewer` gate.
   - Load `cost-tier-delegation` for the full `@reviewer` brief, captured-diff handoff, and focused-recheck (`task_id` resumption) procedure. If a required review cannot finish, report it as incomplete—never silently substitute Flash or claim final completion.

3. **Failure Handling Taxonomy (Parent vs. Subagent Responsibilities)**:
   | Failure Type | Correct Response |
   |---|---|
   | Wrong implementation or unresolved reasoning | Repair in place, try Flash `high` for bounded diagnosis, or escalate to `@mid-surgeon` / `@deep-surgeon` based on evidence |
   | Permission denied | Fix the permission or workflow issue; do not escalate model tier |
   | Missing dependency or broken test environment | Resolve the environment or report the exact missing prerequisite |
   | Missing product requirement | **Primary agents** ask the user (`question` tool). **Subagents** (`question: "deny"`) return the question, affected scope, and blocker to the parent |
   | Scope needs to expand beyond assignment | Return the proposed scope change and reason to the parent |

4. **Targeted Direct Reads vs. Selective Scout Delegation**:
   - Complete localized edits and targeted reads (`grep`, `glob`, line-ranged `read` with `offset` and `limit`, and `semantic_search`) directly in the active agent when relevant files or symbols are known.
   - **Broad Repository Discovery (`@explore` / `@file-picker`)**: Delegate unfamiliar multi-directory exploration to `@explore`, or use `@file-picker` for a structured inventory of `path:startLine-endLine` hints, verbatim signatures, and callers. Flat subagents (`task: "deny"`) perform bounded discovery themselves or return the discovery need to the parent.
   - **Long Documentation & External Specs (`@doc-summarizer`)**: Delegate long markdown specs, PRDs, `context7_*` library lookups, and `webfetch`/`websearch` research to `@doc-summarizer`.
   - **Large Tool Output, Logs & Diffs (`@local-scout` with Fallback)**: Reuse Kilo's full-output file when one is provided by a truncated shell result, or capture proactively to `.kilo/logs/` or `/tmp/` when large output is expected (preserving exit status); avoid rerunning commands merely to create a second log. Use `@local-scout` (`ollama/qwen3-coder:30b`, native `read`/`grep`/`glob` only, shell disabled) when Ollama and the model are available and responsive, and the task benefits from local processing. Otherwise use bounded native filtering (`grep`/`read`) or a Flash scout (`@doc-summarizer` / `@explore`).

5. **Flexible Task Briefs, Shared-Tree Escalation & Isolated Agent Manager Worktrees**:
   - **Task Briefs**: Provide the **goal**, **acceptance criteria**, **writable scope** (exact files, or an appropriate module/directory when exact files are unknown), **known starting points**, **relevant contracts**, and the **smallest relevant verification set** (using the repository's canonical test/typecheck commands). Mark unknown locations explicitly and never perform redundant parent discovery solely to fill in line numbers.
   - **Shared-Tree `task` Subagents**: Workers share the parent's working tree (`task: "deny"`) and never run `git stash`, `git add`, or `git commit`. Reuse `task_id` **only** when continuing the same worker and model tier. Start a **fresh `task`** (omit `task_id`) when changing model tiers and pass the **6-item Shared-Worktree Escalation Packet** defined in `cost-tier-delegation`.
   - **Isolated Agent Manager Worktrees (`agent_manager` with `mode: "worktree"`)**: Because Agent Manager inherits the invoking turn's model and variant when omitted and requires a selectable **primary** agent, **explicitly set `"agent": "code"`, `"model": "openrouter/deepseek/deepseek-v4.1-flash"`, and `"variant": "low"`** on routine worktree sessions, and specify the intended base branch (new worktrees start from a branch and do not contain uncommitted parent edits). Select a premium model only when the assignment independently meets escalation criteria.
   - **On-Demand Skills**: Load `cost-tier-delegation` for multi-worker orchestration and the `@reviewer` gate procedure, `ponytail-yagni` for module/refactor design, `verification-and-debugging` for complex triage, and `jev-judgment` when using optional advisory `jev_jev_*` tools.
