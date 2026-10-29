---
name: jev-judgment
description: Parameter schemas and contract rules for invoking @jkudish/jev-mcp tools (namespaced in Kilo as jev_jev_find, jev_jev_rerank, jev_jev_decide, jev_jev_noul, jev_jev_classify, jev_jev_compare, jev_jev_extract, jev_jev_audit, jev_jev_screen, jev_jev_review, jev_jev_verify, jev_jev_gate). Load only when calling a jev_jev_* MCP tool.
---

# Jev System One Judgment Playbook (`@jkudish/jev-mcp`)

Use `@jkudish/jev-mcp` selectively when a fast typed judgment saves multi-turn LLM deliberation. Because the MCP server is registered under `"jev"`, Kilo prefixes its tools as `jev_jev_<tool>` (e.g., `jev_jev_find`, `jev_jev_decide`). Keep candidate texts and diffs concise (prefer file-scoped diffs on multi-file changes) and handle truncation or invalid responses explicitly.

## 1. Candidate Reranking & Extraction (After Initial Retrieval)
- **`jev_jev_find` & `jev_jev_rerank` Are Rerankers, Not File Searchers**:
  - Neither tool reads files from disk, and each candidate's `text` is truncated at 2,000 characters (`jev_jev_rerank` also enforces a 100,000-character aggregate budget).
  - First retrieve bounded snippets via `grep`, `glob`, `semantic_search`, or `@explore`, then call `jev_jev_find` (single best match + `exists_verdict`: `answered` | `partial` | `absent`) or `jev_jev_rerank` (relevance-sorted ordering) only when the shortlist is ambiguous.
- **`jev_jev_extract` & `jev_jev_audit`**:
  - Use `jev_jev_extract` (`{ "document": "...", "fields": [{ "id": "...", "pattern": "regex", "description": "..." }] }`) to pull verbatim regex matches without model fabrication, and `jev_jev_audit` to flag hallucinated or omitted values (`p_wrong`).

## 2. Bounded Decisions, Hypothesis Calibration & Screening
- **`jev_jev_decide`**: Evaluate 2–6 bounded options against `evidence`, `priorities`, and `requirements` (`escalate_on_contradiction: true`).
  - Always inspect `recommendation.selected` and `status` when a recommendation is escaped or withdrawn:
    - `ask_user`: ask the user for the missing preference or approval.
    - `investigate`: gather the missing technical fact from the repository.
    - `none`: reconsider the candidate set or report that none qualifies.
    - `status: "escalate"` / `selected: null`: resolve the contradicted requirement before acting.
- **`jev_jev_noul`**: Batch-score up to 64 hypotheses/propositions (`[0,1]`) with a stack trace or snippet as `context` (useful for ranking genuinely ambiguous root-cause hypotheses in `debug` mode or `@deep-surgeon`).
- **`jev_jev_classify` & `jev_jev_compare`**: Use `jev_jev_classify` for batch labeling against a class catalog and `jev_jev_compare` to check whether two passages (`passage_a`, `passage_b`) state the `same_fact`, `contradicts`, or `different_facts`.
- **`jev_jev_screen` (Assessment of Retrieved Text)**:
  - Evaluates `text` for `injection`, `substance`, and `relevance` (`pass`, `review`, `block`, `skip`).

## 3. Advisory Patch Review & Evidence Verification
- **`jev_jev_review`, `jev_jev_verify`, and `jev_jev_gate`**:
  - `jev_jev_review` scores a proposed diff (prefer file-scoped diffs on larger changes) for correctness, spec match, test gap, and blast radius.
  - `jev_jev_verify` checks specific claims against supplied `evidence` (`verified`, `contradicted`, `unsupported`).
  - `jev_jev_gate` combines diff review with claim verification. **Critical contract**: `jev_jev_gate` checks completion claims strictly against its `evidence` argument (not its `tests` or `diff` fields)—if you claim tests or typechecks passed, include the actual command output excerpts in `evidence`, and handle `auto`, `review`, and `escalate` actions explicitly.
  - Do not run both `jev_jev_review` and `jev_jev_gate` redundantly on the same diff, and never treat Jev's reported distribution concentration / confidence as a calibrated probability of "zero regressions."
