# Global Orchestration, Caching & Delegation Policy (`AGENTS.md`)

Optimize total cost and time to a verified, working result while preserving Kilo's native agent workflows.

## 1. Discovery Order & Context Hygiene
Complete small, localized tasks directly without unnecessary subagent overhead. When discovering code or library APIs, follow this hierarchy:
1. **Exact Symbol / Path / Error Search**: Use `grep`, `glob`, and targeted line-ranged `read` (`offset` and `limit`) over broad file dumps.
2. **Semantic Search (`semantic_search`)**: Use Kilo's native LanceDB `semantic_search` tool when looking for conceptual behavior ("where is auth token refresh handled?") rather than an exact identifier.
3. **Version-Specific Library Docs (`context7`)**: When working with external libraries/SDKs where API signatures might have changed, use `context7` (`resolve-library-id` -> `query-docs`) instead of guessing and burning build/retry turns.
4. **Scout Delegation (`@explore`, `@file-picker`, `@local-scout`)**: Delegate broad multi-step exploration across unfamiliar directories to `@explore` (or `@file-picker` for a structured symbol/contract inventory, or `@local-scout` for local inference with no model API charge). Use `background: true` when launching independent discovery scouts in parallel.
5. **Ambiguous Shortlist Reranking (`jev_find` / `jev_rerank`)**: Use Jev reranking only when an already retrieved shortlist of bounded snippets (<2,000 chars each) remains ambiguous.

Expand your direct reading whenever callers, interfaces, tests, or project rules are needed for correctness.

## 2. The YAGNI Ladder (Ponytail Principle)
Before writing new code or abstractions, step through this ladder in order (load the `ponytail-yagni` skill when designing new modules or refactors):
1. **Does it need to exist?** If a feature, wrapper, or abstraction is not required by the spec or a concrete invariant, do not write it.
2. **Already in the repo?** Reuse existing helpers, types, and conventions in the codebase.
3. **Stdlib / platform?** Prefer built-in language or runtime primitives over custom utilities.
4. **Existing dependency?** Use packages already present in `package.json`, `pyproject.toml`, `Cargo.toml`, or `go.mod` before writing custom logic.
5. **One-liner / simple function?** Prefer a direct function over a new class, factory, or indirection layer.
6. **Minimal implementation**: Write the smallest, clearest code that satisfies the requirement and passes verification.

## 3. Router vs. Pinned Subagents (Cache Continuity Rule)
- **Use the Router for Orchestration & Short Turns**: The primary session uses `typesafe/jev-router` to adaptively pick models per request. However, switching models mid-loop invalidates the provider KV cache.
- **Prefer Pinned Subagents for Multi-Turn Edit/Test Loops (>3–5 Turns)**: Whenever a task involves a sustained multi-step edit/test/repair loop, delegate that loop to a pinned subagent (`@fast-worker`, `@mid-surgeon`, or `@deep-surgeon`)—or switch the session to a direct pinned model (`gpt-6.1-terra`, `gpt-6.1-sol`, `gemini-4-argon`, `claude-sonnet-5.5`)—so the entire tool loop runs against a warm single-model KV cache.
- **Choose the Initial Worker by Complexity & Risk**:
  - **`@fast-worker`** (`deepseek/deepseek-v4.1-flash`): Tightly scoped mechanical edits (boilerplate, schemas/types, CRUD, UI components, formatting, routine unit tests).
  - **`@mid-surgeon`** (`openai/gpt-6.1-terra`): Standard multi-file features, state/API wiring, migrations, and non-trivial refactors.
  - **`@deep-surgeon`** (`google/gemini-4-argon`): Complex concurrency/async synchronization, security/auth/crypto, hard algorithms, or escalations when a task exceeds a lower worker's scope.

### Handoff, Ownership & Escalation Rules
- **Standardized Delegation Brief**: When delegating a task, provide:
  1. Goal and acceptance criteria.
  2. Initial files, symbols, and known contracts/invariants (treat line numbers as navigation hints).
  3. Writable path boundaries (assign disjoint writable paths to concurrent workers, or serialize overlapping edits).
  4. Required verification commands.
- **Resume Existing Child Sessions**: When iterating on a worker's recent patch, resume its existing `task_id` rather than spawning a fresh worker so its cached context stays warm.

## 4. Selective Use of Jev (`@jkudish/jev-mcp`) & Verification
Use Jev selectively for bounded judgments where a fast typed check saves multi-turn deliberation (load the `jev-judgment` skill for exact tool schemas, and the `verification-and-debugging` skill for systematic root-cause debugging):
- **`jev_decide` Outcomes**: Inspect `recommendation.selected` and `status`:
  - `ask_user`: ask the user for the missing preference or authorization.
  - `investigate`: gather the missing technical fact from the repository.
  - `none`: reconsider the candidate set.
  - `status: "escalate"` / `selected: null`: resolve the contradicted requirement before acting.
- **Verification Before Completion**: Use relevant tests, reproduction steps, typechecks, and direct review of the integrated diff as primary completion evidence. Use `jev_review` or `jev_gate` selectively on non-trivial diffs as an advisory second opinion (pass actual test/check output inside `evidence` for `jev_gate`, and avoid serializing large diffs into tool arguments for minor edits). Never treat a passing Jev score as proof of "zero regressions."
