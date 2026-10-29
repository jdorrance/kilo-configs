# Kilo Code — Tiered Multi-Agent & Cache-Aware Configuration

A production-ready global configuration (`~/.config/kilo`) for [Kilo Code](https://kilo.ai/docs) (VS Code, JetBrains, and CLI) engineered for **low cost per verified result, high prompt-cache affinity, and disciplined multi-agent execution** across [OpenRouter](https://openrouter.ai/docs/quickstart), [Jev System One MCP](https://www.npmjs.com/package/@jkudish/jev-mcp), [Context7 MCP](https://github.com/upstash/context7), and optional local [Ollama](https://ollama.com/) inference.

## Key Architectural Decisions

1. **Native `code` Pinned to `gpt-6.1-terra` Baseline (Plus `code-jev` for Router Comparison)**:
   - Kilo selects model-family system prompts ([`system.ts`](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/session/system.ts)) and model-specific tools such as GPT's `apply_patch` ([`registry.ts`](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/kilocode/tool/registry.ts)) based on the client-visible model ID *before* sending the request. Setting both root `model` and `agent.code.model` to [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) activates native GPT prompt/patch specialization and keeps standard `plan` → `code` handoffs aligned with your primary implementation model.
   - To compare adaptive routing against fixed-model continuity, switch to the **`code-jev`** primary mode (`openrouter/typesafe/jev-router`) via `Tab` / `/agents`, or select `openrouter/openai/gpt-6.1-sol` or Kilo's native [Auto Efficient](https://kilo.ai/docs/code-with-ai/agents/auto-model) via `/models`.
2. **Cross-Provider Replay Risk Reduction & Unit-Price Ceilings**:
   - In [`typesafe/jev-router`](https://openrouter.ai/docs/guides/routing/routers/jev-router), `models` is a **preferred pool with fallback** while `excluded_models` is a hard restriction. Router profiles prefer `deepseek/deepseek-v4.1-flash`, `openai/gpt-6-luna`, `openai/gpt-6.1-terra`, and `openai/gpt-6.1-sol`, hard-exclude `anthropic/*`, `google/*`, and `x-ai/*`, and ignore `azure` and `amazon-bedrock` to reduce cross-provider encrypted-reasoning replay errors.
   - Direct OpenAI profiles (`gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.1-sol`) set `"provider": { "only": ["openai"] }`, direct Anthropic profiles (`claude-sonnet-5.5`, `claude-opus-5.5`) set `"provider": { "only": ["anthropic"] }`, and cheap worker/scout profiles (`deepseek/deepseek-v4.1-flash`, `deepseek/deepseek-v4.1-flash-1017`, `z-ai/glm-5.3-flash`) set [`provider.max_price`](https://openrouter.ai/docs/guides/routing/provider-selection) ceilings so fallback never routes a cheap helper to an expensive provider endpoint.
3. **Preserved Native Approvals, Ordered Scout Read Filters & Plan-Mode Isolation**:
   - **No Catch-All `bash["*"] = "ask"` Shadowing**: Because [Kilo's permission evaluator](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/permission/index.ts) uses the last matching rule and already defaults to `ask` while allowing safe utilities (`rg`, `grep`, `cat`, `jq`), `code`, `code-jev`, `code-pinned`, `general`, and implementation workers omit `"*": "ask"` in `bash` and add only concrete project test/lint/typecheck approvals (`pnpm run typecheck*`, `pnpm run test*`, `pnpm run lint*`, `npm test*`, `vitest*`, `pytest*`, `cargo test*`, `go test*`) plus explicit shared-tree Git and destructive denies on subagents.
   - **Ordered Scout `read` Exclusions (Including Monorepo Nested Paths)**: Strict scouts (`@doc-summarizer`, `@file-picker`, `@local-scout`) use an ordered `read` map (`"*": "allow"` followed by denies for `coverage/**`, `*/coverage/**`, `.next/**`, `*/.next/**`, `.nuxt/**`, `*/.nuxt/**`, `.turbo/**`, `*/.turbo/**`, `*.min.js`, `*.min.css`, `*.bundle.js`, `*.map`, and `.env*`) so scalar `"read": "allow"` does not undo root generated-file filters, plus `"external_directory"` access to `/tmp/**` and `/private/tmp/**` for log files.
   - **Read-Only `plan` Delegation Guard**: Because Kilo propagates direct edit denials to child tasks but applies the child's own `bash` policy ([`task.ts`](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/kilocode/tool/task.ts)), `plan.permission.task` is restricted to read-only scouts (`explore`, `doc-summarizer`, `file-picker`, and bash-free `local-scout`).
   - **Root Web Search Enabled**: `"web_search": true` is enabled at the root of `kilo.json` so `websearch: "allow"` exposes the tool to `@explore` and `@doc-summarizer` ([Kilo Tools Docs](https://kilo.ai/docs/automate/tools)).
4. **Cache-Preserving Compaction & Narrow Session Plugin ([`plugin/openrouter-session.ts`](./plugin/openrouter-session.ts))**:
   - `"compaction": { "auto": true }` omits explicit `"prune": true` so routine normal-turn pruning does not mutate message history and invalidate cached prefixes on subsequent turns, while retaining recovery pruning ([`compaction.ts`](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/session/compaction.ts)).
   - [`plugin/openrouter-session.ts`](./plugin/openrouter-session.ts) uses only `chat.params` (normalizing Kilo's `promptCacheKey` to OpenRouter's `prompt_cache_key` for `@openrouter/ai-sdk-provider@2.9.0`) and `experimental.session.compacting` (appending state-preservation guidance), leaving native `read` outputs (`metadata.loaded`) untouched.
5. **Same-Tier Task Resumption vs. Fresh-Task Model Escalation**:
   - Because a resumed child session's stored model overrides a newly selected subagent's default model ([`task.ts`](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/kilocode/tool/task.ts)), `AGENTS.md` and `cost-tier-delegation` instruct agents to reuse `task_id` **only** when continuing the same worker and model tier, and to start a **fresh task** (without `task_id`) when escalating to `@mid-surgeon` or `@deep-surgeon`.

## Architecture & Routing Matrix

### 1. Primary Modes & Background Roles

| Agent / Setting | Assigned Model / Router | Role & Behavior |
|---|---|---|
| **`code`** *(default)* | [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) | Default primary coding mode with native GPT prompt, `apply_patch`, `"only": ["openai"]`, and direct `plan` → `code` handoff compatibility. |
| **`code-jev`** | [`openrouter/typesafe/jev-router`](https://openrouter.ai/typesafe/jev-router) *(medium tier)* | Adaptive Jev-routed primary mode (`Tab` / `/agents`) preferring `deepseek-v4.1-flash`, `gpt-6-luna`, `gpt-6.1-terra`, and `gpt-6.1-sol` for A/B comparison against fixed-model `code`. |
| **`code-pinned`** | [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) | Fixed-model primary alias matching `code`. |
| **`plan`** | `openrouter/jev-router-high` | Native architecture and specification mode (prefers `gpt-6.1-terra`, `gpt-6.1-sol`); `task` delegation restricted to read-only scouts (`explore`, `doc-summarizer`, `file-picker`, `local-scout`). |
| **`debug`** | `openrouter/jev-router-high` | Native systematic root-cause diagnosis and minimal-reproducer isolation (prefers `gpt-6.1-terra`, `gpt-6.1-sol`). |
| **`ask`** | `openrouter/jev-router-low` | Low-cost, read-only codebase Q&A (prefers `deepseek-v4.1-flash`, `gpt-6-luna`, `gpt-6.1-terra`) with native read-only hardening intact. |
| **`compaction`** | [`openrouter/openai/gpt-6-luna`](https://openrouter.ai/openai/gpt-6-luna) | Long-session context condensation and new-session `plan` handover summaries (`"only": ["openai"]`). |
| **`title` / `summary` / `small_model` / `memory_model` / `subagent_model`** | `openrouter/deepseek/deepseek-v4.1-flash` | Low-cost helpers (`max_price` capped at `$0.15/$0.40` per 1M) for titles, commit messages, prompt enhancement, automatic memory capture, and default subagent fallback. |

### 2. Specialist Subagents (`mode: "subagent"`)

Invoke any subagent directly in chat with `@agent-name` or let the primary agent delegate via `task` (`steps` acts as a loop-control aid rather than a hard dollar cap):

| Subagent | Pinned Model | Reasoning & Step Aid | Specialty & Tool Surface |
|---|---|---|---|
| **`@explore`** | `openrouter/deepseek/deepseek-v4.1-flash` | `effort: low`, `steps: 10` | Default fast read-only codebase exploration (`semantic_search`, `grep`, `glob`, `read`, `webfetch`, `websearch`). |
| **`@doc-summarizer`** | `openrouter/deepseek/deepseek-v4.1-flash` | `effort: low`, `steps: 10` | Dedicated documentation, PRD/spec, `context7_*`, and `webfetch`/`websearch` summarizer (`prompts/doc-summarizer.md`) with ordered `read` exclusions. Callable from `code`, `plan`, and `debug`. |
| **`@file-picker`** | `openrouter/deepseek/deepseek-v4.1-flash` | `effort: low`, `steps: 8` | Opt-in structured path/symbol/contract inventory with verbatim signatures (`prompts/file-picker.md`). Strict `"*": "deny"` allowlist with ordered `read` exclusions, `jev_jev_find`, and `jev_jev_rerank`. |
| **`@local-scout`** | `ollama/qwen3-coder:30b` *(Local)* | Default sampling, `steps: 8` | Strictly read-only local Ollama helper (`bash` disabled; `/tmp/**` and `.kilo/logs/**` readable) for summarizing verbose build/test logs or diffs before the parent ingests them. |
| **`@fast-worker`** | `openrouter/deepseek/deepseek-v4.1-flash` | `effort: low`, `steps: 20` | Mechanical coding worker for bounded edits with clear expected behavior: boilerplate, schemas, formatting, and routine unit tests (`jev_*` and `todowrite` disabled; shared-tree Git denies). |
| **`@mid-surgeon`** | [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) | Default (`medium`), `steps: 25` | Multi-file feature implementation, state/API wiring, migrations, and refactors with native GPT prompt and `apply_patch` (`jev_jev_decide`/`review`/`gate` allowed; `todowrite` denied). |
| **`@deep-surgeon`** | `openrouter/google/gemini-4-argon` | Default (`medium`), `steps: 30` | High-complexity specialist for hard escalations, concurrency/security invariants, or cross-module synthesis in an isolated subagent transcript (`todowrite` denied). |
| **`@general`** *(Built-in)* | [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) | Default (`medium`) | Preserved native general-purpose researcher and multi-step subagent with native shell approvals and shared-tree Git guardrails. |

### 3. Direct Manual & Candidate Model Profiles (Available via `/models`)

When starting a fresh session (`/new`), you can select any configured model directly on `code`:
- **`openrouter/openai/gpt-6.1-terra`** — Default balanced daily driver (`medium` default reasoning, `"only": ["openai"]`).
- **`openrouter/openai/gpt-6.1-sol`** — Flagship OpenAI model (`medium` default reasoning; select `high` variant via `/variant` when needed, `"only": ["openai"]`).
- **`openrouter/deepseek/deepseek-v4.1-flash-1017`** — Dated October 17 snapshot ([OpenRouter](https://openrouter.ai/deepseek/deepseek-v4.1-flash-1017)) with `max_price` guard for testing against unsuffixed `deepseek-v4.1-flash`.
- **`openrouter/z-ai/glm-5.3-flash`** — Candidate fast coding/agent worker with `max_price` guard for comparing reliability and output efficiency against Flash.
- **`openrouter/google/gemini-4-argon`** — 1M-token context window specialist (`65,536` per-request output ceiling).
- **`openrouter/anthropic/claude-sonnet-5.5`** — **$2 / $10 per 1M tokens**; third-vendor implementation & debugging alternative (`"only": ["anthropic"]`, using Kilo's native Claude cache breakpoints).
- **`openrouter/anthropic/claude-opus-5.5`** — **$4 / $20 per 1M tokens**; manual-only flagship for demanding architectural or verification sessions (`"only": ["anthropic"]`).

## Repository Layout

```text
~/.config/kilo/
├── kilo.json                                  # Global Kilo configuration (models, providers, indexing, sandbox, MCP, permissions)
├── AGENTS.md                                  # Concise global operating principles, fresh-task escalation & parent-owned Git rules
├── plugin/
│   └── openrouter-session.ts                  # Typed plugin normalizing promptCacheKey -> prompt_cache_key & compaction state
├── prompts/                                   # Externalized extraction prompts for read-only scouts (plus reference templates)
│   ├── doc-summarizer.md                      # Active: documentation, spec, Context7 & web synthesis prompt
│   ├── file-picker.md                         # Active: structured path/symbol/signature/contract extraction prompt
│   ├── local-scout.md                         # Active: read-only local Ollama qwen3-coder:30b log/diff scout prompt
│   ├── fast-worker.md                         # Reference template (omitted in kilo.json to preserve native model prompt)
│   ├── mid-surgeon.md                         # Reference template (omitted in kilo.json to preserve native GPT prompt)
│   └── deep-surgeon.md                        # Reference template (omitted in kilo.json to preserve native Gemini prompt)
└── skills/                                    # Progressive-disclosure Agent Skills (loaded on demand)
    ├── cost-tier-delegation/SKILL.md          # Cache economics, fresh-task escalation, subagents & Agent Manager worktree playbook
    ├── jev-judgment/SKILL.md                  # Contracts for jev_jev_find, jev_jev_decide, jev_jev_review, and jev_jev_gate
    ├── ponytail-yagni/SKILL.md                # 6-rung YAGNI complexity ladder (Delete -> Existing -> Stdlib -> Direct -> Minimal)
    └── verification-and-debugging/SKILL.md    # Hypothesis-driven debugging, reversible experiments & empirical verification
```

## Quickstart & Local Setup

### 1. Prerequisites

1. **[Kilo Code](https://kilo.ai/docs)** installed in VS Code, JetBrains, or via the CLI (`npm install -g @kilocode/cli`).
2. **[Node.js 22+](https://nodejs.org/)** (`node -v` >= 22) so `npx -y @jkudish/jev-mcp` can run the local Jev MCP server (once you validate a specific release in your environment, you can pin `@jkudish/jev-mcp@<version>` in `kilo.json` to prevent upstream drift).
3. **An [OpenRouter API Key](https://openrouter.ai/settings/keys)** with credits loaded.
4. *(Optional)* **[Ollama](https://ollama.com/)** if you want to use `@local-scout` (`qwen3-coder:30b`).

### 2. Configure `OPENROUTER_API_KEY`

Add your key to `~/.zshrc` (macOS) or `~/.bashrc` (Linux) and reload your shell (`source ~/.zshrc`):

```bash
export OPENROUTER_API_KEY="sk-or-v1-your-key-here"
```

> **macOS VS Code / JetBrains GUI Tip:** If you launch your IDE from Spotlight or the Dock rather than a terminal, expose the variable to macOS GUI apps with:
> ```bash
> launchctl setenv OPENROUTER_API_KEY "$OPENROUTER_API_KEY"
> ```

### 3. *(Optional)* Set Up & Warm `@local-scout` via Ollama (`qwen3-coder:30b`)

Because OpenAI-compatible `/v1` requests do not pass Ollama's `num_ctx` parameter automatically ([Ollama OpenAI Compatibility Docs](https://docs.ollama.com/api/openai-compatibility)) and [Ollama unloads idle models after 5 minutes by default](https://docs.ollama.com/faq), configure a 32K context window, warm the model before inspecting `ollama ps`, and set `OLLAMA_KEEP_ALIVE` on an always-on workstation:

```bash
ollama pull qwen3-coder:30b
printf "FROM qwen3-coder:30b\nPARAMETER num_ctx 32768\n" | ollama create qwen3-coder:30b -f -

# Optional: create a separate custom tag if you want to keep the base pullable tag untouched
printf "FROM qwen3-coder:30b\nPARAMETER num_ctx 32768\n" | ollama create qwen3-coder-scout-32k -f -

# Warm the model with a 30-minute keep-alive and verify residency (32768 context)
curl -s http://localhost:11434/api/generate -d '{"model": "qwen3-coder:30b", "keep_alive": "30m"}' > /dev/null
ollama ps
```

### 4. Verify Effective Runtime Configuration

Because Kilo's runtime supports fields (`indexing`, `sandbox`, `subagent_model`, `web_search`) ahead of the hosted JSON schema, validate against your installed CLI ([Kilo CLI Reference](https://kilo.ai/docs/code-with-ai/platforms/cli-reference)):

```bash
kilo --version
kilo config check
kilo agent list
kilo debug agent code
kilo debug agent plan
kilo debug agent doc-summarizer
kilo debug agent fast-worker
kilo debug skill
kilo mcp list
```

## Controlled Benchmark & Experiment Roadmap

Evaluate configuration changes against **Cost per Verified Accepted Task** ($\frac{\text{Total billed cost of all attempted runs}}{\text{Number of accepted outcomes}}$), paired with end-to-end latency and human correction effort across 7 representative repository tasks (tiny known-file edit, unfamiliar-repo feature, verbose failing build, cross-file bug, external API/doc research, long session reaching compaction, and post-failure escalation):

1. **Four-Way Primary Architecture Comparison**:
   - **Baseline A (`code` pinned to `openai/gpt-6.1-terra`)**: Full native GPT prompt, `apply_patch`, and 30-minute OpenAI prompt-cache continuity.
   - **Candidate B (`code` pinned to `openai/gpt-6.1-sol`)**: Tests whether higher first-pass completion reduces retries enough to beat Terra's unit price.
   - **Candidate C (Kilo Native [Auto Efficient](https://kilo.ai/docs/code-with-ai/agents/auto-model) with a small custom pool)**: Tests Kilo's session-aware difficulty routing while preserving native client integration.
   - **Candidate D (`code-jev` on `typesafe/jev-router`)**: Tests whether Jev's per-turn routing savings outweigh generic prompt selection and cross-model cache transitions.
2. **Cache & Provider Routing Experiments**:
   - **Routine Pruning (`compaction.prune`)**: Compare default omitted `prune` (recovery-only pruning, preserving cached prefixes) against `"compaction": { "auto": true, "prune": true }` on long sessions, watching the **272K prompt-token boundary** on Terra/Sol (where input/cache rates double and output rates increase 1.5×; [OpenAI Pricing](https://developers.openai.com/api/docs/models/gpt-6.1-terra)).
   - **Provider Sorting on Flash Loops**: Compare OpenRouter's [default provider routing](https://openrouter.ai/blog/announcements/how-we-rebuilt-provider-routing/) against `"sort": "price"` on `deepseek/deepseek-v4.1-flash` to see whether opting out of [Auto Exacto tool-calling provider switches](https://openrouter.ai/docs/guides/routing/auto-exacto) improves cache hit rates.
3. **Experimental Native Code Mode (`"experimental": { "code_mode": true }`)**:
   - Routes MCP calls through confined JavaScript with on-demand tool discovery ([Code Mode Implementation](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/tool/code-mode.ts)).
   - **Important Compatibility Rule**: Enabling `code_mode` replaces direct MCP tool exposure with the `execute` tool ([`tools.ts`](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/session/tools.ts)). When testing `code_mode: true`, add `"execute": "allow"` to `@doc-summarizer` and `@file-picker` so their `"*": "deny"` allowlists do not block MCP execution.
