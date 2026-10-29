# Global Orchestration & Worker Policy (`AGENTS.md`)

Optimize total cost and time to a verified, working result while preserving Kilo's native agent workflows.

## Core Operating Principles
1. **Finish Localized Work Directly**: Complete bounded edits, single-file changes, and quick verifications in the active primary agent (`code` or `code-pinned`) without unnecessary subagent handoffs.
2. **Retrieve Targeted Context First**: Default to `grep`, `glob`, line-ranged `read` (`offset` and `limit`), `semantic_search`, and native `@explore`. Use specialized scouts or MCP tools only when their contract adds clear value (and when permitted in your role):
   - **`context7`**: Query version-specific external library docs when signatures are uncertain (reuse a known library ID directly when available instead of calling `resolve-library-id` every time).
   - **`@file-picker`**: Request a strict path/symbol/contract inventory before partitioning multi-worker tasks.
   - **`@local-scout`**: Pass file paths (not huge pasted blobs) to summarize large logs, diffs, or files using local Ollama inference with no model API generation charge.
   - **`jev_jev_find` / `jev_jev_rerank`**: Rerank an already retrieved shortlist of bounded snippets (<2,000 chars each) only when the shortlist remains ambiguous.
3. **Keep Productive Loops Together**: Do not interrupt a coherent implementation and verification loop based on an arbitrary turn count. Delegate to a subagent (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`, or `@general`) when a subtask is independently executable, isolates noisy exploration/test output in a separate context window, or benefits from a specific model tier.
4. **Reuse Existing Code & Dependencies (YAGNI)**: Prefer existing project helpers, language stdlib, and already-installed packages over new code or abstractions (load the `ponytail-yagni` skill when designing modules/refactors). Honor dependency additions already authorized by the task; ask when a new package introduces a meaningful tradeoff.
5. **Parent-Owned Git Integration & Shared-Tree Safety**:
   - Subagents launched via `task` share the parent's working tree and Git index. Workers must modify only their assigned writable paths and must **never** run `git stash`, `git add`, or `git commit`—the parent session owns staging and integration.
   - Reserve `agent_manager` (`mode: "worktree"`) for explicit user requests or large independent parallel feature streams (which run primary agents in isolated `.kilo/worktrees/` checkouts).
6. **Shared Subagent Handoff & Evidence-Based Escalation**:
   - **Parent Brief**: Specify (a) Goal and acceptance criteria, (b) Initial files/symbols/contracts (treat line numbers as hints), (c) Writable path boundaries, and (d) Verification commands.
   - **Resume Existing Workers**: Pass the returned `task_id` to `task` on follow-ups to preserve the child's conversation continuity.
   - **Escalate on Concrete Evidence**: Escalate (`status: blocked` with exact `path:line` and diagnostic evidence) only when you hit an unresolved invariant, conflicting contract, failed verification hypothesis, or scope expanding beyond your writable paths—not merely because code touches async or auth logic.
   - **Worker Return Report**: Report **Status** (`complete` | `partial` | `blocked`), **Changes** (paths/symbols), **Validation** (exact commands run and `passed` | `failed` | `not run`), and **Residual Risks**.
7. **Empirical Verification Before Completion**: Run the smallest relevant test, typecheck, or lint command covering the touched code before claiming completion (load `verification-and-debugging` for complex bug triage, and `jev-judgment` when using `jev_jev_decide`, `jev_jev_review`, or `jev_jev_gate` as an advisory check).
