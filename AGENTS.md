# Global Orchestration, Caching & Delegation Policy (`AGENTS.md`)

Optimize total cost and time to a verified, working result while preserving Kilo's native agent workflows and model-specific system prompts.

## 1. Discovery Default & Opt-In Scouts
Complete localized tasks directly without unnecessary subagent or MCP overhead:
- **Default Discovery Path**: Start with direct `grep`, `glob`, targeted line-ranged `read` (`offset` and `limit`), and native LanceDB `semantic_search` (`codebase_search`). For broader multi-step exploration across unfamiliar directories, default to Kilo's native `@explore` subagent (`background: true` when parallelizing).
- **Opt-In Specialized Tools (Use Only When Their Contract Wins & Permitted by Your Role)**:
  - **`context7` (`resolve-library-id` -> `query-docs`)**: Call only when working with external libraries/SDKs where version-specific signatures are uncertain.
  - **`@file-picker`**: Call instead of `@explore` only when you need a strict structured inventory of file/symbol spans, contracts, and side effects to partition work across multiple implementation subagents.
  - **`@local-scout`**: Call for local Ollama (`qwen3-coder:30b`) summarization of large files, git diffs, or verbose test/build logs with no model API inference charge.
  - **`jev_find` / `jev_rerank`**: Call only when an already retrieved shortlist of bounded snippets (<2,000 chars each) remains genuinely ambiguous—never chain by default after routine searches.

Expand direct reading whenever callers, interfaces, tests, or project rules are needed for correctness.

## 2. The YAGNI Ladder (Ponytail Principle)
Before writing new code or abstractions, step through this ladder in order (if your role permits the `skill` tool, load `ponytail-yagni` when designing new modules or refactors):
1. **Does it need to exist?** If a feature, wrapper, or abstraction is not required by the spec or a concrete invariant, do not write it.
2. **Already in the repo?** Reuse existing helpers, types, and conventions in the codebase.
3. **Stdlib / platform?** Prefer built-in language or runtime primitives over custom utilities.
4. **Existing dependency?** Prefer packages already present in `package.json`, `pyproject.toml`, `Cargo.toml`, or `go.mod` over custom logic. Avoid speculative dependency additions, honor dependency authorization already present in the user's task, and ask when adding a package introduces a meaningful new tradeoff.
5. **One-liner / simple function?** Prefer a direct function over a new class, factory, or indirection layer.
6. **Minimal implementation**: Write the smallest, clearest code that satisfies the requirement and passes verification.

## 3. Continuity-Based Execution & Delegation
- **Keep Coherent Loops Together**: Keep a coherent implementation and verification loop with its current agent while it is making progress. Do not force premature subagent handoffs based on an arbitrary turn count; `typesafe/jev-router` can retain a model across related turns, and switching to `code-pinned` (`gpt-6.1-terra`) locks single-model prefix continuity and native GPT `apply_patch` tool selection for long single-thread sessions.
- **Leverage Native `plan` and `debug` Modes First**:
  - Use native **`plan`** (writes specs to `.kilo/plans/`) for architectural design and specification before implementation.
  - Use native **`debug`** (`jev-router-high`) for systematic root-cause diagnosis before escalating to `@deep-surgeon`.
- **When to Delegate to Model-Pinned Subagents**: Delegate when a subtask is independently executable, benefits from isolating a large or noisy working set in a separate context window, or needs a specific model tier/capability (`@general` on `gpt-6.1-terra` is also available for general subtasks):
  - **`@fast-worker`** (`deepseek/deepseek-v4.1-flash`): Bounded mechanical edits (boilerplate, schemas/types, CRUD, UI components, formatting, routine unit tests).
  - **`@mid-surgeon`** (`openai/gpt-6.1-terra`): Multi-file feature implementation, state/API wiring, migrations, and non-trivial refactors.
  - **`@deep-surgeon`** (`google/gemini-4-argon`): Complex concurrency/async synchronization, security/auth/crypto invariants, hard algorithms, or escalations when `debug` or `@mid-surgeon` is blocked.

### Shared Implementation & Subagent Handoff Contract
Because `@fast-worker`, `@mid-surgeon`, and `@deep-surgeon` intentionally omit custom `prompt` overrides so they retain Kilo's native model-specific coding prompts (`SystemPrompt.provider(input.model)`), all delegated implementation subagents follow this shared contract:
1. **Parent Delegation Brief**: Provide (a) Goal and acceptance criteria, (b) Initial files, symbols, and known contracts (treat line numbers as navigation hints), (c) Writable path boundaries, and (d) Verification commands.
2. **Worker Execution Rules**:
   - Inspect surrounding context, callers, and types before editing, and modify only the writable paths assigned in the brief.
   - Escalate early (`status: blocked` with exact `path:line` and evidence) if you uncover cross-cutting architectural conflicts, concurrency hazards, or security invariants that exceed your brief or capability tier.
   - Return a concise handoff report covering: **Status** (`complete`, `partial`, or `blocked`), **Changes** (modified paths and symbols), **Validation** (exact commands run and whether each `passed`, `failed`, or was `not run`), and **Assumptions / Residual Risks**.
3. **Parallel Isolation & Resumption**:
   - Prefer **Agent Manager worktree sessions** (`agent_manager` with `mode: "worktree"`) for large or independent parallel feature streams so each stream gets an isolated `.kilo/worktrees/` checkout, branch, and terminal.
   - For coupled subtasks within the same branch, use `task` subagents with strictly disjoint writable paths (or serialize overlapping edits), and use `board_post` / `board_read` when available in your role to share material interface updates.
   - Resume an existing child's `task_id` for follow-up iterations rather than spawning a fresh worker.

## 4. Selective Use of Jev (`@jkudish/jev-mcp`) & Verification
When Jev tools are available in your role, use them only when a bounded judgment saves multi-turn deliberation (load `jev-judgment` for schemas, and `verification-and-debugging` for root-cause debugging):
- **`jev_decide` Outcomes**: Inspect `recommendation.selected` and `status` (`ask_user` -> ask user; `investigate` -> gather missing repo fact; `none` -> reconsider candidates; `status: "escalate"` / `selected: null` -> resolve contradicted requirement before acting).
- **Verification Before Completion**: Use relevant tests, reproduction checks, typechecks, and direct diff inspection as primary completion evidence. Use `jev_review` or `jev_gate` selectively on non-trivial diffs as an advisory second opinion (pass actual test/check output in `evidence` for `jev_gate`, and do not run both redundantly on the same diff). Never treat Jev's reported confidence or score as proof of "zero regressions."
