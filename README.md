# Kilo Code — Flash-First Execution with Mandatory Independent Terra Review

A production-ready global configuration (`~/.config/kilo`) for [Kilo Code](https://kilo.ai/docs) (VS Code, JetBrains, and CLI, audited against [Kilo CLI v7.8.25 source](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/package.json)) engineered for **cheap Flash-first execution, mandatory independent Terra review (`@reviewer`) on substantive changes, selective Terra plan critique, evidence-based specialist escalation, high prompt-cache affinity, and complete cost accounting** across [OpenRouter](https://openrouter.ai/docs/quickstart), [Jev System One MCP (`@jkudish/jev-mcp@0.12.0`)](https://github.com/jkudish/jev-mcp), [Context7 MCP](https://github.com/upstash/context7), and optional local [Ollama](https://ollama.com/) inference.

## Key Architectural Decisions

1. **Cheap Execution + Mandatory Independent Strong Review (`@reviewer`) & Plan Critique**:
   - **Flash-First Execution with Explicit Default Variants**: [`openrouter/deepseek/deepseek-v4.1-flash`](https://openrouter.ai/deepseek/deepseek-v4.1-flash) owns routine implementation and discovery with both `"variant": "low"` and `"options": { "reasoning": { "effort": "low" } }` (`code`, `general`, `fast-worker`, `ask`, `explore`, `doc-summarizer`, `file-picker`, `title`, `summary`), and bounded deeper diagnosis/planning at explicit `"variant": "high"` / `effort: "high"` (`debug`, `plan`).
   - **Upfront or Evidence-Based Escalation**: Any cheap execution path can escalate immediately to **`@mid-surgeon`** (`openai/gpt-6.1-terra`, `"variant": "medium"`) or **`@deep-surgeon`** (`google/gemini-4-argon`, `"variant": "high"`) when architectural uncertainty, conflicting contracts, or difficult invariants justify it—neither two failed cheap attempts nor a Flash-`high` detour is required when the need is already clear.
   - **Mandatory Independent Terra Review Gate (`@reviewer`) & Selective Plan Critique**: Because [Kilo's native `/review` command](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/review/command.ts) does not pin a stronger model, `kilo.json` defines a dedicated **`@reviewer`** subagent pinned to [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) (`"variant": "medium"`, `options.reasoning.effort: "medium"`, `steps: 20`, `prompt` omitted to preserve native model-family prompting).
     - **From `Plan` Mode**: `plan.permission.task` explicitly allows `reviewer` alongside read-only scouts so `Plan` can request selective Terra critiques of public contracts, migrations, concurrency models, or acceptance criteria before implementation begins.
     - **From `Code` / `Debug` Modes**: Before claiming final completion on any substantive behavioral change, new feature, non-obvious bug fix, public contract/auth/security/data/migration/concurrency/state change, or task with lingering uncertainty or prior failed hypotheses, the **primary agent** runs one bounded foreground `@reviewer` pass after writes and verification settle. Clearly mechanical changes (formatting, spelling, **behavior-preserving generated updates**, straightforward equivalent renames) may skip review with a brief reason. Passing tests or advisory `jev_jev_review` / `jev_jev_gate` scores never waive this gate. (Note: this is an **instruction-level completion policy**, not a deterministic application-enforced approval system.)
   - **Strict Deny-by-Default `@reviewer` Permissions**: Because [Kilo merges custom-agent permissions with defaults](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/agent/agent.ts), `@reviewer` uses the same strict `"*": "deny"` permission surface as `@local-scout` (allowing only ordered `read` with generated-file and `.env` exclusions, `/tmp/**` and `/private/tmp/**`, `glob`, `grep`, `list`, `semantic_search`, and `skill`; Kilo also restores read access to its truncation-output directory unless explicitly denied). Shell (`bash`), edits, writes, patching, `task` delegation, `agent_manager`, and MCP tools are disabled.
2. **Variant & Model Selection Precedence + `require_parameters: true` on Flash**:
   - In [Kilo's request assembly](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/session/llm/request.ts) and [task model resolver](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/tool/task.ts), options merge in the order `Provider defaults → model options → agent options → selected variant`, and saved per-agent UI selections can override configured defaults. Setting explicit per-agent `variant` fields establishes clear defaults while requiring runtime verification on live launches.
   - `deepseek/deepseek-v4.1-flash` and `deepseek/deepseek-v4.1-flash-1017` set `"require_parameters": true` alongside `"max_price": { "prompt": 0.15, "completion": 0.65 }` so OpenRouter restricts routing to providers advertising support for the supplied parameters (such as `reasoning.effort`; [OpenRouter Provider Selection](https://openrouter.ai/docs/guides/routing/provider-selection)). Verify this with your active Kilo request shape during smoke testing.
3. **Explicit Model & Variant Pinning on Agent Manager Worktrees + Integrated Verification**:
   - In [`agent-manager.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/tool/agent-manager.ts), isolated worktree sessions inherit the **invoking turn's model and selected reasoning variant** when omitted, and require a selectable **primary agent** (`fast-worker` and `mid-surgeon` are rejected).
   - Routine `agent_manager` worktree calls must explicitly pass `{"agent": "code", "model": "openrouter/deepseek/deepseek-v4.1-flash", "variant": "low"}` and the intended base branch, and the parent must **verify and review the integrated result** after combining worktree branches.
4. **Search & Indexing Exclusions vs. `permission.read`**:
   - In Kilo's [`grep.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/tool/grep.ts) and [`semantic-search.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/tool/semantic-search.ts), `grep` and `semantic_search` check their own tool permissions rather than filtering every returned match through `permission.read`. Use `.gitignore` and `.kilocodeignore` ([Codebase Indexing Docs](https://kilo.ai/docs/customize/context/codebase-indexing)) in your repositories to keep generated noise out of search/indexing, reserving `permission.read` denies for direct `read` protection.
5. **Caching, Auto Exacto Provider Shifts & Compaction Review-State Preservation**:
   - **Typed Session Plugin ([`plugin/openrouter-session.ts`](./plugin/openrouter-session.ts))**: Typed with `Plugin` and `PluginModule` from `@kilocode/plugin`, the plugin normalizes `promptCacheKey` → `prompt_cache_key` (required because [`@openrouter/ai-sdk-provider@2.9.0`](https://github.com/OpenRouterTeam/ai-sdk-provider/blob/2.9.0/src/chat/index.ts) spreads provider options without renaming `promptCacheKey`, while Kilo already sends `X-Session-Id`) and appends compaction guidance that explicitly preserves **independent-review state** (`review_required`, reviewer `task_id`, resolved model/effort, latest verdict, unresolved findings, baseline/change-set identity, and post-review edits).
   - **Auto Exacto & Cache Affinity**: OpenRouter's [Auto Exacto](https://openrouter.ai/docs/guides/routing/auto-exacto) runs automatically on tool-calling requests and can switch providers mid-session for throughput/tool reliability, causing cache misses even when `X-Session-Id` and `prompt_cache_key` are stable. Log resolved provider, cache reads, cache writes (noting [OpenAI cache-write charges](https://openrouter.ai/docs/guides/best-practices/prompt-caching) on fresh Terra `@reviewer` sessions, which makes resuming the reviewer's `task_id` for rechecks essential), billed USD, latency, and tool retries before testing `"sort": "price"` on a separate profile.
   - **Compaction Pruning Semantics**: Setting `"compaction": { "auto": true }` while omitting `"prune"` disables routine normal-turn pruning while **retaining payload-limit recovery pruning and post-compaction cleanup** ([`compaction.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/session/compaction.ts)). An optional Luna-only experiment (`agent.compaction.options.prompt_cache_options = {"mode": "explicit"}`) is documented for separate testing.

## Complete Accounting & Ownership Matrix (18 Agent Definitions + Supporting Paths)

"Explicit" below means the desired effective setting must be verified after configuration loading, multi-file settings merge ([Settings Docs](https://kilo.ai/docs/getting-started/settings)), saved model selections, and session variants are applied ([request option precedence](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/session/llm/request.ts)).

| Execution Path | Intended Assignment | What Must Be Accounted For |
|---|---|---|
| **Default primary `code`** | `deepseek/deepseek-v4.1-flash`, `variant: "low"` | Root `model`, `default_agent: "code"`, `agent.code.model`, and `require_parameters: true`; owns routine execution and orchestrates `@reviewer` |
| **Independent reviewer & plan critic (`@reviewer`)** | `openai/gpt-6.1-terra`, `variant: "medium"` | Read-only subagent (`steps: 20`, `"*": "deny"`, no `bash`/edits/MCP); callable from `Plan` (design critique) and `Code`/`Debug` (mandatory completion gate); resume reviewer `task_id` for focused rechecks |
| **Agent Manager worktrees (`agent_manager`)** | `code` on `deepseek/deepseek-v4.1-flash`, `variant: "low"` | Inherits caller's model/variant if omitted ([`agent-manager.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/tool/agent-manager.ts)); must explicitly pass `agent: "code"`, `model`, `variant: "low"`, base branch, and verify/review the integrated result |
| **`general`** | `deepseek/deepseek-v4.1-flash`, `variant: "low"` | Explicit `agent.general.model` and `variant: "low"`; returns `review_required` flag |
| **`fast-worker`** | `deepseek/deepseek-v4.1-flash`, `variant: "low"` | Routine implementation (`steps: 25` loop cap); returns `review_required: true\|false` with reason, changed paths, and verification results |
| **`ask`** | `deepseek/deepseek-v4.1-flash`, `variant: "low"` | Native Ask role behavior and read-only hardening retained (`.env.example` accessible) |
| **`plan`** | `deepseek/deepseek-v4.1-flash`, `variant: "high"` | Allows read-only scouts (`explore`, `doc-summarizer`, `file-picker`, `local-scout`) **plus `@reviewer`** for selective Terra design critique; stronger whole-session planning via a stronger native `Plan` session |
| **`debug`** | `deepseek/deepseek-v4.1-flash`, `variant: "high"` | Deeper diagnosis on Flash with full verification `bash` permissions; escalate to `@mid-surgeon` / `@deep-surgeon` when diagnosis exceeds Flash |
| **`explore`** | `deepseek/deepseek-v4.1-flash`, `variant: "low"` | Native exploration role behavior and read-only hardening (`steps: 10`; `.env.example` accessible) |
| **`doc-summarizer`, `file-picker`** | `deepseek/deepseek-v4.1-flash`, `variant: "low"` | Ordered `read` exclusions, `/tmp/**` + Kilo truncation storage access, and concise evidence |
| **Unpinned `task` fallback** | `deepseek/deepseek-v4.1-flash` (`subagent_model`) | Fallback model does not itself guarantee `low` effort; explicit agent configs set `variant` and `options.reasoning.effort` |
| **`small_model`** | Retain `deepseek/deepseek-v4.1-flash` | Verified model ID so [small-model resolution](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/provider/provider.ts) always resolves cleanly |
| **`title`, `summary`** | Retain `deepseek/deepseek-v4.1-flash`, `variant: "low"` | Separate explicit helper agent settings using `variant: "low"` and `options.reasoning.effort: "low"` |
| **`memory_model`** | Retain `deepseek/deepseek-v4.1-flash` | Uses `ProviderTransform.smallOptions(model)` ([`memory/ports.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/memory/ports.ts))—does **not** merge model `max_price` options or run `chat.params`; verify billing separately |
| **`compaction`** | Retain `openai/gpt-6-luna` | `compaction: { "auto": true }` with `prune` omitted; forwards originating user message including its selected `variant` ([`compaction.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/session/compaction.ts)), so observe effective effort (and enforce a post-merge cap in `chat.params` only if needed) |
| **`code-pinned`, `mid-surgeon`** | `openai/gpt-6.1-terra`, `variant: "medium"` | Explicit expert implementation (`steps: 30` on `mid-surgeon`); upfront or evidence-based escalation via fresh `task` (no `task_id`) |
| **`deep-surgeon`** | `google/gemini-4-argon`, `variant: "high"` | Deliberate higher-cost specialist (`steps: 35`); monitor shared output limits/truncation and note Argon's Dec 1, 2026 rate increase after Nov 30, 2026 introductory pricing |
| **Experimental Jev profile (`code-jev`)** | `openrouter/jev-router-low`, `variant: "low"` | Hides backend model family from Kilo's pre-request prompt (`system.ts`) and tool (`registry.ts` `apply_patch`) selection; direct Flash `max_price` does not transfer, `models` is a preference list with fallback, `cost_tier: "low"` is not a dollar cap, and `effort: "low"` is a router hint ([Jev Router Docs](https://openrouter.ai/docs/guides/routing/routers/jev-router)) |
| **`local-scout`** | `ollama/qwen3-coder:30b`, optional | Local generation with no API charge (`bash` disabled); a 20K-in/1K-out Flash call costs ~$0.00365 nominal, so use `@local-scout` only when Ollama is warm (`ollama ps` shows 32K `num_ctx` without CPU offload; [Ollama Context Docs](https://docs.ollama.com/context-length)) |
| **Semantic indexing/search** | `openai/text-embedding-3-small` (OpenRouter) | Independent cloud embedding calls and charges; align `.gitignore` / `.kilocodeignore` so generated files are excluded from indexing |
| **Jev MCP (`@jkudish/jev-mcp@0.12.0`)** | Pinned v0.12.0 release | Optional advisory tools; separate model requests/charges that never waive `@reviewer`; monitor tool-definition context overhead in primary sessions |
| **Context7 (`https://mcp.context7.com/mcp`)** | External documentation service | Availability, tool permissions (`context7_*` on `doc-summarizer`), and external rate/usage limits |
| **Candidate & manual baselines** | `deepseek-v4.1-flash-1017`, `glm-5.3-flash`, `gpt-6.1-sol`, `claude-sonnet-5.5`, `claude-opus-5.5`, plus optional [Kilo Auto Efficient](https://kilo.ai/docs/code-with-ai/agents/auto-model) | Compare candidate worker models (and optional Kilo Auto Efficient) under the **exact same mandatory Terra `@reviewer` standard** |

## File Roles & Reproducibility Inventory

Note that `~/.config/kilo/package.json` pins `@kilocode/plugin@7.8.17` for local plugin TypeScript types ([Plugins Docs](https://kilo.ai/docs/automate/extending/plugins)), which is distinct from the active Kilo CLI / IDE extension runtime version (audited against `v7.8.25` source commit `0a9faeff69fff8712da184ee5188bb7985c6f057`). Record the actual running Kilo version, effective merged config, plugin/MCP versions, resolved model/provider, and effective reasoning effort on every benchmark run.

| File | Role in Rollout |
|---|---|
| `kilo.json` | **Active runtime configuration**: 18 agent definitions with explicit `variant` defaults, `require_parameters: true` on Flash, `reviewer` allowed in `plan`, and `@jkudish/jev-mcp@0.12.0` pinned |
| `AGENTS.md` | **Active shared operating instructions**: reasoning ladder, mandatory `@reviewer` gate, selective `plan` critique, change-set identity & broad invalidation rule, and integrated worktree verification |
| `skills/cost-tier-delegation/SKILL.md` | **Active on-demand skill**: detailed delegation, brief construction, `@reviewer` baseline/digest handoff & focused-recheck workflow, and worktree integration rules |
| `skills/verification-and-debugging/SKILL.md` | **Active on-demand skill**: baseline test strategy, optional Jev preliminary checks vs. mandatory `@reviewer` gate |
| `skills/jev-judgment/SKILL.md` | **Active on-demand skill**: contracts for optional/advisory `jev_jev_*` tools (`evidence` requirements and non-waiver of `@reviewer`) |
| `prompts/doc-summarizer.md`, `prompts/file-picker.md`, `prompts/local-scout.md` | **Active subagent prompts**: referenced via `{file:./prompts/...}` in `kilo.json` |
| `prompts/fast-worker.md`, `prompts/mid-surgeon.md`, `prompts/deep-surgeon.md` | **Reference documentation only**: `prompt` is omitted on implementation workers and `@reviewer` in `kilo.json` to preserve Kilo's native model-dependent prompts |
| `plugin/openrouter-session.ts` | **Active plugin**: typed with `@kilocode/plugin` `Plugin` / `PluginModule`; normalizes `promptCacheKey` → `prompt_cache_key` and preserves task + `@reviewer` state across compaction |
| `README.md` | **Documentation**: architecture, complete accounting matrix, CLI/behavioral validation, and cost/cache measurement guide |

## Validation, Smoke Tests & Cost Accounting

### 1. Validate Config, Effective `@reviewer` Permissions & Resolved CLI Settings

Run these commands from a representative project directory so any project-level overrides are included (and verify inside your active IDE/GUI client if it runs a separate background process):

```bash
jq empty ~/.config/kilo/kilo.json
# Verify no legacy top-level per-agent "reasoning" keys or "compaction.prune" remain:
jq '([.agent[] | has("reasoning")] | any) or (.compaction | has("prune"))' ~/.config/kilo/kilo.json
# Expected output: false

kilo --version
kilo config check
kilo models openrouter --refresh
kilo debug agent code
kilo debug agent reviewer
kilo debug agent code-jev
kilo debug agent code-pinned
kilo debug agent general
kilo debug agent plan
kilo debug agent debug
kilo debug agent ask
kilo debug agent explore
kilo debug agent compaction
kilo debug skill
kilo mcp list

# If using @local-scout, verify Ollama allocated 32K context (num_ctx 32768) without unexpected CPU offload:
ollama ps
```

### 2. Behavioral & Review-Gate Smoke-Test Matrix

| Test | Passing Evidence |
|---|---|
| **1. Mechanical change skips `@reviewer`** | Formatting, typo fix, or behavior-preserving generated update skips `@reviewer` and records a brief mechanical-exemption reason |
| **2. Substantive Flash change invokes `@reviewer` despite passing tests** | After Flash (`code` or `@fast-worker`) finishes a behavioral/contract change and tests pass, primary launches a fresh foreground `@reviewer` task on `openai/gpt-6.1-terra` (`medium`) with baseline + change-set identity |
| **3. Selective `@reviewer` critique from `Plan`** | In `plan` mode, delegating an architecture/contract/migration critique to `@reviewer` succeeds while source-code edits and writable workers remain blocked |
| **4. `@reviewer` read-only & non-delegating isolation** | `@reviewer` reads supplied diff files (`/tmp/**` or workspace) and source files via native `read`/`grep`/`glob`, while `bash`, file edits/writes, `task`, `agent_manager`, and MCP tools are denied |
| **5. `@reviewer` findings, broad invalidation & focused recheck** | Findings trigger fixes, verification, and a focused recheck resuming the **same `@reviewer` `task_id`**; a subsequent edit to a shared helper/config/schema triggers a focused recheck before completion |
| **6. Effective model/effort launches across saved state** | Verify resolved model and effort on: (a) a Flash worker launched from a Terra parent, (b) `@reviewer` after Flash implementation, (c) `@mid-surgeon` after a cheap blocker, (d) resumed `@reviewer`, and (e) compaction after a manual `high`-effort session |
| **7. Routine worktree launch & integrated branch verification** | Calling `agent_manager` (`mode: "worktree"`) with explicit `agent: "code"`, `model: "openrouter/deepseek/deepseek-v4.1-flash"`, `variant: "low"`, and base branch runs on Flash/`low`, and the combined result is verified/reviewed after integration |
| **8. Flash `require_parameters: true` & provider ceiling (`$0.15/$0.65`)** | Requests succeed with `require_parameters: true` and `max_price` active; log resolved provider endpoints, Auto Exacto provider switches, cache reads/writes, TTFT, and tool retries |

### 3. Spending Controls & Complete Billed-Cost Trial (10–20 Representative Tasks)

- **Track Total Billed Cost, Cache Affinity & Review Gate ROI Across 10–20 Real Tasks**:
  - Sum **provider-reported billed USD**, elapsed time (TTFT and total duration), permission interruptions, human repair, and **reviewer findings that required fixes** across all unique requests:
    1. Parent session execution (distinguishing **pre-compaction Flash**, **Luna compaction**, and **resumed post-compaction Flash** requests)
    2. Shared-tree implementation subagents (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`, `@general`) and discovery scouts
    3. **Independent `@reviewer` plan critiques, initial reviews, and focused rechecks (`openai/gpt-6.1-terra`)**
    4. Isolated **Agent Manager worktree sessions** (`agent_manager`) and post-merge integration verification
    5. Escalations and failed attempts
    6. Background helpers (`title`, `summary`, `memory_model`, `compaction`)
    7. Optional Jev MCP calls (`@jkudish/jev-mcp@0.12.0`) and OpenRouter `text-embedding-3-small` indexing calls
- **Provider & Cache Telemetry Discipline**:
  - For each request, record **resolved provider/endpoint**, **cache-read tokens**, **cache-write tokens**, and **tool-call failures/retries** to distinguish Auto Exacto provider switches from plugin or session-key issues.
  - **Do not mix raw provider token totals with Kilo's normalized UI counters**, do not add a parent aggregate to child totals if the aggregate already includes child requests, and rely on provider-reported billed USD rather than summing completion and reasoning token counters.
- **Controlled Candidate Comparisons**:
  - Compare (1) direct `deepseek-v4.1-flash` + Terra `@reviewer`, (2) `deepseek-v4.1-flash-1017` + Terra `@reviewer`, (3) `glm-5.3-flash` + Terra `@reviewer`, and optionally (4) [Kilo Auto Efficient](https://kilo.ai/docs/code-with-ai/agents/auto-model), keeping the mandatory `@reviewer` quality gate identical across all candidates.
