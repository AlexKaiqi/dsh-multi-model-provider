# dsh-multi-model-provider

English | [中文](README.zh.md)

Agent-assisted model management for DeepSeek Harness. The plugin does not implement another LLM adapter or maintain a parallel registry. The official `@deepseek-ai/dsh-llm-pi-ai` `llm-pi-ai` settings namespace remains the single source of truth for provider routes and model catalogs.

It contributes three model-visible tools:

- `list_model_routes` inspects live or dormant provider routes, safe credential status, and live model catalogs.
- `configure_model_route` creates or updates a pi-ai provider profile while preserving existing fields that were not supplied. It accepts a credential reference (`apiKeyEnv`), never an API key value.
- `select_default_model` validates and saves the primary model used by newly created Agents.

## Install

The package is a DSH composition bundle targeting DeepSeek Harness `0.1.0-rc.6`:

Install from a local checkout before the first npm release:

```sh
git clone https://github.com/AlexKaiqi/dsh-multi-model-provider.git
cd dsh-multi-model-provider
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
mkdir -p artifacts
pnpm pack --pack-destination artifacts
dsh plugin --profile web add "$PWD/artifacts/dsh-multi-model-provider-0.1.0-rc.1.tgz"
```

After the package is published to npm:

```sh
dsh plugin --profile web add 'dsh-multi-model-provider@0.1.0-rc.1'
```

Restart running DSH Web processes after installation or upgrade, then create a new Agent task. `dsh-base` already mounts llm-pi-ai, Settings, Credentials, Tools, System Prompt, and agent-default-model; this bundle inserts only the multi-model-provider plugin.

## Secure onboarding flow

When a user asks an Agent to add OpenAI, the Agent should:

1. Inspect the built-in `openai` catalog route with `list_model_routes`.
2. Call `configure_model_route` with `provider: openai` and `apiKeyEnv: OPENAI_API_KEY`.
3. If the result reports `requiresCredential: true`, direct the user to the secure API-key field on the Web Models page.
4. Inspect the now-live catalog and choose an exact model id.
5. Save it with `select_default_model`.

Never place API keys in chat, tool arguments, or `settings.yaml`. The Web Models page stores values through the Credentials seam; provider settings hold references only.

The minimal OpenAI settings are:

```yaml
llm-pi-ai:
  providers:
    openai:
      apiKeyEnv: OPENAI_API_KEY

agent-default-model:
  provider: openai
  model: <gpt-model-id>
  reasoningEffort: high
```

Because `openai` is a built-in pi-ai route, omit its endpoint, protocol, and model list to inherit the installed catalog. A non-empty explicit `models` list replaces that catalog.

## Runtime boundaries

- llm-pi-ai hot-loads provider settings.
- Credentials resolve for each model request, independently of provider metadata.
- Default selection affects future Agents only. Existing sessions retain their session selection and use the Web model picker to switch.
- Version 0.1 does not delete providers, accept credential values, perform dynamic routing, or replace the Web Models page.

Future dynamic routing belongs in an `agent/request` policy layer selecting among already registered candidates; it should not own registration or secrets.

## Development

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.
