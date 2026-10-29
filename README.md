# Kilo Code — Flash-First Tiered Multi-Agent & Cache-Aware Configuration

A production-ready global configuration (`~/.config/kilo`) for [Kilo Code](https://kilo.ai/docs) (VS Code, JetBrains, and CLI, verified against [Kilo CLI v7.8.25 source](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/package.json)) engineered for **Flash-first default ownership, evidence-based specialist escalation, high prompt-cache affinity, and complete cost accounting** across [OpenRouter](https://openrouter.ai/docs/quickstart), [Jev System One MCP](https://www.npmjs.com/package/@jkudish/jev-mcp), [Context7 MCP](https://github.com/upstash/context7), and optional local [Ollama](https://ollama.com/) inference.

## Key Architectural Decisions

1. **Flash-First Default Ownership & Three-Step Reasoning Ladder**:
   - [`openrouter/deepseek/deepseek-v4.1-flash`](https://openrouter.ai/deepseek/deepseek-v4.1-flash) owns routine work end-to-end across default primary `code` (`low`), `general` (`low`), `@fast-worker` (`low`), and `ask` (`low`).
   - For bounded diagnosis or planning requiring more reasoning on clear contracts, `plan` and `debug` run Flash at explicit `high` effort (or switch the active Flash variant to `high` before escalating to a premium tier).
   - Any cheap execution path (`code`, `general`, `debug`, `fast-worker`) can escalate to **`@mid-surgeon`** (`openai/gpt-6.1-terra`, `medium`) or **`@deep-surgeon`** (`google/gemini-4-argon`, `high`) when the task brief or observed evidence identifies an unresolved invariant, conflicting contract, difficult failed hypothesis, or substantive design decision. A failed cheap attempt is **not** required when the need for stronger reasoning is already clear.
   - For whole-session complex work, switch primary modes via `Tab` / `/agents` to **`code-pinned`** (`openai/gpt-6.1-terra`, `medium`), or compare router behavior in **`code-jev`** (`openrouter/jev-router-low`, `low`) or by selecting Jev via `/models` inside a fresh native `code` session.
2. **Explicit Model & Variant Pinning on Agent Manager Worktrees**:
   - In [`agent-manager.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/tool/agent-manager.ts), isolated worktree sessions inherit the **invoking turn's model and selected reasoning variant** when omitted, and require a selectable **primary agent** (subagent-only `fast-worker` and `mid-surgeon` are rejected).
   - `AGENTS.md` and `skills/cost-tier-delegation/SKILL.md` require routine `agent_manager` worktree calls to explicitly pass `{"agent": "code", "model": "openrouter/deepseek/deepseek-v4.1-flash", "variant": "low"}` along with the intended base branch so a Terra parent (`code-pinned`) never silently spawns multiple Terra worktrees for routine work.
3. **Preserved Native Prompts, Full `debug` Verification & Native `.env.example` Handling**:
   - Custom `prompt` overrides are omitted on `code`, `code-pinned`, `code-jev`, `plan`, `debug`, `ask`, `general`, `fast-worker`, `mid-surgeon`, and `deep-surgeon`, preserving Kilo's native role behavior, model-dependent prompting ([`system.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/session/system.ts)), and tool selection ([`registry.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/tool/registry.ts)).
   - **Native `debug` Verification Parity**: Because native `debug` does not inherit `agent.code.permission.bash` ([`agent/index.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/agent/index.ts)), `agent.debug` includes the same verification and Git-read `bash` permissions (including common wrapper forms like `npx tsc*`, `pnpm exec vitest*`, `pnpm typecheck*`, `uv run pytest*`, `npm run build*`, `make test*`) as `code`, `code-pinned`, `code-jev`, `general`, and implementation workers. Add any repository-specific wrapper scripts in project configuration or the task brief.
   - **Preserved `.env.example` Access in `ask`, `plan`, and `explore`**: Because native `ask`, `plan`, and `explore` re-append user-authored root `deny` rules after `allow` rules ([`agent/index.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/agent/index.ts)), global `.env*` hard-denies are omitted from root `permission.read` in favor of [Kilo's native environment-file read guard](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/permission/read.ts) (which requires approval for `.env` files while exempting `.env.example`), while strict custom scouts (`doc-summarizer`, `file-picker`, `local-scout`) retain explicit ordered `.env` denies followed by `.env.example` allows.
4. **Same-Tier Resumption vs. Fresh-Task Shared-Worktree Escalation**:
   - In [`task.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/tool/task.ts), resuming an existing `task_id` reuses the child session's stored model ahead of a newly selected agent's default model. Agents reuse `task_id` only for same-worker continuation and launch a **fresh task** (without `task_id`) when escalating tiers, passing a **Shared-Worktree Escalation Packet** (kept distinct from branch-based Agent Manager worktree handoffs).
5. **Balanced Flash Provider Ceiling (`$0.15 / $0.65`) & Cache-Preserving Compaction**:
   - `deepseek/deepseek-v4.1-flash` and `deepseek/deepseek-v4.1-flash-1017` set `"max_price": { "prompt": 0.15, "completion": 0.65 }` so high-throughput endpoints (such as Wafer at ~192 tok/s and CoreWeave at ~199 tok/s on [OpenRouter](https://openrouter.ai/deepseek/deepseek-v4.1-flash)) remain eligible alongside lower-cost endpoints (Morph, Decart). Note that [`max_price`](https://openrouter.ai/docs/guides/routing/provider-selection) is a **hard eligibility filter**: `allow_fallbacks: true` does not permit exceeding it, and requests fail if no eligible provider is online.
   - `"compaction": { "auto": true }` omits `"prune"` so routine turns do not mutate message history and invalidate cached prefixes, while [`plugin/openrouter-session.ts`](./plugin/openrouter-session.ts) normalizes `promptCacheKey` to `prompt_cache_key` on standard chat turns and appends compaction state-preservation rules.

## Complete Accounting & Ownership Matrix

"Explicit" below means the desired effective setting must be verified after configuration loading, saved model selections, and session variants are applied ([request option precedence](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/session/llm/request.ts)).

| Execution Path | Intended Assignment | What Must Be Accounted For |
|---|---|---|
| **Default primary `code`** | `deepseek/deepseek-v4.1-flash`, `low` | Root `model`, `default_agent: "code"`, and `agent.code.model`; verify fresh session selection and ensure no saved UI variant overrides `low` |
| **Agent Manager worktrees (`agent_manager`)** | `code` on `deepseek/deepseek-v4.1-flash`, `low` (for routine tasks) | Inherits caller's model/variant if omitted ([`agent-manager.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/tool/agent-manager.ts)); must explicitly pass `agent: "code"`, `model`, `variant: "low"`, and base branch |
| **`general`** | `deepseek/deepseek-v4.1-flash`, `low` | Explicit `agent.general.model` assignment required because it overrides root `subagent_model` |
| **`fast-worker`** | `deepseek/deepseek-v4.1-flash`, `low` | Broader routine implementation scope; verification `bash` permissions; `steps: 25` is a per-invocation loop cap, not a dollar cap |
| **`ask`** | `deepseek/deepseek-v4.1-flash`, `low` | Native Ask role behavior and read-only hardening retained (`.env.example` accessible) |
| **`plan`** | `deepseek/deepseek-v4.1-flash`, explicit `high` | Research-only `task` allowlist (`explore`, `doc-summarizer`, `file-picker`, `local-scout`) and stronger-planning escape route via a stronger native `Plan` session |
| **`debug`** | `deepseek/deepseek-v4.1-flash`, explicit `high` | Deeper diagnosis on Flash with full verification `bash` permissions; escalate to `@mid-surgeon` / `@deep-surgeon` when diagnosis exceeds Flash |
| **`explore`** | `deepseek/deepseek-v4.1-flash`, `low` | Native exploration role behavior and read-only hardening (`steps: 10`; `.env.example` accessible) |
| **`doc-summarizer`, `file-picker`** | `deepseek/deepseek-v4.1-flash`, `low` initially | Ordered `read` exclusions (including nested monorepo globs and `.env.example` exception), `/tmp/**` + Kilo truncation storage access, and concise evidence |
| **Unpinned `task` fallback** | `deepseek/deepseek-v4.1-flash` (`subagent_model`) | Fallback model does not itself guarantee `low` effort; inspect/configure the fallback variant if unpinned agents are used |
| **`small_model`** | Retain `deepseek/deepseek-v4.1-flash` | Verified model ID so [small-model resolution](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/provider/provider.ts) always resolves cleanly |
| **`title`, `summary`** | Retain `deepseek/deepseek-v4.1-flash`, `low` | Separate explicit helper agent settings using `options.reasoning.effort` |
| **`memory_model`** | Retain `deepseek/deepseek-v4.1-flash` | Uses `ProviderTransform.smallOptions(model)` ([`memory/ports.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/memory/ports.ts))—does **not** merge model `max_price` options or run `chat.params`; verify billing separately |
| **`compaction`** | Retain `openai/gpt-6-luna` | `compaction: { "auto": true }` with `prune` omitted; forwards originating user message ([`compaction.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/session/compaction.ts)), so record **effective effort as well as model** during tests |
| **`code-pinned`, `mid-surgeon`** | `openai/gpt-6.1-terra`, `medium` | Explicit expert use (`steps: 30` on `mid-surgeon`); same-tier continuation (`task_id`) vs. fresh-task escalation (no `task_id`) |
| **`deep-surgeon`** | `google/gemini-4-argon`, `high` | Deliberate higher-cost specialist (`steps: 35`); monitor shared output limits/truncation and note Argon's Dec 1, 2026 rate increase after Nov 30, 2026 introductory pricing |
| **Jev comparison path (`code-jev`)** | `openrouter/jev-router-low`, `low` | Explicit primary permissions matched to `code-pinned`; direct Flash `max_price` does **not** transfer to Jev (`models` is a preferred pool with fallback, `cost_tier: "low"` is not a dollar cap, and `effort: "low"` is a router hint; [Jev Router Docs](https://openrouter.ai/docs/guides/routing/routers/jev-router)) |
| **`local-scout`** | `ollama/qwen3-coder:30b`, optional | Local generation with no API charge; native `read`/`grep`/`glob` only (`bash` disabled); verify 32K context and processor residency via `ollama ps` and fall back to native filtering or Flash scouts when unavailable |
| **Semantic indexing/search** | `openai/text-embedding-3-small` (OpenRouter) | Independent cloud embedding calls and charges even when the generation model is local |
| **Jev MCP (`@jkudish/jev-mcp`)** | Own server/provider configuration | Separate model requests and charges when `jev_jev_*` tools run; does not inherit root Flash automatically (pin `@jkudish/jev-mcp@<version>` once validated for reproducible benchmarks) |
| **Context7 (`https://mcp.context7.com/mcp`)** | External documentation service | Availability, tool permissions (`context7_*` on `doc-summarizer`), and external rate/usage limits |
| **Other manual model profiles** | `gpt-6.1-sol`, `claude-sonnet-5.5`, `claude-opus-5.5`, `deepseek-v4.1-flash-1017`, `glm-5.3-flash` | Retained in `provider.openrouter.models` for manual `/models` selection and candidate testing; separate from default routing |

## File Roles in This Configuration

| File | Role in Rollout |
|---|---|
| `kilo.json` | **Active runtime configuration**: models, `options.reasoning.effort`, permissions, step loop limits, provider `max_price` guards, and MCP servers |
| `AGENTS.md` | **Active shared operating instructions**: loaded into sessions; defines the reasoning ladder, parent-vs-child failure taxonomy, output file reuse, worktree model pinning, and shared-worktree escalation |
| `skills/cost-tier-delegation/SKILL.md` | **Active on-demand skill**: detailed delegation, brief construction, worktree model pinning, and escalation procedures when loaded |
| `skills/verification-and-debugging/SKILL.md` | **Active on-demand skill**: baseline test strategy and exact `jev_jev_noul` / `jev_jev_review` tool names |
| `prompts/doc-summarizer.md`, `prompts/file-picker.md`, `prompts/local-scout.md` | **Active subagent prompts**: referenced via `{file:./prompts/...}` in `kilo.json` |
| `prompts/fast-worker.md`, `prompts/mid-surgeon.md`, `prompts/deep-surgeon.md` | **Reference documentation only**: `prompt` is omitted on implementation workers in `kilo.json` to preserve Kilo's native model-dependent prompts |
| `plugin/openrouter-session.ts` | **Active plugin**: normalizes `promptCacheKey` → `prompt_cache_key` on standard chat requests and appends compaction preservation rules |
| `README.md` | **Documentation**: setup, complete accounting matrix, CLI/behavioral validation, and cost measurement guide |

## Validation, Smoke Tests & Cost Accounting

### 1. Validate Config, Ollama Context & Resolved CLI Settings

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

### 2. Behavioral Verification Matrix

| Test | Passing Evidence |
|---|---|
| **Routine task in native `code`** | Flash (`low`) completes the edit/test loop; direct execution in `code` without spawning `@fast-worker` is a valid success |
| **Explicit delegation to `general` & `fast-worker`** | Actual child model resolves to `deepseek/deepseek-v4.1-flash` (`low`) and required project test/typecheck commands run without approval friction |
| **Routine worktree launched from a Terra parent (`code-pinned`)** | Calling `agent_manager` (`mode: "worktree"`) with explicit `agent: "code"`, `model: "openrouter/deepseek/deepseek-v4.1-flash"`, `variant: "low"`, and base branch resolves to Flash/`low` rather than inheriting Terra |
| **Native `debug` reproduction** | Actual repository test and Git-read commands (`git diff`, `npm test`, `pnpm typecheck`, `pytest`, etc.) run in `debug` mode with intended permissions |
| **Template discovery (`.env.example`)** | `.env.example` and `apps/web/.env.example` remain readable in `code`, `ask`, `plan`, `explore`, and custom scouts while real `.env` files remain protected |
| **Same-worker continuation (`task_id`)** | Continuing a `@fast-worker` session via `task_id` preserves Flash and session context |
| **Escalation from primary `code`, `debug`, or a cheap child** | Launching a fresh `@mid-surgeon` task (omitting `task_id`) uses `openai/gpt-6.1-terra` (`medium`) and receives the Shared-Worktree Escalation Packet |
| **`plan` restrictions & stronger planning route** | Research targets (`explore`, `doc-summarizer`, `file-picker`, `local-scout`) work; writable specialists and source-code mutation remain blocked while native plan artifacts remain writable; switching to a stronger model in `Plan` preserves source-edit restrictions |
| **Compaction model & effective effort** | Triggering compaction runs `openai/gpt-6-luna` (record both actual model and effective effort in case a saved session variant applies) and preserves requirements, prohibitions, failed approaches, validation state, and next steps |
| **Memory generation (`memory_model`)** | Observe actual model, billed cost, and request routing separately (since `memory/ports.ts` uses `ProviderTransform.smallOptions` outside `model.options` and `chat.params`) |
| **Native long-output handling & `@local-scout`** | Scout consumes Kilo's existing truncated full-output file without rerunning the shell command; `@local-scout` runs with 32K context and acceptable latency, or falls back cleanly to native filtering / Flash scouts when Ollama is stopped |
| **Flash `max_price` ceiling comparison (`$0.15/$0.65` vs. `$0.15/$0.40`)** | Compare actual completion time, throughput, and billed task cost across a 10–20 task trial to confirm whether including faster endpoints (Wafer/CoreWeave) beats the stricter `$0.40` completion cap |
| **Jev comparison (`code-jev` or `/models` in `code`)** | Same task conditions and primary permissions; record actual routed models, effective effort, and billed cost |

### 3. Spending Controls & Complete Billed-Cost Trial (10–20 Representative Tasks)

- **`steps` Are Loop Caps, Not Dollar Budgets**: `fast-worker` (`25`), `mid-surgeon` (`30`), and `deep-surgeon` (`35`) cap per-invocation tool loops, not lifetime spend across resumed or newly spawned tasks. Maintain an aggregate OpenRouter key/account budget alongside per-model `max_price` eligibility filters.
- **Output-Limit & Upcoming Pricing Notes**:
  - Kilo's OpenRouter path applies a shared output ceiling unless overridden ([`transform.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/provider/transform.ts)). Monitor `finish_reason: "length"` and incomplete tool calls, especially on `@deep-surgeon` (`gemini-4-argon` at `high` effort).
  - Google's introductory pricing for `gemini-4-argon` runs through **November 30, 2026**, with higher rates starting **December 1, 2026**.
- **Measure All Unique Billed Requests Without Double Counting**:
  - Across a 10–20 task batch, record **provider-reported billed USD**, end-to-end time, permission interruptions, escalation rate, cache hit rate, and any human repair across all unique requests:
    1. Parent session execution
    2. Shared-tree child subagents (`task`)
    3. Isolated **Agent Manager worktree sessions** (`agent_manager`)
    4. Escalations and failed attempts
    5. Background helpers (`title`, `summary`, `memory_model`, `compaction`)
    6. Jev MCP calls (`@jkudish/jev-mcp`) and OpenRouter `text-embedding-3-small` indexing calls
  - Do not add a parent aggregate to child totals if the aggregate already includes them, and prefer provider-reported billed USD over summing completion and reasoning token counters.
