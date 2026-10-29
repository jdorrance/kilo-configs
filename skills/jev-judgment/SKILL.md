---
name: jev-judgment
description: Parameter schemas and contract rules for invoking @jkudish/jev-mcp tools (jev_find, jev_rerank, jev_decide, jev_noul, jev_classify, jev_compare, jev_extract, jev_audit, jev_screen, jev_review, jev_verify, jev_gate). Load only when calling a jev_* MCP tool.
---

# Jev System One Judgment Playbook (`@jkudish/jev-mcp`)

Use `@jkudish/jev-mcp` selectively when a fast typed probability judgment saves multi-turn LLM deliberation. Always account for the calling model's output-token cost when serializing tool arguments—keep candidate texts and diffs concise.

## 1. Candidate Reranking & Extraction (After Initial Retrieval)
- **`jev_find` & `jev_rerank` Are Rerankers, Not File Searchers**:
  - Neither tool reads files from disk, and each candidate's `text` is truncated at 2,000 characters (`jev_rerank` also enforces a 100,000-character aggregate budget).
  - First retrieve bounded snippets via `grep`, `glob`, `semantic_search`, or `@explore`, then call `jev_find` (single best match + `exists_verdict`: `answered` | `partial` | `absent`) or `jev_rerank` (relevance-sorted ordering) only when the shortlist is ambiguous. (Note: the tool name is `jev_rerank`, never `jev_rank`.)
- **`jev_extract` & `jev_audit`**:
  - Use `jev_extract` (`{ "document": "...", "fields": [{ "id": "...", "pattern": "regex", "description": "..." }] }`) to pull verbatim regex matches without model fabrication, and `jev_audit` to flag hallucinated or omitted values (`p_wrong`).

## 2. Bounded Decisions, Hypothesis Calibration & Screening
- **`jev_decide`**: Evaluate 2–6 bounded options against `evidence`, `priorities`, and `requirements` (`escalate_on_contradiction: true`).
  - Always inspect `recommendation.selected` and `status` when a recommendation is escaped or withdrawn:
    - `ask_user`: ask the user for the missing preference or approval.
    - `investigate`: gather the missing technical fact from the repository.
    - `none`: reconsider the candidate set or report that none qualifies.
    - `status: "escalate"` / `selected: null`: resolve the contradicted requirement before acting.
- **`jev_noul`**: Batch-score up to 64 hypotheses/propositions (`[0,1]`) with a stack trace or snippet as `context` (useful for ranking genuinely ambiguous root-cause hypotheses in `debug` mode).
- **`jev_classify` & `jev_compare`**: Use `jev_classify` for batch labeling against a class catalog and `jev_compare` to check whether two passages (`passage_a`, `passage_b`) state the `same_fact`, `contradicts`, or `different_facts` (e.g., docs vs. implementation).
- **`jev_screen` (Optional Assessment of Retrieved Text)**:
  - Evaluates `text` for `injection`, `substance`, and `relevance` (`pass`, `review`, `block`, `skip`).
  - Because a model calling `jev_screen` must already have `text` in its context to pass it as an argument, it is an assessment of already-retrieved text rather than a pre-ingestion firewall unless called inside an isolated scout or external wrapper.

## 3. Advisory Patch Review & Evidence Verification
- **`jev_review`, `jev_verify`, and `jev_gate`**:
  - `jev_review` scores a proposed diff for correctness, spec match, test gap, and blast radius.
  - `jev_verify` checks specific claims against supplied `evidence` (`verified`, `contradicted`, `unsupported`).
  - `jev_gate` combines diff review with claim verification. **Critical contract**: `jev_gate` checks completion claims strictly against its `evidence` argument (not its `tests` or `diff` fields)—if you claim tests or typechecks passed, include the actual command output excerpts in `evidence`, and handle `auto`, `review`, and `escalate` actions explicitly.
  - Treat Jev reviews as an **advisory signal**, not a proof of "zero regressions."
