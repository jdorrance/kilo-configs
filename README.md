# Kilo Code — Tiered Multi-Agent & Cache-Aware Configuration

A production-ready global configuration (`~/.config/kilo`) for [Kilo Code](https://kilo.ai/docs) (VS Code, JetBrains, and CLI) engineered for **minimum cost per solved task, high prompt-cache affinity, and maximum reasoning capability** across [OpenRouter](https://openrouter.ai/docs/quickstart), [Jev System One MCP](https://www.npmjs.com/package/@jkudish/jev-mcp), [Context7 MCP](https://github.com/upstash/context7), and optional local [Ollama](https://ollama.com/) inference.

## Why This Architecture Exists

Most multi-model AI coding setups suffer from two hidden taxes:
1. **Prompt-Cache & Tool-Selection Loss**: Switching models mid-loop prevents the new model from reusing the previous model's KV cache prefix, and using an opaque external router hides model identity from Kilo's model-specific tool selector (such as GPT's native `apply_patch` tool).
2. **System Prompt Clobbering**: Overriding `prompt` on primary modes or coding workers in Kilo replaces [Kilo's native model-family prompt optimizations](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/session/llm/request.ts) (`SystemPrompt.provider(input.model)`).

This repository solves both problems:
- **100% Native Coding Prompts Preserved**: Both primary modes (`code`, `code-pinned`, `plan`, `debug`, `ask`) and coding workers (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`) **omit custom `prompt` overrides**, inheriting 100% of Kilo's model-specific coding instructions and tool selection (`apply_patch`). Shared orchestration and handoff contracts live in [`AGENTS.md`](./AGENTS.md) and on-demand [Kilo Skills](https://kilo.ai/docs/customize/skills) (`skills/*/SKILL.md`). Only the two read-only extraction scouts (`@file-picker` and `@local-scout`) use custom output-format prompts (`prompts/*.md`).
- **Continuity-Based Execution & Model-Pinned Workers**: Keep coherent implementation/verification loops with their current agent while making progress (`code` for adaptive routing, or `code-pinned` on `gpt-6.1-terra` for cache-locked single-model sessions with native GPT tool selection). Delegate separable, noisy, or parallel work to model-pinned subagents (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`) or [Agent Manager git worktrees](https://kilo.ai/docs/automate/agent-manager).
- **Full Multimodal / Vision Support on Custom Router Entries**: Custom router and model definitions explicitly declare `attachment: true` and `modalities: { input: ["text", "image"], output: ["text"] }` so UI screenshots are never stripped by Kilo's input filter.
- **Native AST + LanceDB Codebase Indexing**: Built-in [Tree-sitter AST chunking + LanceDB vector search](https://kilo.ai/docs/customize/context/codebase-indexing) (`semantic_search` with a tight `searchMaxResults: 12` budget) finds implementations semantically without flooding context windows.
- **Selective System One Judgments & Live Docs**: Integrates [`@jkudish/jev-mcp`](https://www.npmjs.com/package/@jkudish/jev-mcp) (`jev_find`, `jev_decide`, `jev_review`, `jev_gate`) and [Context7 Remote MCP](https://github.com/upstash/context7) (`resolve-library-id`, `query-docs`) with per-role tool permissions so mechanical workers don't carry unnecessary MCP schemas.

## Architecture & Routing Matrix

### 1. Primary Orchestrator Modes & Housekeeping

| Agent / Mode | Assigned Model / Router | Role & Behavior |
|---|---|---|
| **`code`** *(default)* | [`openrouter/typesafe/jev-router`](https://openrouter.ai/typesafe/jev-router) *(medium tier)* | Adaptive primary mode (`deepseek-v4.1-flash`, `gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.1-sol`, `claude-sonnet-5.5`). Keeps coherent loops together; delegates separable or noisy subtasks to pinned workers. |
| **`code-pinned`** | [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) | Cache-locked primary coding mode (`Tab` / `/agents`) for sustained sessions where known model identity (native GPT prompt + `apply_patch`) and single-model cache continuity outweigh router switching. |
| **`plan`** | `openrouter/jev-router-high` | Native architecture and specification mode (writes plans to `.kilo/plans/` with Kilo's native read-only plan hardening). |
| **`debug`** | `openrouter/jev-router-high` | Native systematic root-cause diagnosis and minimal-reproducer isolation before escalating concurrency/security bugs to `@deep-surgeon`. |
| **`ask`** | `openrouter/jev-router-low` | Low-cost, read-only codebase Q&A using 100% of Kilo's native read-only shell and tool hardening. |
| **`compaction`** | [`openrouter/openai/gpt-6-luna`](https://openrouter.ai/openai/gpt-6-luna) | High-fidelity long-session context condensation that preserves architectural invariants, constraints, and unfinished work. |
| **`title` / `summary`** | `openrouter/deepseek/deepseek-v4.1-flash` | Ultra-cheap background title generation and diff summarization (`reasoning.effort: "low"`). |

### 2. Model-Pinned Specialist Subagents

Invoke any subagent directly in chat with `@agent-name` or let the primary agent delegate via the `task` tool:

| Subagent | Pinned Model | Prompt & Step Cap | Specialty & Tool Surface |
|---|---|---|---|
| **`@explore`** | `openrouter/deepseek/deepseek-v4.1-flash` | Native (`steps: 10`, `reasoning: low`) | Default fast read-only codebase exploration, `semantic_search`, `grep`, and dependency mapping. |
| **`@file-picker`** | `openrouter/deepseek/deepseek-v4.1-flash` | `prompts/file-picker.md` (`steps: 8`, `reasoning: low`) | Opt-in structured inventory scout (`semantic_search` + `jev_find`). Strictly non-mutating shell allowlist; use when partitioning paths/contracts across workers. |
| **`@local-scout`** | `ollama/qwen3-coder:30b` *(Local)* | `prompts/local-scout.md` (`steps: 8`, 32K ctx) | Opt-in zero-API-cost local file summarization, diff inspection, and log triage (MCP disabled; strictly non-mutating git/shell allowlist). |
| **`@fast-worker`** | `openrouter/deepseek/deepseek-v4.1-flash` | Native coding prompt (`steps: 20`) | Mechanical coding worker for bounded edits: boilerplate, CRUD, schemas, UI components, formatting, and unit tests (`jev_*` disabled to trim schema overhead). |
| **`@mid-surgeon`** | [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) | Native GPT prompt (`steps: 25`) | Multi-file feature implementation, state/API wiring, migrations, and non-trivial refactors with native GPT `apply_patch` active. |
| **`@deep-surgeon`** | `openrouter/google/gemini-4-argon` | Native Gemini prompt (`steps: 30`) | High-complexity specialist for concurrency, security/auth/crypto, hard algorithms, or escalations when `debug` or `@mid-surgeon` is blocked. |

### 3. Direct Manual Model Profiles (Available via `/models`)

When working directly in a single long session, you can switch to `code-pinned` (`Tab` / `/agents`) or pin any configured model in Kilo's model selector:
- **`openrouter/openai/gpt-6.1-terra`** — Balanced daily driver (`medium` reasoning, auto-cached).
- **`openrouter/openai/gpt-6.1-sol`** — Deep architectural & systems reasoning (`high` reasoning, auto-cached).
- **`openrouter/google/gemini-4-argon`** — 1M-token context window specialist for massive cross-repo synthesis.
- **`openrouter/anthropic/claude-sonnet-5.5`** — **$2 / $10 per 1M tokens**; third-vendor implementation & debugging alternative to `gpt-6.1-sol` with top-level `cache_control: { type: "ephemeral" }` enabled (90% cache read discount).
- **`openrouter/anthropic/claude-opus-5.5`** — **$4 / $20 per 1M tokens**; excluded from automatic router pools so it never triggers unexpectedly, but available for manual selection on your hardest architectural or verification tasks.

## Repository Layout

```text
~/.config/kilo/
├── kilo.json                                  # Global Kilo configuration (models, providers, indexing, sandbox, MCP, permissions)
├── AGENTS.md                                  # Global continuity-based routing, shared worker contract & YAGNI policy
├── prompts/                                   # Externalized extraction prompts for read-only scouts ( plus reference templates)
│   ├── file-picker.md                         # Active: structured path/symbol/contract extraction prompt
│   ├── local-scout.md                         # Active: offline Ollama qwen3-coder:30b scout prompt
│   ├── fast-worker.md                         # Reference template (omitted in kilo.json to preserve native model prompt)
│   ├── mid-surgeon.md                         # Reference template (omitted in kilo.json to preserve native GPT prompt)
│   └── deep-surgeon.md                        # Reference template (omitted in kilo.json to preserve native Gemini prompt)
└── skills/                                    # Progressive-disclosure Agent Skills (loaded on demand)
    ├── cost-tier-delegation/SKILL.md          # Continuity-based execution, subagents & Agent Manager worktree playbook
    ├── jev-judgment/SKILL.md                  # Contracts for jev_find, jev_decide, jev_review, and jev_gate
    ├── ponytail-yagni/SKILL.md                # 6-rung YAGNI complexity ladder (Delete -> Existing -> Stdlib -> Direct -> Minimal)
    └── verification-and-debugging/SKILL.md    # Hypothesis-driven debugging, reversible experiments & empirical verification
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

### 4. *(Optional)* Set Up Offline `@local-scout` via Ollama with Verified 32K Context

Because OpenAI-compatible `/v1` requests do not pass Ollama's `num_ctx` parameter automatically ([Ollama OpenAI Compatibility Docs](https://docs.ollama.com/api/openai-compatibility)), bake the 32K context window directly into your local `qwen3-coder:30b` model tag:

```bash
# 1. Pull the base model
ollama pull qwen3-coder:30b

# 2. Bake 32K context allocation into the model definition
printf "FROM qwen3-coder:30b\nPARAMETER num_ctx 32768\n" | ollama create qwen3-coder:30b -f -

# 3. Verify CONTEXT (32768) and PROCESSOR (GPU offload) when running
ollama ps
```

*(If you don't use Ollama, you don't need to change anything—Kilo will simply use `@explore` and `@file-picker` via OpenRouter.)*

### 5. Verify Your Effective Configuration

Run these commands from any project directory to confirm your effective configuration, resolved agent prompts, skills, and MCP servers ([Kilo CLI Reference](https://kilo.ai/docs/code-with-ai/platforms/cli-reference)):

```bash
kilo --version
kilo config check
kilo agent list
kilo debug agent code
kilo debug agent code-pinned
kilo debug agent mid-surgeon
kilo debug skill
kilo mcp list
```

## Day-to-Day Workflow & Advanced Experiments

- **Keep Coherent Loops Together**: Let the active agent finish coherent implementation and verification loops while it is making progress. Switch to `code-pinned` (`Tab` / `/agents`) when you want known GPT-6.1 Terra model identity (`apply_patch` + single-model prefix cache) across a long session, and delegate to `@fast-worker`, `@mid-surgeon`, or `@deep-surgeon` when isolating separable or noisy subtasks.
- **Use Native `plan` and `debug` First**: Start architectural specs in `plan` mode (`.kilo/plans/`) before handing implementation to a worker, and use `debug` mode for first-line root-cause isolation before escalating concurrency or security invariants to `@deep-surgeon`.
- **Agent Manager Worktrees for Parallel Features**: Use [Agent Manager worktrees](https://kilo.ai/docs/automate/agent-manager) (`Cmd+Shift+N` or the `agent_manager` tool with `mode: "worktree"`) for independent parallel streams so each agent gets an isolated `.kilo/worktrees/` checkout, branch, and terminal.
- **Safe OS-Level Write Sandboxing (`/sandbox`)**: [`kilo.json`](./kilo.json) pre-configures `"sandbox": { "enabled": false, "network": "allow" }`. Toggle `/sandbox` on anytime for OS-level Seatbelt (macOS) or Bubblewrap (Linux) filesystem write confinement without breaking `semantic_search`, `context7`, `jev`, or LSP ([Kilo Sandboxing Docs](https://kilo.ai/docs/getting-started/settings/sandboxing)).
- **Optional Experiments to Benchmark on Your Repos**:
  - **MCP Code Mode**: Test adding `"code_mode": true` under `"experimental"` in [`kilo.json`](./kilo.json) to load MCP tool schemas on demand via a confined JS runner rather than injecting every MCP tool schema upfront.
  - **Provider Sticky Sorting vs. Auto Exacto**: If [OpenRouter's Auto Exacto](https://openrouter.ai/docs/guides/routing/auto-exacto) shifts providers mid-session on open-weight models, test `"provider": { "allow_fallbacks": true, "sort": "price" }` on a single route and compare cache hit rate against retry rate in your [OpenRouter Activity Feed](https://openrouter.ai/activity).
