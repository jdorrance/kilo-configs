# Kilo Code — Flash-First Execution with Mandatory Independent Terra Review

A production-ready global configuration (`~/.config/kilo`) for [Kilo Code](https://kilo.ai/docs) (VS Code, JetBrains, and CLI, verified against [Kilo CLI v7.8.25 source](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/package.json)) engineered for **cheap Flash-first execution, mandatory independent Terra review (`@reviewer`) on substantive changes, evidence-based specialist escalation, high prompt-cache affinity, and complete cost accounting** across [OpenRouter](https://openrouter.ai/docs/quickstart), [Jev System One MCP](https://www.npmjs.com/package/@jkudish/jev-mcp), [Context7 MCP](https://github.com/upstash/context7), and optional local [Ollama](https://ollama.com/) inference.

## Key Architectural Decisions

1. **Cheap Execution + Mandatory Independent Strong Review (`@reviewer`)**:
   - **Flash-First Execution**: [`openrouter/deepseek/deepseek-v4.1-flash`](https://openrouter.ai/deepseek/deepseek-v4.1-flash) owns routine implementation and discovery at `low` effort (`code`, `general`, `fast-worker`, `ask`, `explore`, `doc-summarizer`, `file-picker`) and bounded deeper diagnosis/planning at explicit `high` effort (`debug`, `plan`).
   - **Upfront or Evidence-Based Escalation**: Any cheap execution path can escalate immediately to **`@mid-surgeon`** (`openai/gpt-6.1-terra`, `medium`) or **`@deep-surgeon`** (`google/gemini-4-argon`, `high`) when architectural uncertainty, conflicting contracts, or difficult invariants justify it—neither two failed cheap attempts nor a Flash-`high` detour is required when the need is already clear.
   - **Mandatory Independent Terra Review Gate (`@reviewer`)**: Because [Kilo's native `/review` command](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/review/command.ts) does not pin a stronger model, `kilo.json` defines a dedicated **`@reviewer`** subagent pinned to [`openrouter/openai/gpt-6.1-terra`](https://openrouter.ai/openai/gpt-6.1-terra) (`medium` effort, `steps: 20`, `prompt` omitted to preserve native model-family prompting).
   - **Instruction-Level Gate Scope**: Before claiming final completion on any substantive behavioral change, new feature, non-obvious bug fix, public contract/auth/security/data/migration/concurrency/state change, or task with lingering uncertainty or prior failed hypotheses, the **primary agent** runs one bounded foreground `@reviewer` pass after writes and verification settle. Clearly mechanical changes (formatting, spelling, generated files, equivalent renames) may skip review with a brief reason. Passing tests or advisory `jev_jev_review` / `jev_jev_gate` scores never waive this gate. (Note: this is an **instruction-level completion policy**, not a deterministic application-enforced approval system.)
   - **Strict Deny-by-Default `@reviewer` Permissions**: Because [Kilo merges custom-agent permissions with defaults](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/agent/agent.ts), `@reviewer` uses the same strict `"*": "deny"` permission surface as `@local-scout` (allowing only ordered `read` with generated-file and `.env` exclusions, `/tmp/**` and `/private/tmp/**`, `glob`, `grep`, `list`, `semantic_search`, and `skill`). Shell (`bash`), edits, writes, patching, `task` delegation, `agent_manager`, and MCP tools are completely disabled; the parent supplies captured diffs and verification output while `@reviewer` independently reads source files.
2. **Explicit Model & Variant Pinning on Agent Manager Worktrees**:
   - In [`agent-manager.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/tool/agent-manager.ts), isolated worktree sessions inherit the **invoking turn's model and selected reasoning variant** when omitted, and require a selectable **primary agent** (`fast-worker` and `mid-surgeon` are rejected).
   - Routine `agent_manager` worktree calls must explicitly pass `{"agent": "code", "model": "openrouter/deepseek/deepseek-v4.1-flash", "variant": "low"}` and the intended base branch.
3. **Preserved Native Prompts, Full `debug` Verification & Native `.env.example` Handling**:
   - Custom `prompt` overrides are omitted on `code`, `code-pinned`, `code-jev`, `plan`, `debug`, `ask`, `general`, `fast-worker`, `mid-surgeon`, `deep-surgeon`, and `reviewer`, preserving Kilo's native role behavior, model-dependent prompting ([`system.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/session/system.ts)), and tool selection ([`registry.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/tool/registry.ts)).
   - **Native `debug` Verification Parity & Repo Precedence**: `agent.debug` includes the same verification and Git-read `bash` allowlist as `code`, `code-pinned`, `code-jev`, `general`, and implementation workers. Repository-specific contracts and canonical verification commands take precedence over generic workflow defaults (without overriding runtime tool permissions).
   - **Preserved `.env.example` Access in `ask`, `plan`, and `explore`**: Global `.env*` hard-denies are omitted from root `permission.read` so native `denies(user)` hardening ([`agent/index.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/agent/index.ts)) does not block `.env.example` in `ask`, `plan`, and `explore`, relying on [Kilo's native `.env` read approval guard](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/permission/read.ts) while strict `"*": "deny"` subagents (`doc-summarizer`, `file-picker`, `local-scout`, `reviewer`) retain ordered `.env` denies followed by `.env.example` allows.
4. **Same-Tier Resumption vs. Fresh-Task Escalation & Focused `@reviewer` Rechecks**:
   - In [`task.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/tool/task.ts), resuming an existing `task_id` reuses the child session's stored model ahead of a newly selected agent's default model.
   - Start a **fresh `task`** (omit `task_id`) when escalating implementation tiers or when launching `@reviewer` (never pass the implementation worker's `task_id` to `@reviewer`). Once `@reviewer` has run, resume the **same `@reviewer` `task_id`** for focused rechecks after fixes; any new code edit invalidates an earlier `pass` covering those files.
5. **Caching, Compaction & Provider Routing Defaults (Plus Optional Experiments)**:
   - **Session Plugin ([`plugin/openrouter-session.ts`](./plugin/openrouter-session.ts))**: Normalizes Kilo's camelCase `promptCacheKey` to OpenRouter's `prompt_cache_key` (Kilo already sends `X-Session-Id`; the plugin does not duplicate headers or rotate cache keys) and appends state-preservation guidance on compaction.
   - **Compaction Pruning Semantics**: Setting `"compaction": { "auto": true }` while omitting `"prune"` disables routine normal-turn pruning (preserving cached prefixes across normal turns) while **retaining payload-limit recovery pruning and post-compaction cleanup** ([`compaction.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/session/compaction.ts)). Do not set `prune: false` or alter compaction timing/retained-history defaults for the baseline.
   - **Optional Luna Compaction Cache Experiment (Documented Only — Not Enabled by Default)**: To test whether avoiding unused cache writes on one-shot compaction summaries saves more than potential repeated-prefix reads, evaluate setting `agent.compaction.options.prompt_cache_options = {"mode": "explicit"}` on `compaction` only (never globally).
   - **Flash Provider Ceiling (`$0.15 / $0.65`)**: Keeps default OpenRouter provider routing with `"max_price": { "prompt": 0.15, "completion": 0.65 }` on `deepseek/deepseek-v4.1-flash` and `deepseek-v4.1-flash-1017` (a hard eligibility filter admitting faster ~190–199 tok/s endpoints like Wafer and CoreWeave alongside Morph/Decart). Compare against the tighter `$0.15 / $0.40` ceiling separately without adding custom provider ordering.

## Complete Accounting & Ownership Matrix (18 Agent Definitions + Supporting Paths)

"Explicit" below means the desired effective setting must be verified after configuration loading, saved model selections, and session variants are applied ([request option precedence](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/session/llm/request.ts)).

| Execution Path | Intended Assignment | What Must Be Accounted For |
|---|---|---|
| **Default primary `code`** | `deepseek/deepseek-v4.1-flash`, `low` | Root `model`, `default_agent: "code"`, and `agent.code.model`; owns routine execution and orchestrates the mandatory `@reviewer` gate |
| **Independent review gate (`@reviewer`)** | `openai/gpt-6.1-terra`, `medium` | Dedicated read-only subagent (`steps: 20`, `"*": "deny"`, no `bash`/edits/MCP); invoked via fresh foreground `task` (explicitly selecting Terra/`medium`), with `task_id` resumed only for focused rechecks |
| **Agent Manager worktrees (`agent_manager`)** | `code` on `deepseek/deepseek-v4.1-flash`, `low` (routine) | Inherits caller's model/variant if omitted ([`agent-manager.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/tool/agent-manager.ts)); must explicitly pass `agent: "code"`, `model`, `variant: "low"`, and base branch |
| **`general`** | `deepseek/deepseek-v4.1-flash`, `low` | Explicit `agent.general.model` assignment required because it overrides root `subagent_model`; returns `review_required` flag |
| **`fast-worker`** | `deepseek/deepseek-v4.1-flash`, `low` | Routine implementation (`steps: 25` loop cap); returns `review_required: true\|false` with reason, changed paths, and verification results |
| **`ask`** | `deepseek/deepseek-v4.1-flash`, `low` | Native Ask role behavior and read-only hardening retained (`.env.example` accessible) |
| **`plan`** | `deepseek/deepseek-v4.1-flash`, explicit `high` | Research-only `task` allowlist (`explore`, `doc-summarizer`, `file-picker`, `local-scout`) and stronger-planning escape route via a stronger native `Plan` session |
| **`debug`** | `deepseek/deepseek-v4.1-flash`, explicit `high` | Deeper diagnosis on Flash with full verification `bash` permissions; escalate to `@mid-surgeon` / `@deep-surgeon` when diagnosis exceeds Flash |
| **`explore`** | `deepseek/deepseek-v4.1-flash`, `low` | Native exploration role behavior and read-only hardening (`steps: 10`; `.env.example` accessible) |
| **`doc-summarizer`, `file-picker`** | `deepseek/deepseek-v4.1-flash`, `low` initially | Ordered `read` exclusions (including nested monorepo globs and `.env.example` exception), `/tmp/**` + Kilo truncation storage access, and concise evidence |
| **Unpinned `task` fallback** | `deepseek/deepseek-v4.1-flash` (`subagent_model`) | Fallback model does not itself guarantee `low` effort; inspect/configure the fallback variant if unpinned agents are used |
| **`small_model`** | Retain `deepseek/deepseek-v4.1-flash` | Verified model ID so [small-model resolution](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/provider/provider.ts) always resolves cleanly |
| **`title`, `summary`** | Retain `deepseek/deepseek-v4.1-flash`, `low` | Separate explicit helper agent settings using `options.reasoning.effort` |
| **`memory_model`** | Retain `deepseek/deepseek-v4.1-flash` | Uses `ProviderTransform.smallOptions(model)` ([`memory/ports.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/kilocode/memory/ports.ts))—does **not** merge model `max_price` options or run `chat.params`; verify billing separately |
| **`compaction`** | Retain `openai/gpt-6-luna` | `compaction: { "auto": true }` with `prune` omitted; forwards originating user message ([`compaction.ts`](https://github.com/Kilo-Org/kilocode/blob/0a9faeff69fff8712da184ee5188bb7985c6f057/packages/opencode/src/session/compaction.ts)), so record **effective effort as well as model** |
| **`code-pinned`, `mid-surgeon`** | `openai/gpt-6.1-terra`, `medium` | Explicit expert implementation (`steps: 30` on `mid-surgeon`); upfront or evidence-based escalation via fresh `task` (no `task_id`) |
| **`deep-surgeon`** | `google/gemini-4-argon`, `high` | Deliberate higher-cost specialist (`steps: 35`); monitor shared output limits/truncation and note Argon's Dec 1, 2026 rate increase after Nov 30, 2026 introductory pricing |
| **Jev comparison path (`code-jev`)** | `openrouter/jev-router-low`, `low` | Explicit primary permissions matched to `code-pinned`; direct Flash `max_price` does **not** transfer to Jev (`models` is a preferred pool with fallback, `cost_tier: "low"` is not a dollar cap, and `effort: "low"` is a router hint; [Jev Router Docs](https://openrouter.ai/docs/guides/routing/routers/jev-router)) |
| **`local-scout`** | `ollama/qwen3-coder:30b`, optional | Local generation with no API charge; native `read`/`grep`/`glob` only (`bash` disabled); verify 32K context and processor residency via `ollama ps` and fall back to native filtering or Flash scouts when unavailable |
| **Semantic indexing/search** | `openai/text-embedding-3-small` (OpenRouter) | Independent cloud embedding calls and charges even when the generation model is local |
| **Jev MCP (`@jkudish/jev-mcp`)** | Own server/provider configuration | Optional advisory tools; separate model requests and charges that never waive `@reviewer` (pin `@jkudish/jev-mcp@<version>` once validated) |
| **Context7 (`https://mcp.context7.com/mcp`)** | External documentation service | Availability, tool permissions (`context7_*` on `doc-summarizer`), and external rate/usage limits |
| **Other manual model profiles** | `gpt-6.1-sol`, `claude-sonnet-5.5`, `claude-opus-5.5`, `deepseek-v4.1-flash-1017`, `glm-5.3-flash` | Retained in `provider.openrouter.models` for manual `/models` selection and candidate testing; separate from default routing |

## File Roles in This Configuration

| File | Role in Rollout |
|---|---|
| `kilo.json` | **Active runtime configuration**: 18 agent definitions (including `@reviewer`), models, `options.reasoning.effort`, permissions, step loop limits, provider `max_price` guards, and MCP servers |
| `AGENTS.md` | **Active shared operating instructions**: loaded into sessions; defines the reasoning ladder, mandatory `@reviewer` gate, failure taxonomy, output file reuse, worktree model pinning, and shared-worktree escalation |
| `skills/cost-tier-delegation/SKILL.md` | **Active on-demand skill**: detailed delegation, brief construction, `@reviewer` brief & focused-recheck workflow, worktree model pinning, and escalation procedures |
| `skills/verification-and-debugging/SKILL.md` | **Active on-demand skill**: baseline test strategy, optional Jev preliminary checks vs. mandatory `@reviewer` gate |
| `skills/jev-judgment/SKILL.md` | **Active on-demand skill**: contracts for optional/advisory `jev_jev_*` tools (`evidence` requirements and non-waiver of `@reviewer`) |
| `prompts/doc-summarizer.md`, `prompts/file-picker.md`, `prompts/local-scout.md` | **Active subagent prompts**: referenced via `{file:./prompts/...}` in `kilo.json` |
| `prompts/fast-worker.md`, `prompts/mid-surgeon.md`, `prompts/deep-surgeon.md` | **Reference documentation only**: `prompt` is omitted on implementation workers and `@reviewer` in `kilo.json` to preserve Kilo's native model-dependent prompts |
| `plugin/openrouter-session.ts` | **Active plugin**: normalizes `promptCacheKey` → `prompt_cache_key` on standard chat requests and appends compaction preservation rules |
| `README.md` | **Documentation**: setup, complete accounting matrix, CLI/behavioral validation, and cost measurement guide |

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
| **1. Mechanical change skips `@reviewer`** | Formatting, typo fix, or straightforward rename skips `@reviewer` and records a brief mechanical-exemption reason |
| **2. Substantive Flash change invokes `@reviewer` despite passing tests** | After Flash (`code` or `@fast-worker`) finishes a behavioral/contract change and tests pass, primary launches a fresh foreground `@reviewer` task on `openai/gpt-6.1-terra` (`medium`) |
| **3. `@reviewer` read-only & non-delegating isolation** | `@reviewer` reads supplied diff files (`/tmp/**` or workspace) and source files via native `read`/`grep`/`glob`, while `bash`, file edits/writes, `task`, `agent_manager`, and MCP tools are denied |
| **4. `@reviewer` findings → fix → verification → focused recheck** | When `@reviewer` returns `changes_required` with `path:line` and failure scenario, parent/worker applies fixes, reruns verification, and resumes the **same `@reviewer` `task_id`** for a focused recheck until `pass` |
| **Routine worktree launched from a Terra parent (`code-pinned`)** | Calling `agent_manager` (`mode: "worktree"`) with explicit `agent: "code"`, `model: "openrouter/deepseek/deepseek-v4.1-flash"`, `variant: "low"`, and base branch resolves to Flash/`low` |
| **Native `debug` reproduction & `.env.example` discovery** | Repository test and Git-read commands run in `debug` without approval friction; `.env.example` is readable in `code`, `ask`, `plan`, `explore`, and custom scouts/reviewer while `.env` remains protected |
| **Upfront or post-blocker escalation (`@mid-surgeon`)** | Launching a fresh `@mid-surgeon` task (omitting `task_id`) uses `openai/gpt-6.1-terra` (`medium`) and receives the Shared-Worktree Escalation Packet |
| **`plan` restrictions & stronger planning route** | Research scouts work; writable specialists, `@reviewer`, and source-code mutation remain blocked while native plan artifacts remain writable |
| **Compaction & memory generation observation** | Compaction runs `openai/gpt-6-luna` (record model and effective effort); `memory_model` (`ProviderTransform.smallOptions`) billing and routing are observed separately |

### 3. Spending Controls & Complete Billed-Cost Trial (10–20 Representative Tasks)

- **Track Total Billed Cost & Review Gate ROI Across 10–20 Real Tasks**:
  - Sum **provider-reported billed USD**, elapsed time, permission interruptions, human repair, and **reviewer findings that required fixes** across all unique requests:
    1. Parent session execution (distinguishing **pre-compaction Flash**, **Luna compaction**, and **resumed post-compaction Flash** requests)
    2. Shared-tree implementation subagents (`@fast-worker`, `@mid-surgeon`, `@deep-surgeon`, `@general`) and discovery scouts
    3. **Independent `@reviewer` initial reviews and focused rechecks (`openai/gpt-6.1-terra`)**
    4. Isolated **Agent Manager worktree sessions** (`agent_manager`)
    5. Escalations and failed attempts
    6. Background helpers (`title`, `summary`, `memory_model`, `compaction`)
    7. Optional Jev MCP calls (`@jkudish/jev-mcp`) and OpenRouter `text-embedding-3-small` indexing calls
- **Token & Cache Accounting Discipline**:
  - Record actual resolved model/provider and cache reads/writes (`cached_tokens` / `cache_write_tokens`) from OpenRouter generation metadata.
  - **Do not mix raw provider token totals with Kilo's normalized UI counters**, do not add a parent aggregate to child totals if the aggregate already includes child requests, and rely on provider-reported billed USD rather than summing completion and reasoning token counters.
- **Retained Guardrails**:
  - Maintain an aggregate OpenRouter key/account spending limit (`steps` are per-invocation loop caps, not lifetime dollar caps).
  - Pin `@jkudish/jev-mcp@<version>` in `kilo.json` after validating a specific release in your environment.
  - Monitor `finish_reason: "length"` and truncated tool calls under Kilo's shared output ceiling (especially on `@deep-surgeon` at `high` effort), and re-verify specialist budgets before **December 1, 2026** when Google's `gemini-4-argon` introductory pricing ends.
