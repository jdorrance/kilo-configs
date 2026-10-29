---
name: verification-and-debugging
description: Systematic root-cause debugging, reproduction-first TDD, empirical verification-before-completion, and independent Terra review gate workflow. Load when diagnosing non-trivial bugs, test failures, or verifying complex multi-file changes.
---

# Systematic Debugging, TDD & Verification Before Completion

Use this workflow to avoid speculative "shotgun debugging" that burns turns and corrupts the working tree. Repository-specific contracts and canonical verification commands take precedence over generic defaults.

## 1. Systematic Debugging (Diagnostic Evidence Before Permanent Edits)
Avoid blind fixes hoping tests will turn green:
1. **Capture Exact Failure Evidence**: Read the full error message, stack trace, and failing assertion line (reuse Kilo's truncated full-output file when provided, or tee expected huge output to `.kilo/logs/` or `/tmp/`; use `@local-scout` when Ollama is available and responsive, or bounded native `grep`/`read` / Flash scouts otherwise).
2. **Isolate the Fault Path**: Trace inputs and state transitions from the failure site backward to the first point where actual state diverges from expected state.
3. **Rank Ambiguous Hypotheses**: If 2–5 plausible root causes exist, formulate falsifiable hypotheses (and optionally score them with `jev_jev_noul` if available in your role, passing the stack trace + snippet as `context`).
4. **Seek Reproduction or Reversible Diagnostic Evidence**: Seek a deterministic reproduction test or command when feasible. For flaky, timing-dependent, or environment-specific bugs, use small, reversible experiments or targeted diagnostic instrumentation to distinguish hypotheses. If the failure cannot be reproduced locally, explicitly report that limitation and verify the affected contracts.

## 2. Pragmatic Test-Driven Execution
- **Bug Fixes**: Write or update a focused test that captures the bug when reproducible, apply the minimal fix, and verify the test passes.
- **New Features / Refactors**: Establish an affected baseline when it helps distinguish pre-existing failures (avoiding repeated unchanged full-suite runs), implement the minimal change following the YAGNI ladder, and add targeted tests covering the new behavior and boundary conditions.

## 3. Empirical Verification & Mandatory Independent Review Gate (`@reviewer`)
Never declare a task "done" or "fixed" based solely on reading your own diff or a probabilistic `jev_jev_review` / `jev_jev_gate` score:
1. **Run the Smallest Relevant Check First**: Execute the repository's canonical unit test, typecheck, or lint command covering the touched files, broadening to package/integration suites when shared contracts change.
2. **Inspect `git diff` / `git status`**: Confirm no unintended files, temporary instrumentation, or formatting noise were left behind.
3. **Optional Preliminary Jev Check vs. Mandatory `@reviewer` Gate**:
   - A primary agent may optionally run `jev_jev_review` or `jev_jev_gate` (never both on the same diff, and always passing actual test/typecheck output inside `evidence` for `jev_jev_gate`), but **a favorable Jev result never waives the mandatory independent Terra review (`@reviewer`)**.
   - For any substantive behavioral change, new feature, non-obvious bug fix, contract/security/data/migration/concurrency/state change, or task with unresolved uncertainty or earlier failed hypotheses, the primary agent must invoke **`@reviewer`** (`openrouter/openai/gpt-6.1-terra`, `medium` effort) via a fresh foreground `task` after writes and verification settle (see `cost-tier-delegation` for the full `@reviewer` brief and focused-recheck loop).
4. **Report Honest Evidence**: State the exact verification commands executed (`passed` | `failed` | `not run`), the `@reviewer` verdict (`pass` | `changes_required` | `blocked`, or the brief reason if skipped as purely mechanical), and any residual assumptions. If a required review cannot complete, report it as incomplete.
