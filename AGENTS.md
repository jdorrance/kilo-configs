# Global Orchestration & Worker Policy (`AGENTS.md`)

Optimize total cost and time to a verified, working result while preserving Kilo's native agent workflows.

## Core Operating Principles
1. **Read Known, Bounded Source Directly**: Complete localized edits and targeted reads (`grep`, `glob`, line-ranged `read` with `offset` and `limit`, and `semantic_search`) directly in the active agent when the relevant files or symbols are known. Reuse context already present in your session or delegation brief instead of re-reading unchanged files.
2. **Delegate Only When It Prevents Bulk Ingestion or Isolates Independent Work**:
   - Delegating already-cached parent context to a cheap subagent saves almost nothing on input tokens while adding orchestration latency. Delegate when it prevents the parent from ingesting *new* bulky material or executes an independent subtask:
   - **Broad Repository Discovery (`@explore` / `@file-picker`)**: Delegate unfamiliar multi-directory exploration to `@explore`, or use `@file-picker` when you want a structured inventory of `path:startLine-endLine` hints, verbatim signatures, and callers before partitioning multi-worker edits.
   - **Long Documentation & External Spec Synthesis (`@doc-summarizer`)**: Delegate long markdown specs, PRDs, `context7` library documentation lookups, and `webfetch`/`websearch` research to `@doc-summarizer` (available from `code`, `plan`, and `debug`) before pulling large raw docs into the parent session.
   - **Noisy Logs & Diffs (`@local-scout`)**: Capture verbose test/build output or large diffs to a file in `.kilo/logs/` (or `/tmp/`) while preserving exit status, filter deterministically with `rg`/`jq` where possible, and pass the file path to `@local-scout` (`ollama/qwen3-coder:30b`) before the parent ingests the raw output.
   - **Ambiguous Shortlist Reranking (`jev_jev_find` / `jev_jev_rerank`)**: Use Jev reranking selectively when an already retrieved shortlist of bounded snippets (<2,000 chars each) remains genuinely ambiguous.
3. **Inspect Current Source & Contracts Before Editing**:
   - Treat scout `path:startLine-endLine` ranges as navigation hints, not proof of correctness. Read the current relevant source before your first edit, and reread or expand to callers, types, tests, and surrounding logic whenever it may have changed or required context is missing.
4. **Choose the Right Worker Tier Immediately & Keep Productive Loops Together**:
   - Do not interrupt a coherent implementation and verification loop based on an arbitrary turn count.
   - When delegating implementation (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`, or `@general`), choose the lowest-cost worker likely to finish on the first pass—skip cheaper tiers immediately when architectural or cross-module difficulty is already evident.
5. **Reuse Existing Code & Dependencies (YAGNI)**: Prefer existing project helpers, language stdlib, and already-installed packages over new code or abstractions (load `ponytail-yagni` when designing modules/refactors). Honor dependency additions already authorized by the task; ask when a new package introduces a meaningful tradeoff.
6. **Parent-Owned Git Integration & Shared-Tree Safety**:
   - Subagents launched via `task` share the parent's working tree and Git index. Workers must modify only their assigned writable paths and avoid running `git stash`, `git add`, or `git commit`—the parent session owns staging and integration.
   - Use `agent_manager` (`mode: "worktree"`) when independent workers need to mutate overlapping project state, shared configs, or lockfiles in parallel.
7. **Subagent Handoff, Same-Tier Resumption & Fresh-Task Escalation**:
   - **Parent Brief**: Specify (a) Goal and acceptance criteria, (b) Initial files/symbols/contracts, (c) Writable path boundaries, and (d) Verification commands.
   - **Resume for Same Worker/Model; Start Fresh When Escalating Tier**: Resume an existing `task_id` only when continuing the **same worker and model tier**. Because a resumed child's stored model overrides a newly selected subagent's default model, always start a **new task** (without `task_id`) when escalating to a different model tier, passing the previous findings, failed hypotheses, changed files, and validation evidence.
   - **Minimal Sufficient Return Report**: Report **Status** (`complete` | `partial` | `blocked`), **Changes** (paths/symbols), **Validation** (exact command, `passed` | `failed` | `not run`, and decisive failure excerpt—do not paste full passing test logs into the parent), and **Residual Risks**.
8. **Risk-Bounded Empirical Verification**: Establish an affected test baseline when it helps distinguish pre-existing failures, avoiding repeated unchanged full-suite runs. Run the smallest relevant test, typecheck, or lint command covering the touched code, broaden to package/integration suites when shared contracts change, and stop once acceptance criteria are verified (load `verification-and-debugging` for complex bug triage, and `jev-judgment` when using `jev_jev_decide`, `jev_jev_review`, or `jev_jev_gate`).
