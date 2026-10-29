// ~/.config/kilo/plugin/openrouter-session.ts
// Normalizes Kilo's camelCase `promptCacheKey` option to OpenRouter's documented
// `prompt_cache_key` and `session_id` fields for sticky provider & cache affinity.

const server = async () => ({
  "chat.params": async ({ sessionID, model }: any, output: any) => {
    if (model?.providerID !== "openrouter") return
    const options = (output.options ??= {})
    options.prompt_cache_key ??= options.promptCacheKey ?? sessionID
    options.session_id ??= sessionID
    delete options.promptCacheKey
  },
})

export default {
  id: "openrouter-session",
  server,
}
