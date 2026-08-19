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
- `discover_task_models` queries a connection's authenticated provider catalog without registering anything.
- `select_task_models` replaces the enabled set; `ids: []` explicitly disables every route on that connection.
- `register_task_model` creates or updates a task-model route and its reusable connection profile.
- `prepare_model_portraits` expands a short “build initial portraits” request into candidate discovery, the portrait ontology, evidence gathering, persistence, and validation.
- `get_model_portrait`, `upsert_model_portrait`, and `validate_model_portrait` manage evidence-backed router profiles.
- `invoke_task_model` invokes a callable multimodal route through its runtime adapter.
- `summarize_model_usage` aggregates native LLM and task-model observations from the current durable session.

Registration tools accept credential references such as `OPENAI_API_KEY`, never API-key values. Providers that need multiple credentials use named references, for example `appId: DOUBAO_APPID` and `token: DOUBAO_TOKEN`. The user enters actual values only in secure Settings credential fields; the Agent can fill provider, URL, model catalog, and profile metadata.

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
      profile: {}
    volcengine:
      provider: volcengine
      displayName: Volcengine (Ark / Doubao)
      credentialRefs:
        arkApiKey: ARK_API_KEY
        speechAppId: DOUBAO_APPID
        speechToken: DOUBAO_TOKEN
      baseURL: https://ark.cn-beijing.volces.com/api/v3
      catalogEndpoint: https://ark.cn-beijing.volces.com/api/v3/models
      catalogCredentialName: arkApiKey
      profile:
        catalogDiscovery: openai-models
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
      capabilities: [image.generate]
      operations: [generate, edit]
      roles: [image-generator]
      profile: {}
```

Built-in catalog entries include `openai/gpt-image-2` plus conservative Lore-compatible Doubao routes for ASR (`doubao/volc.bigasr.sauc.duration`) and TTS (`doubao/seed-tts-1.0`). The Doubao routes belong to the unified `volcengine` connection and select only the speech credential slots they require. They appear in `list_task_models`, not in the language-model picker, and remain explicitly `registered-only` with `callable: false` until their runtime adapters are installed.

Supported tasks cover image understanding/generation, speech synthesis/transcription/translation/analysis, voice conversion/cloning/design, podcasts, realtime speech, audio/video generation, embedding, and reranking. Routes also declare Lore-compatible capability ids such as `speech.transcribe.file`, `speech.synthesize.short`, and `speech.realtime_session`; `file` is a distinct input modality. Input/output modalities, operations, and execution lifecycle remain separate so task semantics are not conflated with modality.

The built-in `volcengine` connection unifies Ark and Doubao at provider level while keeping authentication product-specific: Ark catalog discovery uses `ARK_API_KEY`; speech routes use `DOUBAO_APPID` and `DOUBAO_TOKEN`. Ark models are discoverable from `/api/v3/models`. Speech resource ids remain documented registrations because the Ark catalog is not an account entitlement list for every speech resource. Discovery never auto-registers or auto-enables models.

Every task route has an explicit `enabled` state. Selection is replacement-based, and an empty selection remains empty: it never falls back to the full provider catalog. Disabled routes stay inspectable for portrait work but are not callable.

## Portraits, invocation, and routing evidence

A portrait keeps evidence-backed provider or assessor claims—pricing, specialties, limitations, speed class, typical latency, and normalized routing scores—separate from measured usage. Portraits cover task route ids and LLM ids in `llm:<provider>/<model>` form. Price rates carry operation, billing unit, currency, effective dates, and an evidence id so stale claims can be detected. Registration remains authoritative for capabilities, input/output modalities, execution mode, and operations.

The user can simply say “build the initial portraits.” Installed guidance requires the Harness Agent to call `prepare_model_portraits`, infer scope from recent registration/discovery context, gather current official documentation or benchmark evidence, save each portrait with `upsert_model_portrait`, and run `validate_model_portrait`. A paid or traffic-producing live probe still requires explicit approval.

Runtime providers implement `TaskModelRuntimeAdapter`. `invoke_task_model` records privacy-safe task metrics. LLM observations reuse native durable Harness `request/header`, `step/start`, and `assistant/message.usage` events, so no wrapper or duplicate content log is added. `summarize_model_usage` aggregates counts, success, latency, tokens, and cost without copying prompts, responses, media, or credentials.

## Runtime boundary

- This plugin owns registration, portraits, Settings schemas, safe credential references, the unified invocation entry point, and privacy-safe invocation observations.
- llm-pi-ai owns language-model protocol adaptation and execution.
- Independent provider adapters execute image/audio/video routes and handle binary artifacts through `TaskModelRuntimeAdapter`; routes without one remain registered-only.
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
dsh plugin --profile web add "$PWD/artifacts/dsh-multi-model-provider-0.1.0-rc.7.tgz"
```

After publication:

```sh
dsh plugin --profile web add 'dsh-multi-model-provider@0.1.0-rc.7'
```

Restart running DSH Web processes after upgrading, then create a new Agent task so the new tools and system-prompt guidance are loaded.

## Development

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.
