# dsh-multi-model-provider

English | [中文](README.zh.md)

Agent-assisted model registration for DeepSeek Harness. It deliberately separates registration from execution:

- Primary language models remain registered and executed by `@deepseek-ai/dsh-llm-pi-ai`.
- Image, speech, audio, video, embedding, and reranking models live in this plugin's task-model catalog.
- A task-model registration describes a route; a separate runtime adapter is still required to invoke it.

This keeps non-language models out of the LLM contract and provides a stable registration layer for future dynamic routing.

## Agent tools

- `list_model_routes`, `configure_model_route`, and `select_default_model` manage primary language models through llm-pi-ai.
- `list_task_models` inspects non-language registrations and reports registration separately from callability.
- `register_task_model` creates or updates a task-model route and its reusable connection profile.

Registration tools accept credential references such as `OPENAI_API_KEY`, never API-key values. The user enters the key only in a secure Settings credential field; the Agent can fill provider, URL, model catalog, and profile metadata.

## Settings model

The Settings UI exposes two complementary namespaces:

- `llm-pi-ai` is the sole source of truth for language-model providers and catalogs.
- `multi-model-provider` owns non-language `connections`, `models`, and optional per-task `defaults`.

Example task-model registration:

```yaml
multi-model-provider:
  connections:
    openai:
      provider: openai
      displayName: OpenAI
      credentialRef: OPENAI_API_KEY
      baseURL: https://api.openai.com/v1
  models:
    openai/gpt-image-2:
      connection: openai
      model: gpt-image-2
      displayName: GPT Image 2
      task: image-generation
      runtimeAdapter: openai-images
      input: [text, image]
      output: [image]
      execution: request-response
      operations: [generate, edit]
      roles: [image-generator]
      profile: {}
```

`openai/gpt-image-2` ships as a built-in catalog entry. It appears in `list_task_models`, not in the language-model picker. Until an `openai-images` runtime integration exists, it is explicitly returned as `registered-only` with `callable: false`.

Supported tasks are `image-generation`, `speech-synthesis`, `transcription`, `audio-generation`, `video-generation`, `embedding`, and `reranking`. Routes also describe input/output modalities, operations, and execution lifecycle, so task semantics are not conflated with modality.

## Runtime boundary

- This plugin owns registration, Settings schemas, safe credential references, and Agent-facing registration tools.
- llm-pi-ai owns language-model protocol adaptation and execution.
- Independent capability plugins should execute image/audio/video routes and handle binary artifacts; this release does neither.
- A future router should select only among registered routes that an execution runtime has actually claimed. It should not duplicate catalog or credential state.

## Install

The package is a DSH composition bundle targeting DeepSeek Harness `0.1.0-rc.6`:

```sh
git clone https://github.com/AlexKaiqi/dsh-multi-model-provider.git
cd dsh-multi-model-provider
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
mkdir -p artifacts
pnpm pack --pack-destination artifacts
dsh plugin --profile web add "$PWD/artifacts/dsh-multi-model-provider-0.1.0-rc.2.tgz"
```

After publication:

```sh
dsh plugin --profile web add 'dsh-multi-model-provider@0.1.0-rc.2'
```

Restart running DSH Web processes after upgrading, then create a new Agent task so the new tools and system-prompt guidance are loaded.

## Development

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.
