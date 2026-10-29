// ~/.config/kilo/plugin/openrouter-session.ts
// Narrow, side-effect-free Kilo plugin typed against @kilocode/plugin:
// 1. Normalizes Kilo's camelCase `promptCacheKey` option to OpenRouter's documented
//    `prompt_cache_key` field (alongside Kilo's native `X-Session-Id` header).
// 2. Preserves task and independent-review (@reviewer) state during session compaction
//    without touching native `read` results (`metadata.loaded`) or rewriting message history.

import type { Plugin, PluginModule } from "@kilocode/plugin"

const server: Plugin = async () => ({
  "chat.params": async ({ sessionID, model }, output) => {
    if (model?.providerID !== "openrouter") return
    const options = (output.options ??= {})
    const existingCacheKey =
      typeof options.promptCacheKey === "string" ? options.promptCacheKey : undefined
    options.prompt_cache_key ??= existingCacheKey ?? sessionID
    delete options.promptCacheKey
  },
  "experimental.session.compacting": async (_input, output) => {
    output.context.push(
      "Preserve in compaction summary: (1) user requirements & prohibitions, (2) exact file paths & symbols modified, (3) verification commands run & their outcomes, (4) failed hypotheses/approaches to avoid repeating, (5) independent-review (@reviewer) state: whether review is required, reviewer task_id, resolved model and effort, latest verdict, unresolved findings, review baseline and change-set identity (baseline revision + captured diff and untracked-file content digest), and any material edits made after that review, and (6) next concrete action."
    )
  },
})

const plugin: PluginModule = {
  id: "openrouter-session",
  server,
}

export default plugin
