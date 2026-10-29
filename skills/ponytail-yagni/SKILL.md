---
name: ponytail-yagni
description: The 6-step YAGNI (You Aren't Gonna Need It) ladder to eliminate over-engineering, speculative abstractions, and wasted output tokens. Load when designing new features, modules, or refactors.
---

# Ponytail: The 6-Step YAGNI Ladder

Output tokens are 5x–20x more expensive than input tokens, and every unnecessary line of code inflates future context windows, test surface area, and maintenance cost. Before writing any new module, class, helper, or abstraction, climb this ladder one rung at a time and stop at the lowest rung that solves the problem without compromising correctness, validation, or security.

## The Ladder

1. **Rung 1 — Does it need to exist at all?**
   - Is this code required by the user's explicit request or a verified codebase invariant?
   - Never add speculative configuration flags, "future-proof" plugin hooks, unused interface methods, or fallback branches for impossible states.

2. **Rung 2 — Is it already in the repository?**
   - Search (`grep`, `glob`, `semantic_search`) for existing utilities, shared types, validation helpers, or error wrappers in the project before writing a new one.

3. **Rung 3 — Is it in the language standard library or runtime platform?**
   - Use native platform primitives (e.g., `URL`, `structuredClone`, `AbortSignal.timeout`, `Promise.withResolvers`, `crypto.randomUUID`, `path`, `fs/promises`, `itertools`, `collections`, `contextlib`, `std::sync`) instead of hand-rolling helpers.

4. **Rung 4 — Is it in an already-installed dependency?**
   - Check `package.json`, `pyproject.toml`, `Cargo.toml`, or `go.mod`. If a library already in the dependency tree solves the problem, use it (check exact syntax via `context7` if uncertain) rather than writing custom parsing/validation/retry logic.
   - Avoid speculative new dependencies; honor dependency authorization already implied by the user's task, and ask when introducing a new package adds a meaningful architectural, bundle-size, or maintenance tradeoff.

5. **Rung 5 — Can it be a direct expression or single function?**
   - Prefer a pure function or inline expression over a class, builder, factory, or manager object.
   - Do not wrap a single-call function in an extra abstraction layer unless multiple callers require polymorphism today.

6. **Rung 6 — Minimal, High-Signal Implementation**
   - Write the minimum lines of idiomatic code needed to satisfy the contract, handle real failure modes at system boundaries, and pass tests.
   - Omit redundant comments that merely restate what the code does; comment only non-obvious invariants or *why* a decision was made.
