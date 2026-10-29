# Kilo Code — Tiered Multi-Agent & Cache-Aware Configuration

A production-ready global configuration (`~/.config/kilo`) for [Kilo Code](https://kilo.ai/docs) (VS Code, JetBrains, and CLI) engineered for **minimum cost per solved task, high prompt-cache affinity, and maximum reasoning capability** across [OpenRouter](https://openrouter.ai/docs/quickstart), [Jev System One MCP](https://www.npmjs.com/package/@jkudish/jev-mcp), [Context7 MCP](https://github.com/upstash/context7), and optional local [Ollama](https://ollama.com/) inference.

## Why This Architecture Exists

Most multi-model AI coding setups suffer from two hidden taxes:
1. **Prompt-Cache Thrashing**: Switching primary models mid-loop invalidates the KV prompt cache across OpenAI, Anthropic, and Google providers, forcing you to re-pay full input token rates on a 30k–100k token codebase conversation history.
2. **System Prompt Clobbering**: Overriding `agent.code.prompt` or `agent.debug.prompt` in Kilo replaces [Kilo's native model-family prompt optimizations](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/session/llm/request.ts) (`SystemPrompt.provider(input.model)`).

This repository solves both problems:
- **Zero Native Prompt Clobbering**: Primary modes (`code`, `plan`, `debug`, `ask`) keep 100% of Kilo's native tool-calling and model-specific system prompts intact. Global policy lives in [`AGENTS.md`](./AGENTS.md) and on-demand [Kilo Skills](https://kilo.ai/docs/customize/skills) (`skills/*/SKILL.md`) that load progressively only when invoked.
- **Cache-Sticky Subagent Isolation**: Multi-turn edit/test loops (>3–5 tool turns) are delegated to **model-pinned subagents** (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`) with isolated context windows, keeping provider KV caches warm (`setCacheKey: true` + Anthropic top-level `cache_control`) while keeping the main orchestrator's context lean.
- **Native AST + LanceDB Codebase Indexing**: Built-in [Tree-sitter AST chunking + LanceDB vector search](https://kilo.ai/docs/automate/codebase-indexing) (`codebase_search`) finds implementations semantically in a single turn without burning thousands of tokens on blind `grep` loops.
- **Sub-Cent System One Judgments**: Integrates [`@jkudish/jev-mcp`](https://www.npmjs.com/package/@jkudish/jev-mcp) (`jev_find`, `jev_decide`, `jev_review`, `jev_gate`) for fast, structured candidate ranking and pre-commit patch auditing without inflating the main reasoning loop.
- **Live Version-Specific Documentation**: Integrates [Context7 Remote MCP](https://github.com/upstash/context7) (`resolve-library-id`, `query-docs`) on demand to prevent hallucinated library APIs and retry loops.

## Architecture & Routing Matrix

### 1. Primary Orchestrator Modes & Housekeeping

| Agent / Mode | Assigned Model / Router | Role & Cache Behavior |
|---|---|---|
| **`code`** *(default)* | [`openrouter/typesafe/jev-router`](https://openrouter.ai/typesafe/jev-router) *(medium tier)* | Primary orchestrator; routes turns across `deepseek-v4.1-flash`, `gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.1-sol`, and `claude-sonnet-5.5`. Delegates >3–5 turn loops to pinned subagents. |
| **`plan`** | `openrouter/jev-router-high` | Read-only architecture and specification mode (`gpt-6.1-terra`, `gemini-4-argon`, `gpt-6.1-sol`, `claude-sonnet-5.5`). |
| **`debug`** | `openrouter/jev-router-high` | Root-cause diagnosis and minimal-reproducer isolation with full CLI and MCP diagnostic tooling. |
| **`ask`** | `openrouter/jev-router-low` | Low-cost, read-only codebase Q&A (`deepseek-v4.1-flash`, `gpt-6-luna`, `gemini-3.8-flash`, `gpt-6.1-terra`). |
| **`compaction` / `title` / `summary`** | `openrouter/deepseek/deepseek-v4.1-flash` | Ultra-cheap background session compaction, title generation, and PR/commit summarization. |

### 2. Model-Pinned Specialist Subagents

Invoke any subagent directly in chat with `@agent-name` or let the primary agent delegate automatically via the `task` tool:

| Subagent | Pinned Model | Parameters | Specialty & Tool Surface |
|---|---|---|---|
| **`@explore`** | `openrouter/deepseek/deepseek-v4.1-flash` | `steps: 10`, `reasoning: low` | Fast read-only codebase exploration, `codebase_search`, `grep`, and dependency mapping. |
| **`@file-picker`** | `openrouter/deepseek/deepseek-v4.1-flash` | `steps: 8`, `reasoning: low`, `temp: 0.1` | Narrow candidate file/symbol discovery (`codebase_search` + `jev_find`). Returns ranked `path:line` spans and discovered contracts. |
| **`@local-scout`** | `ollama/qwen3-coder:30b` *(Local)* | **$0.00 / $0.00** *(Offline, 32k ctx)* | Zero-API-cost local file summarization, log triage, and boilerplate extraction (MCP disabled to keep local context fast). |
| **`@fast-worker`** | `openrouter/deepseek/deepseek-v4.1-flash` | `steps: 15`, `temp: 0.2` | Mechanical coding worker for bounded edits: boilerplate, CRUD, schemas, UI components, formatting, and routine unit tests. |
| **`@mid-surgeon`** | [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) | `steps: 20`, `temp: 0.2` | Standard multi-file feature implementation, state/API wiring, migrations, and non-trivial refactors across 2–5 files. |
| **`@deep-surgeon`** | `openrouter/google/gemini-4-argon` | `steps: 25`, `temp: 0.1` | High-complexity specialist for concurrency, security/auth/crypto, hard algorithms, or escalations when lower-tier workers are blocked. |

### 3. Direct Manual Model Profiles (Available via `/models`)

When working directly in a single long session without subagent delegation, you can pin any configured model in Kilo's model selector to guarantee **100% single-provider KV cache continuity**:
- **`openrouter/openai/gpt-6.1-terra`** — Balanced daily driver (`medium` reasoning, auto-cached).
- **`openrouter/openai/gpt-6.1-sol`** — Deep architectural & systems reasoning (`high` reasoning, auto-cached).
- **`openrouter/google/gemini-4-argon`** — 1M-token context window specialist for massive cross-repo synthesis.
- **`openrouter/anthropic/claude-sonnet-5.5`** — **$2 / $10 per 1M tokens**; third-vendor implementation & debugging alternative to `gpt-6.1-sol` with top-level `cache_control: { type: "ephemeral" }` enabled (90% cache read discount).
- **`openrouter/anthropic/claude-opus-5.5`** — **$4 / $20 per 1M tokens**; excluded from automatic router pools so it never triggers unexpectedly, but available for manual selection on your hardest architectural or verification tasks.

## Repository Layout

```text
~/.config/kilo/
├── kilo.json                                  # Global Kilo configuration (models, providers, indexing, MCP, permissions)
├── AGENTS.md                                  # Global routing, KV-cache discipline, YAGNI ladder & tool policies
├── prompts/                                   # Externalized role prompts for custom subagents ({file:./prompts/...})
│   ├── file-picker.md                         # Fast path/symbol retrieval & jev_find reranking contract
│   ├── local-scout.md                         # Offline Ollama qwen3-coder:30b read-only scout contract
│   ├── fast-worker.md                         # Contained single-file surgical execution contract
│   ├── mid-surgeon.md                         # Multi-file feature & bug-fix execution contract
│   └── deep-surgeon.md                        # Deep architectural & concurrency root-cause contract
└── skills/                                    # Progressive-disclosure Agent Skills (loaded on demand)
    ├── cost-tier-delegation/SKILL.md          # Task sizing, subagent selection, task_id reuse & cache preservation
    ├── jev-judgment/SKILL.md                  # Contracts for jev_find, jev_decide, jev_review, and jev_gate
    ├── ponytail-yagni/SKILL.md                # 5-rung YAGNI complexity ladder (Delete -> Existing -> Stdlib -> Direct -> Abstract)
    └── verification-and-debugging/SKILL.md    # Hypothesis-driven debugging, Context7 lookup & two-attempt escalation cap
```

## Quickstart & Local Setup

### 1. Prerequisites

1. **[Kilo Code](https://kilo.ai/docs)** installed in VS Code, JetBrains, or via the CLI (`npm install -g @kilocode/cli`).
2. **[Node.js 22+](https://nodejs.org/)** (`node -v` >= 22) so `npx -y @jkudish/jev-mcp` can run the local Jev MCP server.
3. **An [OpenRouter API Key](https://openrouter.ai/settings/keys)** with credits loaded (powers the models, Jev MCP, and `openai/text-embedding-3-small` semantic codebase indexing).
4. *(Optional)* **[Ollama](https://ollama.com/)** if you want to use the zero-cost offline `@local-scout` subagent (`qwen3-coder:30b`).

### 2. Clone into `~/.config/kilo`

Back up any existing Kilo configuration and clone this repository directly into `~/.config/kilo` (or `%USERPROFILE%\.config\kilo` on Windows):

```bash
# 1. Back up your existing config if present
if [ -d "$HOME/.config/kilo" ]; then
  mv "$HOME/.config/kilo" "$HOME/.config/kilo.backup.$(date +%Y%m%d-%H%M%S)"
fi

# 2. Clone this repository into ~/.config/kilo
git clone <YOUR_REPO_URL> "$HOME/.config/kilo"
```

### 3. Configure `OPENROUTER_API_KEY`

This configuration never stores API keys in `kilo.json`—it interpolates `{env:OPENROUTER_API_KEY}` at runtime across the OpenRouter provider, the Jev MCP server, and the LanceDB codebase indexer.

Add your key to `~/.zshrc` (macOS) or `~/.bashrc` (Linux):

```bash
export OPENROUTER_API_KEY="sk-or-v1-your-key-here"
```

Then reload your shell (`source ~/.zshrc`).

> **macOS VS Code / JetBrains GUI Tip:** macOS GUI apps launched from Spotlight or the Dock do not always inherit variables from `~/.zshrc`. Either launch your IDE from the terminal (`code .`) or expose the variable to macOS GUI apps with:
> ```bash
> launchctl setenv OPENROUTER_API_KEY "$OPENROUTER_API_KEY"
> ```

### 4. *(Optional)* Set Up Offline `@local-scout` via Ollama

If you have 24GB+ unified memory/VRAM and want zero-cost local scouting:

```bash
# Pull the model
ollama pull qwen3-coder:30b

# Start Ollama with a 32k context window (Ollama defaults to 4096 if unset!)
OLLAMA_CONTEXT_LENGTH=32768 ollama serve
```

*(If you don't use Ollama, you don't need to change anything—Kilo will simply use `@explore` and `@file-picker` via OpenRouter.)*

### 5. Verify Your Setup in Kilo

Open any project in Kilo Code (or run `kilo` in your terminal) and check:
1. **Skills & Agents Loaded**: Type `@` in the prompt box—you should see `@file-picker`, `@fast-worker`, `@mid-surgeon`, `@deep-surgeon`, `@local-scout`, and `@explore`.
2. **Codebase Indexing Active**: Check the indexing status indicator in Kilo. On first open, Kilo parses your repo with Tree-sitter and stores embeddings in a local LanceDB index using `openai/text-embedding-3-small`.
3. **MCP Servers Connected**: Check the MCP panel in Kilo—both `jev` (`@jkudish/jev-mcp`) and `context7` (`https://mcp.context7.com/mcp`) should show green/connected.

## Day-to-Day Workflow & Best Practices

- **Let `code` Orchestrate Short Tasks, Delegate Long Loops**: For 1–3 turn tasks, let `code` (`typesafe/jev-router`) handle the edit directly. When a task will take >3–5 edit/test turns, let `code` delegate to `@fast-worker`, `@mid-surgeon`, or `@deep-surgeon` (or invoke them yourself) so the subagent's pinned model maintains a warm KV prompt cache.
- **Resume Subagents by `task_id`**: When sending follow-up instructions to a subagent, Kilo reuses the existing `task_id` rather than spawning a fresh subagent from scratch—preserving its warm prompt cache.
- **Semantic Search Before Grep**: Agents are instructed in [`AGENTS.md`](./AGENTS.md) to start unfamiliar tasks with `codebase_search` (semantic AST search) and targeted `read` (`offset`/`limit`) instead of dumping full files into context.
- **Verify Cache Hit Rates on OpenRouter**: Open your [OpenRouter Activity Feed](https://openrouter.ai/activity) after a coding session and inspect `cached_tokens` to see the 50%–90% prompt cache discounts across your subagent runs.

## Customization Guide

- **Using Fully Offline Local Embeddings for Indexing**: If you prefer local Ollama embeddings over OpenRouter's `openai/text-embedding-3-small`, run `ollama pull nomic-embed-text` and update the `indexing` block in [`kilo.json`](./kilo.json):
  ```json
  "indexing": {
    "enabled": true,
    "provider": "ollama",
    "model": "nomic-embed-text",
    "vectorStore": "lancedb",
    "ollama": {
      "baseUrl": "http://localhost:11434"
    },
    "lancedb": {}
  }
  ```
- **Adding Symbol-Level LSP Navigation (Serena MCP)**: For large monorepos (50k+ LOC), you can add [Serena MCP](https://github.com/oraios/serena) (`uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant`) under `mcp` in [`kilo.json`](./kilo.json) and expose it exclusively to `@mid-surgeon` and `@deep-surgeon`.
