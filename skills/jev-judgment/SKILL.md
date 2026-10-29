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
    - `ask_user`: ask the user for the missing preference or approval (primary agents only; subagents return the question to the parent).
    - `investigate`: gather the missing technical fact from the repository.
    - `none`: reconsider the candidate set or report that none qualifies.
    - `status: "escalate"` / `selected: null`: resolve the contradicted requirement before acting.
- **`jev_jev_noul`**: Batch-score up to 64 hypotheses/propositions (`[0,1]`) with a stack trace or snippet as `context` (useful for ranking genuinely ambiguous root-cause hypotheses in `debug` mode or `@deep-surgeon`).
- **`jev_jev_classify` & `jev_jev_compare`**: Use `jev_jev_classify` for batch labeling against a class catalog and `jev_jev_compare` to check whether two passages (`passage_a`, `passage_b`) state the `same_fact`, `contradicts`, or `different_facts`.
- **`jev_jev_screen` (Assessment of Retrieved Text)**:
  - Evaluates `text` for `injection`, `substance`, and `relevance` (`pass`, `review`, `block`, `skip`).

## 3. Optional Advisory Patch Review vs. Mandatory Independent `@reviewer` Gate
- **`jev_jev_review`, `jev_jev_verify`, and `jev_jev_gate` Are Optional & Advisory**:
  - A primary agent may use `jev_jev_review` (scoring correctness, spec match, test gap, and blast radius) or `jev_jev_gate` (combining diff review with claim verification) as a fast preliminary check, but **never require both on the same diff** and **never run them as a prerequisite before every mandatory Terra review**.
  - **Never Waives `@reviewer`**: A favorable `jev_jev_review` or `jev_jev_gate` score (`auto` / `pass`) **cannot waive** the mandatory independent `@reviewer` (`openai/gpt-6.1-terra`, `medium`) gate on substantive behavioral, contract, security, data, migration, concurrency, or uncertain changes (see `AGENTS.md` and `cost-tier-delegation`).
  - **Critical `jev_jev_gate` Evidence Contract**: `jev_jev_gate` checks completion claims strictly against its `evidence` argument (not its `tests` or `diff` fields)—if you claim tests or typechecks passed, include the actual command output excerpts in `evidence`, handle truncation or invalid responses explicitly, and never treat Jev's reported confidence as a calibrated probability of zero regressions.
