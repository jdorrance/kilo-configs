# Kilo Code — Tiered Multi-Agent & Cache-Aware Configuration

A production-ready global configuration (`~/.config/kilo`) for [Kilo Code](https://kilo.ai/docs) (VS Code, JetBrains, and CLI) engineered for **low cost per verified result, high prompt-cache affinity, and disciplined multi-agent execution** across [OpenRouter](https://openrouter.ai/docs/quickstart), [Jev System One MCP](https://www.npmjs.com/package/@jkudish/jev-mcp), [Context7 MCP](https://github.com/upstash/context7), and optional local [Ollama](https://ollama.com/) inference.

## Key Architectural Decisions

1. **Cross-Provider Replay Risk Reduction in Router Pools & Direct Profiles**:
   - In [`typesafe/jev-router`](https://openrouter.ai/docs/guides/routing/routers/jev-router), `models` is a **preferred pool with fallback** while `excluded_models` is a hard restriction. Our router pools prefer `deepseek/deepseek-v4.1-flash` (plaintext reasoning) and OpenAI (`gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.1-sol`), hard-exclude `anthropic/*`, `google/*`, and `x-ai/*`, and ignore `azure` and `amazon-bedrock` hosting endpoints to reduce the risk of mixing incompatible encrypted reasoning blobs within a single chat transcript.
   - Direct OpenAI profiles (`gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.1-sol`) set `"provider": { "only": ["openai"] }` and direct Anthropic profiles (`claude-sonnet-5.5`, `claude-opus-5.5`) set `"provider": { "only": ["anthropic"] }` (relying on Kilo's native Claude cache-breakpoint injection rather than a duplicate top-level `cache_control` field).
2. **Native Prompt & Tool Preservation Where Possible**:
   - Custom implementation workers (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`) omit custom `prompt` overrides so they receive [Kilo's model-family coding prompt](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/session/llm/request.ts) (`SystemPrompt.provider(input.model)`) and model-specific tools (such as GPT's `apply_patch` on `@mid-surgeon`).
   - Built-in `ask`, `plan`, `debug`, and `explore` omit custom `prompt` and `permission` overrides so they keep Kilo's native role prompts and read-only shell hardening intact.
   - **Router vs. Fixed-Model Tradeoff**: Because `typesafe/jev-router` is an opaque router ID at request construction time, Kilo uses generic model prompts/tools on `code`. Switching to `code-pinned` (or setting `model` and `agent.code.model` directly to `openrouter/openai/gpt-6.1-terra` so native `plan` → `code` handoffs stay on Terra) activates native GPT prompt and `apply_patch` specialization.
3. **OpenRouter `prompt_cache_key` Normalization Plugin ([`plugin/openrouter-session.ts`](./plugin/openrouter-session.ts))**:
   Automatically loaded by Kilo at startup ([Kilo Plugins Docs](https://kilo.ai/docs/automate/extending/plugins)), this lightweight `chat.params` hook normalizes Kilo's camelCase `promptCacheKey` into OpenRouter's documented snake_case `prompt_cache_key` field alongside Kilo's native `X-Session-Id` header ([OpenRouter Prompt Caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching)).
4. **Correctly Namespaced MCP Permissions (`jev_jev_*`) & Shared-Tree Git Guardrails**:
   - Per [Kilo's MCP namespacing (`{server}_{tool}`)](https://kilo.ai/docs/automate/mcp/using-in-kilo-code), `@jkudish/jev-mcp` tools are controlled via `jev_jev_*` rules: completely disabled on `@fast-worker` and `@general`, strictly allowlisted (`"*": "deny"`) to `jev_jev_find` + `jev_jev_rerank` on `@file-picker`, and scoped to decision/review tools on `@mid-surgeon` and `@deep-surgeon`.
   - Both `code` and `code-pinned` include auto-allow rules for common read-only Git and test/lint/typecheck commands so localized verification doesn't stall on approval prompts, while shared-tree subagents (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`, `@general`) deny direct `git add*`, `git stash*`, and `git commit*` commands as guardrails (use `/sandbox` when you need OS-level `.git` write enforcement).

## Architecture & Routing Matrix

### 1. Primary Modes & Housekeeping

| Agent / Mode | Assigned Model / Router | Role & Behavior |
|---|---|---|
| **`code`** *(default)* | [`openrouter/typesafe/jev-router`](https://openrouter.ai/typesafe/jev-router) *(medium tier)* | Adaptive primary mode (prefers `deepseek-v4.1-flash`, `gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.1-sol`; excludes `anthropic/*`, `google/*`, `x-ai/*` and ignores `azure`/`amazon-bedrock`). |
| **`code-pinned`** | [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) | Fixed-model custom primary mode (`Tab` / `/agents`) with `question`, `suggest`, and `plan_enter` allowed, activating native GPT prompt and `apply_patch`. *(Note: native `plan` handoffs always target `code`; pin `agent.code.model` to Terra if you want `plan` handoffs to land on Terra by default.)* |
| **`plan`** | `openrouter/jev-router-high` | Native architecture and specification mode (prefers `gpt-6.1-terra`, `gpt-6.1-sol`; writes plans to `.kilo/plans/`). |
| **`debug`** | `openrouter/jev-router-high` | Native systematic root-cause diagnosis and minimal-reproducer isolation (prefers `gpt-6.1-terra`, `gpt-6.1-sol`). |
| **`ask`** | `openrouter/jev-router-low` | Low-cost, read-only codebase Q&A (prefers `deepseek-v4.1-flash`, `gpt-6-luna`, `gpt-6.1-terra`) with native read-only hardening intact. |
| **`compaction`** | [`openrouter/openai/gpt-6-luna`](https://openrouter.ai/openai/gpt-6-luna) | Long-session context condensation pinned to `openai` hosting. |
| **`title` / `summary`** | `openrouter/deepseek/deepseek-v4.1-flash` | Low-latency title and summary generation (`reasoning.effort: "low"`). |

### 2. Specialist Subagents (`mode: "subagent"`)

Invoke any subagent directly in chat with `@agent-name` or let the primary agent delegate via `task` (`steps` acts as a loop-control aid rather than a hard dollar cap):

| Subagent | Pinned Model | Reasoning & Step Aid | Specialty & Tool Surface |
|---|---|---|---|
| **`@explore`** | `openrouter/deepseek/deepseek-v4.1-flash` | `effort: low`, `steps: 10` | Default fast read-only codebase exploration (`semantic_search`, `grep`, `glob`, `read`). |
| **`@file-picker`** | `openrouter/deepseek/deepseek-v4.1-flash` | `effort: low`, `steps: 8` | Opt-in structured path/symbol/contract inventory (`prompts/file-picker.md`). Strict `"*": "deny"` allowlist permitting only `read`, `glob`, `grep`, `list`, `semantic_search`, `skill`, `board_*`, `jev_jev_find`, and `jev_jev_rerank`. |
| **`@local-scout`** | `ollama/qwen3-coder:30b` *(Local)* | Default sampling, `steps: 8` | Local Ollama generation (zero model API generation charge; note that `semantic_search` still queries OpenRouter embeddings, and if compaction triggers it uses the global `compaction` model). Pass file paths to summarize large logs or diffs. |
| **`@fast-worker`** | `openrouter/deepseek/deepseek-v4.1-flash` | `effort: low`, `steps: 20` | Mechanical coding worker for bounded edits, boilerplate, schemas, UI components, and routine tests (`jev_*` disabled; direct `git add`/`stash` denied). |
| **`@mid-surgeon`** | [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) | Default (`medium`), `steps: 25` | Multi-file feature implementation, state/API wiring, migrations, and refactors with native GPT prompt and `apply_patch` (`jev_jev_decide`/`review`/`gate` allowed). |
| **`@deep-surgeon`** | `openrouter/google/gemini-4-argon` | Default (`medium`), `steps: 30` | High-complexity specialist for hard escalations, concurrency/security invariants, or cross-module synthesis in an isolated subagent transcript. |

### 3. Direct Manual Model Profiles (Available via `/models`)

When starting a fresh session (`/new`), you can select any configured model directly on `code`:
- **`openrouter/openai/gpt-6.1-terra`** — Balanced daily driver (`medium` default reasoning, `"only": ["openai"]`).
- **`openrouter/openai/gpt-6.1-sol`** — Flagship OpenAI model (`medium` default reasoning; select `high` variant via `/variant` when needed, `"only": ["openai"]`).
- **`openrouter/google/gemini-4-argon`** — 1M-token context window specialist (`65,536` per-request output limit).
- **`openrouter/anthropic/claude-sonnet-5.5`** — **$2 / $10 per 1M tokens**; third-vendor implementation & debugging alternative (`"only": ["anthropic"]`, using Kilo's native Claude cache breakpoints).
- **`openrouter/anthropic/claude-opus-5.5`** — **$4 / $20 per 1M tokens**; manual-only flagship for demanding architectural or verification sessions (`"only": ["anthropic"]`).

## Repository Layout

```text
~/.config/kilo/
├── kilo.json                                  # Global Kilo configuration (models, providers, indexing, sandbox, MCP, permissions)
├── AGENTS.md                                  # Concise global operating principles, shared worker contract & parent-owned Git rules
├── plugin/
│   └── openrouter-session.ts                  # Auto-loaded plugin normalizing promptCacheKey -> prompt_cache_key
├── prompts/                                   # Externalized extraction prompts for read-only scouts (plus reference templates)
│   ├── file-picker.md                         # Active: structured path/symbol/contract extraction prompt
│   ├── local-scout.md                         # Active: local Ollama qwen3-coder:30b scout prompt
│   ├── fast-worker.md                         # Reference template (omitted in kilo.json to preserve native model prompt)
│   ├── mid-surgeon.md                         # Reference template (omitted in kilo.json to preserve native GPT prompt)
│   └── deep-surgeon.md                        # Reference template (omitted in kilo.json to preserve native Gemini prompt)
└── skills/                                    # Progressive-disclosure Agent Skills (loaded on demand)
    ├── cost-tier-delegation/SKILL.md          # Continuity-based execution, subagents & Agent Manager worktree playbook
    ├── jev-judgment/SKILL.md                  # Contracts for jev_jev_find, jev_jev_decide, jev_jev_review, and jev_jev_gate
    ├── ponytail-yagni/SKILL.md                # 6-rung YAGNI complexity ladder (Delete -> Existing -> Stdlib -> Direct -> Minimal)
    └── verification-and-debugging/SKILL.md    # Hypothesis-driven debugging, reversible experiments & empirical verification
```

## Quickstart & Local Setup

### 1. Prerequisites

1. **[Kilo Code](https://kilo.ai/docs)** installed in VS Code, JetBrains, or via the CLI (`npm install -g @kilocode/cli`).
2. **[Node.js 22+](https://nodejs.org/)** (`node -v` >= 22) so `npx -y @jkudish/jev-mcp` can run the local Jev MCP server.
3. **An [OpenRouter API Key](https://openrouter.ai/settings/keys)** with credits loaded.
4. *(Optional)* **[Ollama](https://ollama.com/)** if you want to use `@local-scout` (`qwen3-coder:30b`).

### 2. Clone into `~/.config/kilo`

```bash
# 1. Back up your existing config if present
if [ -d "$HOME/.config/kilo" ]; then
  mv "$HOME/.config/kilo" "$HOME/.config/kilo.backup.$(date +%Y%m%d-%H%M%S)"
fi

# 2. Clone this repository into ~/.config/kilo
git clone <YOUR_REPO_URL> "$HOME/.config/kilo"
```

### 3. Configure `OPENROUTER_API_KEY`

Add your key to `~/.zshrc` (macOS) or `~/.bashrc` (Linux) and reload your shell (`source ~/.zshrc`):

```bash
export OPENROUTER_API_KEY="sk-or-v1-your-key-here"
```

> **macOS VS Code / JetBrains GUI Tip:** If you launch your IDE from Spotlight or the Dock rather than a terminal, expose the variable to macOS GUI apps with:
> ```bash
> launchctl setenv OPENROUTER_API_KEY "$OPENROUTER_API_KEY"
> ```

### 4. *(Optional)* Set Up `@local-scout` via Ollama (`qwen3-coder:30b`)

Because OpenAI-compatible `/v1` requests do not pass Ollama's `num_ctx` parameter automatically ([Ollama OpenAI Compatibility Docs](https://docs.ollama.com/api/openai-compatibility)), set a 32K context window on `qwen3-coder:30b` (or set `OLLAMA_CONTEXT_LENGTH=32768` in your Ollama server environment):

```bash
# Pull the model and set 32K num_ctx on qwen3-coder:30b
ollama pull qwen3-coder:30b
printf "FROM qwen3-coder:30b\nPARAMETER num_ctx 32768\n" | ollama create qwen3-coder:30b -f -

# Verify CONTEXT (32768) and PROCESSOR (GPU offload)
ollama ps
```

### 5. Verify Your Effective Configuration

Run these commands from any project directory ([Kilo CLI Reference](https://kilo.ai/docs/code-with-ai/platforms/cli-reference)):

```bash
kilo --version
kilo config check
kilo agent list
kilo debug agent code
kilo debug agent code-pinned
kilo debug agent general
kilo debug agent file-picker
kilo debug skill
kilo mcp list
```

## Benchmarking & Next-Step Experiments

- **Compare Routing Baselines**: Benchmark (1) `code` pinned directly to `openrouter/openai/gpt-6.1-terra` (so native `plan` → `code` handoffs and GPT `apply_patch` stay active), (2) `code` on `typesafe/jev-router`, and (3) Kilo's native [Auto Efficient](https://kilo.ai/docs/code-with-ai/agents/auto-model) or custom client router (`kilo auto router list` / `kilo auto eval`), measuring **API cost per verified accepted task** (including cache writes, retries, and human correction time).
- **Test Programmatic MCP Calling (`experimental.code_mode`)**: Try adding `"experimental": { "code_mode": true }` in [`kilo.json`](./kilo.json) to expose MCP tools through Kilo's confined JS discovery/execution runner rather than injecting every MCP tool schema upfront.
- **Test Cheap Worker Challengers**: Compare `deepseek/deepseek-v4.1-flash-1017`, `openai/gpt-6-luna`, `anthropic/claude-haiku-5.5`, or `z-ai/glm-5.3-flash` on `@fast-worker`.
- **Manage the 272K Prompt-Token Pricing Boundary**: OpenAI's `gpt-6-luna`, `gpt-6.1-terra`, and `gpt-6.1-sol` charge $1.25× on 30-minute cache writes and double input/cache rates (1.5× output) above 272,000 prompt tokens. Use deliberate `/compact` checkpoints between major task phases (rather than a global `compaction.threshold_percent` that would prematurely compact your 32K local scout).
