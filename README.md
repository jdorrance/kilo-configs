# Kilo Code — Tiered Multi-Agent & Cache-Aware Configuration

A production-ready global configuration (`~/.config/kilo`) for [Kilo Code](https://kilo.ai/docs) (VS Code, JetBrains, and CLI) engineered for **low cost per verified result, high prompt-cache affinity, and disciplined multi-agent execution** across [OpenRouter](https://openrouter.ai/docs/quickstart), [Jev System One MCP](https://www.npmjs.com/package/@jkudish/jev-mcp), [Context7 MCP](https://github.com/upstash/context7), and optional local [Ollama](https://ollama.com/) inference.

## Key Architectural Decisions

1. **Single Encrypted-Reasoning Family in Router Pools**:
   `typesafe/jev-router`, `jev-router-low`, and `jev-router-high` route exclusively across `deepseek-v4.1-flash` (plaintext reasoning) and OpenAI (`gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.1-sol`) with `"ignore": ["azure"]`. This prevents OpenRouter's `encrypted reasoning or compaction content from multiple providers` error, while keeping `gemini-4-argon` (`@deep-surgeon`) in an isolated subagent transcript and `claude-sonnet-5.5` / `claude-opus-5.5` (`"only": ["anthropic"]`) available for dedicated manual sessions.
2. **Native Prompt & Tool Preservation Where Possible**:
   - Custom implementation workers (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`) omit custom `prompt` overrides so they receive [Kilo's model-family coding prompt](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/session/llm/request.ts) (`SystemPrompt.provider(input.model)`) and model-specific tools (such as GPT's `apply_patch` on `@mid-surgeon`).
   - Built-in `ask`, `plan`, `debug`, and `explore` omit custom `prompt` and `permission` overrides so they keep Kilo's native role prompts and read-only shell hardening intact.
   - Because `typesafe/jev-router` is an opaque router ID at request construction time, Kilo uses generic model prompts/tools on `code`, whereas switching to `code-pinned` (or selecting `openrouter/openai/gpt-6.1-terra` directly on `code`) activates native GPT prompt and `apply_patch` specialization.
3. **OpenRouter Session & Cache-Key Normalization Plugin ([`plugin/openrouter-session.ts`](./plugin/openrouter-session.ts))**:
   Automatically loaded by Kilo at startup ([Kilo Plugins Docs](https://kilo.ai/docs/automate/extending/plugins)), this lightweight `chat.params` hook normalizes Kilo's camelCase `promptCacheKey` into OpenRouter's documented `prompt_cache_key` and `session_id` fields ([OpenRouter Prompt Caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching)).
4. **Correctly Namespaced MCP Tool Permissions (`jev_jev_*`) & Parent-Owned Git State**:
   - Per [Kilo's MCP namespacing (`{server}_{tool}`)](https://kilo.ai/docs/automate/mcp/using-in-kilo-code), `@jkudish/jev-mcp` tools are controlled via `jev_jev_*` rules: completely disabled on `@fast-worker`, scoped to `jev_jev_find` + `jev_jev_rerank` on `@file-picker`, and scoped to decision/review tools on `@mid-surgeon` and `@deep-surgeon`.
   - Shared-tree coding workers deny `git add*`, `git stash*`, and `git commit*` so concurrent subagents never corrupt the shared Git index or stash stack.

## Architecture & Routing Matrix

### 1. Primary Modes & Housekeeping

| Agent / Mode | Assigned Model / Router | Role & Behavior |
|---|---|---|
| **`code`** *(default)* | [`openrouter/typesafe/jev-router`](https://openrouter.ai/typesafe/jev-router) *(medium tier)* | Adaptive primary mode (`deepseek-v4.1-flash`, `gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.1-sol`; excludes `anthropic/*`, `google/*`, `x-ai/*` and ignores `azure`). |
| **`code-pinned`** | [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) | Fixed-model primary mode (`Tab` / `/agents`) with explicit `question`, `suggest`, and `plan_enter` permissions, activating native GPT prompt and `apply_patch`. |
| **`plan`** | `openrouter/jev-router-high` | Native architecture and specification mode (`gpt-6.1-terra`, `gpt-6.1-sol`; writes plans to `.kilo/plans/`). |
| **`debug`** | `openrouter/jev-router-high` | Native systematic root-cause diagnosis and minimal-reproducer isolation (`gpt-6.1-terra`, `gpt-6.1-sol`). |
| **`ask`** | `openrouter/jev-router-low` | Low-cost, read-only codebase Q&A (`deepseek-v4.1-flash`, `gpt-6-luna`, `gpt-6.1-terra`) with native read-only hardening intact. |
| **`compaction`** | [`openrouter/openai/gpt-6-luna`](https://openrouter.ai/openai/gpt-6-luna) | Long-session context condensation within the OpenAI provider family. |
| **`title` / `summary`** | `openrouter/deepseek/deepseek-v4.1-flash` | Low-latency title and summary generation (`reasoning.effort: "low"`). |

### 2. Specialist Subagents (`mode: "subagent"`)

Invoke any subagent directly in chat with `@agent-name` or let the primary agent delegate via `task`:

| Subagent | Pinned Model | Reasoning & Step Cap | Specialty & Tool Surface |
|---|---|---|---|
| **`@explore`** | `openrouter/deepseek/deepseek-v4.1-flash` | `effort: low`, `steps: 10` | Default fast read-only codebase exploration (`semantic_search`, `grep`, `glob`, `read`). |
| **`@file-picker`** | `openrouter/deepseek/deepseek-v4.1-flash` | `effort: low`, `steps: 8` | Opt-in structured path/symbol/contract inventory (`prompts/file-picker.md`). `bash` and `edit` denied; only `jev_jev_find` and `jev_jev_rerank` allowed from MCP. |
| **`@local-scout`** | `ollama/qwen3-coder:30b` *(Local)* | Default sampling, `steps: 8` | Local Ollama inference (no model API generation charge; note `semantic_search` still queries OpenRouter embeddings unless switched to local Ollama embeddings). Pass file paths to summarize large logs or diffs. |
| **`@fast-worker`** | `openrouter/deepseek/deepseek-v4.1-flash` | `effort: low`, `steps: 20` | Mechanical coding worker for bounded edits, boilerplate, schemas, UI components, and routine tests (`jev_*` disabled; `git add`/`stash` denied). |
| **`@mid-surgeon`** | [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) | Default (`medium`), `steps: 25` | Multi-file feature implementation, state/API wiring, migrations, and refactors with native GPT prompt and `apply_patch` (`jev_jev_decide`/`review`/`gate` allowed). |
| **`@deep-surgeon`** | `openrouter/google/gemini-4-argon` | Default (`medium`), `steps: 30` | High-complexity specialist for hard escalations, concurrency/security invariants, or cross-module synthesis in an isolated subagent transcript. |

### 3. Direct Manual Model Profiles (Available via `/models`)

When starting a fresh session (`/new`), you can select any configured model directly on `code`:
- **`openrouter/openai/gpt-6.1-terra`** — Balanced daily driver (`medium` default reasoning, `openai` hosting).
- **`openrouter/openai/gpt-6.1-sol`** — Flagship OpenAI model (`medium` default reasoning; select `high` variant via `/variant` when needed).
- **`openrouter/google/gemini-4-argon`** — 1M-token context window specialist (`65,536` per-request output limit).
- **`openrouter/anthropic/claude-sonnet-5.5`** — **$2 / $10 per 1M tokens**; third-vendor implementation & debugging alternative with top-level `cache_control: { type: "ephemeral" }` and `"only": ["anthropic"]`.
- **`openrouter/anthropic/claude-opus-5.5`** — **$4 / $20 per 1M tokens**; manual-only flagship for demanding architectural or verification sessions.

## Repository Layout

```text
~/.config/kilo/
├── kilo.json                                  # Global Kilo configuration (models, providers, indexing, sandbox, MCP, permissions)
├── AGENTS.md                                  # Concise global operating principles, shared worker contract & parent-owned Git rules
├── plugin/
│   └── openrouter-session.ts                  # Auto-loaded plugin normalizing promptCacheKey -> prompt_cache_key & session_id
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

### 4. *(Optional)* Set Up `@local-scout` via Ollama with a Dedicated 32K Context Tag

Because OpenAI-compatible `/v1` requests do not pass Ollama's `num_ctx` parameter automatically ([Ollama OpenAI Compatibility Docs](https://docs.ollama.com/api/openai-compatibility)), create a dedicated 32K model tag (or configure `qwen3-coder:30b`) and verify residency with `ollama ps`:

```bash
# Pull the base model and bake 32K num_ctx into a dedicated tag (or qwen3-coder:30b)
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
kilo debug agent mid-surgeon
kilo debug agent file-picker
kilo debug skill
kilo mcp list
```

## Benchmarking & Next-Step Experiments

- **Compare Routing Baselines**: Benchmark (1) `code` with `typesafe/jev-router`, (2) `code-pinned` (or `code` set directly to `openrouter/openai/gpt-6.1-terra`), and (3) Kilo's native [Auto Efficient](https://kilo.ai/docs/code-with-ai/agents/auto-model) or custom client router (`kilo auto router list` / `kilo auto eval`) on 12–20 representative tasks, tracking **cost per verified accepted result** and human correction time.
- **Test a Cheap Worker Challenger**: Try `z-ai/glm-5.3-flash` or `minimax/minimax-m3.1-flash` on `@fast-worker` against `deepseek/deepseek-v4.1-flash` (`reasoning.effort: "low"`).
- **Watch the 272K Prompt-Token Pricing Cliff**: OpenAI's `gpt-6-luna`, `gpt-6.1-terra`, and `gpt-6.1-sol` double their input/cache rates above 272,000 prompt tokens—prefer compacting or starting a fresh session (`/new`) once a task is complete rather than letting a single session grow toward 1M tokens.
