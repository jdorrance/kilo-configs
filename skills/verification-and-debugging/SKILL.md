---
name: verification-and-debugging
description: Systematic root-cause debugging, reproduction-first TDD, and empirical verification-before-completion workflow. Load when diagnosing non-trivial bugs, test failures, or verifying complex multi-file changes.
---

# Systematic Debugging, TDD & Verification Before Completion

Use this workflow to avoid speculative "shotgun debugging" that burns turns and corrupts the working tree.

## 1. Systematic Debugging (Diagnostic Evidence Before Permanent Edits)
Avoid blind fixes hoping tests will turn green:
1. **Capture Exact Failure Evidence**: Read the full error message, stack trace, and failing assertion line (if test/build output is huge, tee it to `.kilo/logs/` or `/tmp/`, filter deterministically with `rg`, or have `@local-scout` summarize the failure before flooding the parent context).
2. **Isolate the Fault Path**: Trace inputs and state transitions from the failure site backward to the first point where actual state diverges from expected state.
3. **Rank Ambiguous Hypotheses**: If 2–5 plausible root causes exist, formulate falsifiable hypotheses (and optionally score them with `jev_jev_noul` if available in your role, passing the stack trace + snippet as `context`).
4. **Seek Reproduction or Reversible Diagnostic Evidence**: Seek a deterministic reproduction test or command when feasible. For flaky, timing-dependent, or environment-specific bugs, use small, reversible experiments or targeted diagnostic instrumentation to distinguish hypotheses. If the failure cannot be reproduced locally, explicitly report that limitation and verify the affected contracts.

## 2. Pragmatic Test-Driven Execution
- **Bug Fixes**: Write or update a focused test that captures the bug when reproducible, apply the minimal fix, and verify the test passes.
- **New Features / Refactors**: Establish an affected baseline when it helps distinguish pre-existing failures (avoiding repeated unchanged full-suite runs), implement the minimal change following the YAGNI ladder, and add targeted tests covering the new behavior and boundary conditions.

## 3. Empirical Verification Before Completion
Never declare a task "done" or "fixed" based solely on reading your own diff or a probabilistic `jev_jev_review` score:
1. **Run the Smallest Relevant Check First**: Execute the specific unit test, `tsc --noEmit`, `ruff check`, `cargo check`, or `go test` covering the touched files.
2. **Broaden When Shared Contracts Change**: If you modified shared types, exports, or middleware, run the broader package or integration test suite.
3. **Inspect `git diff` / `git status`**: Confirm no unintended files, temporary instrumentation, or formatting noise were left behind.
4. **Report Honest Evidence**: Always state the exact verification commands executed, whether each `passed`, `failed`, or was `not run` (with reason), and any residual assumptions.
