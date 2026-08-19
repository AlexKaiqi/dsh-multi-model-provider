# dsh-multi-model-provider

English | [中文](README.zh.md)

Agent-assisted model registration for DeepSeek Harness. It deliberately separates registration from execution:

- Primary language models remain registered and executed by `@deepseek-ai/dsh-llm-pi-ai`.
- Image, speech, audio, video, embedding, and reranking models live in this plugin's task-model catalog.
- A task-model registration describes a route; a separate runtime adapter is still required to invoke it.

This keeps non-language models out of the LLM contract and provides a stable registration layer for future dynamic routing.

## Agent tools

- `list_model_routes`, `configure_model_route`, and `select_default_model` manage primary language models through llm-pi-ai.
- `inspect_volcengine_provider` returns safe credential state, the authenticated Ark catalog, selections, task routes, and correct invocation paths.
- `select_volcengine_language_models` replaces the Ark language/VLM selection; an empty array explicitly disables the route.
- `list_task_models` inspects non-language registrations and reports registration separately from callability.
- `discover_task_models` queries a connection's authenticated provider catalog without registering anything.
- `select_task_models` replaces the enabled set; `ids: []` explicitly disables every route on that connection.
- `register_task_model` creates or updates a task-model route and its reusable connection profile.
- `prepare_model_portraits` expands a short “build initial portraits” request into candidate discovery, the portrait ontology, evidence gathering, persistence, and validation.
- `get_model_portrait`, `upsert_model_portrait`, and `validate_model_portrait` manage evidence-backed router profiles.
- `invoke_task_model` invokes a callable multimodal route through its runtime adapter.
- `summarize_model_usage` aggregates native LLM and task-model observations from the current durable session.

Registration tools accept credential references such as `OPENAI_API_KEY`, never API-key values. Providers that need multiple credentials use named references, for example `appId: DOUBAO_APPID` and `token: DOUBAO_TOKEN`. The user enters actual values only in secure Settings credential fields; the Agent can fill provider, URL, model catalog, and profile metadata.

## Settings UI and data model

Installation extends the built-in **Models** Settings section instead of adding a separate Model Portraits navigation item. Each language-model disclosure contains one sectioned Markdown description, structured price rows, and measured availability / time-to-first-token / total latency with an observation timestamp. Speed is not hand-entered: an explicit test sends one minimal request capped at eight output tokens and may incur a small provider charge.

Catalog-less directory providers such as Volcengine Ark run a read-only model-directory connectivity check before their profile is committed. Ark remains an ordinary language-model provider using `ARK_API_KEY`. Doubao Speech is a separate task-model provider in the same Models page, with its own App ID, Access Token, Realtime API Key, built-in speech catalog, and registration-time Realtime connection test.

The UI creates no parallel source of truth. Ark language models are written to `llm-pi-ai.providers.volcengine`; Doubao Speech task models and all portrait bindings are written to `multi-model-provider`; credential values only cross the write-only Credentials API and never enter ordinary `settings.yaml`. ChatVoice only selects registered Realtime routes and does not own provider credentials.

The conversation model dropdown is searchable by provider, model id, display name, and description, so a large registry does not turn into an unscannable list.

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
    doubao-speech:
      provider: doubao-speech
      displayName: Doubao Speech
      credentialRefs:
        speechAppId: DOUBAO_APPID
        speechToken: DOUBAO_TOKEN
        realtimeApiKey: DOUBAO_REALTIME_API_KEY
      profile:
        product: doubao-speech
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

Built-in catalog entries include `openai/gpt-image-2` plus conservative Lore-compatible Doubao routes for ASR (`doubao/volc.bigasr.sauc.duration`), TTS (`doubao/seed-tts-1.0`), and Realtime Duplex (`doubao/realtime-duplex-3.0`). The Doubao routes belong to the independent `doubao-speech` connection and start disabled until selected in Models settings. They appear in `list_task_models`, not in the language-model picker.

Supported tasks cover image understanding/generation, speech synthesis/transcription/translation/analysis, voice conversion/cloning/design, podcasts, realtime speech, audio/video generation, embedding, and reranking. Routes also declare Lore-compatible capability ids such as `speech.transcribe.file`, `speech.synthesize.short`, and `speech.realtime_session`; `file` is a distinct input modality. Input/output modalities, operations, and execution lifecycle remain separate so task semantics are not conflated with modality.

`volcengine` and `doubao-speech` are separate providers because their protocols, credentials, catalogs, and probes differ. Ark catalog discovery uses `ARK_API_KEY`; batch speech routes use `DOUBAO_APPID` and `DOUBAO_TOKEN`; Realtime Duplex uses `DOUBAO_APPID` and `DOUBAO_REALTIME_API_KEY`. Speech resource ids remain documented built-ins because the Ark `/models` catalog is not a speech entitlement catalog.

Every task route has an explicit `enabled` state. Selection is replacement-based, and an empty selection remains empty: it never falls back to the full provider catalog. Disabled routes stay inspectable for portrait work but are not callable.

## Portraits, invocation, and routing evidence

A portrait keeps one sectioned qualitative Markdown description, structured pricing, and an explicit `performance.lastProbe` observation separate from long-term measured usage. Portraits cover task route ids and LLM ids in `llm:<provider>/<model>` form. Price rates carry operation, billing unit, currency, effective dates, and an evidence id so stale claims can be detected. Registration remains authoritative for capabilities, input/output modalities, execution mode, and operations.

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
dsh plugin --profile web add "$PWD/artifacts/dsh-multi-model-provider-0.1.0-rc.9.tgz"
```

After publication:

```sh
dsh plugin --profile web add 'dsh-multi-model-provider@0.1.0-rc.9'
```

Restart running DSH Web processes after upgrading, then create a new Agent task so the new tools and system-prompt guidance are loaded.

## Development

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.
