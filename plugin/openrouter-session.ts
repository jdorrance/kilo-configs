// ~/.config/kilo/plugin/openrouter-session.ts
// Narrow, side-effect-free Kilo plugin:
// 1. Normalizes Kilo's camelCase `promptCacheKey` option to OpenRouter's documented
//    `prompt_cache_key` field (alongside Kilo's native `X-Session-Id` header).
// 2. Preserves key task state during session compaction without touching native
//    `read` results (`metadata.loaded`) or rewriting message history.

interface ChatParamsInput {
  sessionID?: string
  model?: {
    providerID?: string
  }
}

interface ChatParamsOutput {
  options?: Record<string, unknown> & {
    promptCacheKey?: string
    prompt_cache_key?: string
  }
}

interface SessionCompactingOutput {
  context?: string[]
}

const server = async () => ({
  "chat.params": async ({ sessionID, model }: ChatParamsInput, output: ChatParamsOutput) => {
    if (model?.providerID !== "openrouter") return
    const options = (output.options ??= {})
    options.prompt_cache_key ??= options.promptCacheKey ?? sessionID
    delete options.promptCacheKey
  },
  "experimental.session.compacting": async (_input: unknown, output: SessionCompactingOutput) => {
    output.context?.push(
      "Preserve in compaction summary: (1) user requirements & prohibitions, (2) exact file paths & symbols modified, (3) verification commands run & their outcomes, (4) failed hypotheses/approaches to avoid repeating, and (5) next concrete action."
    )
  },
})

export default {
  id: "openrouter-session",
  server,
}
