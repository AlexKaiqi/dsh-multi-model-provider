# dsh-multi-model-provider

English | [中文](README.zh.md)

This plugin has three capabilities:

1. **Register models** — language models stay in `@deepseek-ai/dsh-llm-pi-ai`; image, speech, audio, video, embedding, and reranking models live in this plugin's task-model catalog. The built-in `realtimeModelRuntime` owns Realtime route selection, credential resolution, and role profiles while provider plugins register wire adapters.
2. **Assist with portraits** — evidence-backed profiles plus an explicit eight-token speed probe. Settings owns these writes.
3. **Select the Agent model** — `selectAgentModel()` / `select_default_model` picks the primary language model for newly created Agents from the live language catalog. It does not auto-route task models.

Peer plugins inject `modelCatalog` and call `snapshot()` to read every registered model, portrait, and last probe. Installing this package does **not** make image, speech, or realtime models callable; `dsh-realtime-voice` supplies the GPT and Doubao full-duplex adapters.

## Capabilities

### 1. Registration

Language routes use `configure_model_route` / `list_model_routes`. Task routes use `register_task_model` / `list_task_models`. A task-model registration describes a route; a separate runtime adapter is still required to invoke it. `select_task_models` with `ids: []` disables every route on that connection without fallback.

### 2. Portraits

`prepare_model_portraits` returns seed facts, gaps, and official documentation URLs. The Agent opens those pages and calls `ingest_portrait_research` with http(s) source URLs; price rates must cite that evidence. `lastProbe` is measured by the Settings speed test, not copied from documentation. `get_model_portrait`, `upsert_model_portrait`, and `validate_model_portrait` still manage the stored profile.

### 3. Agent model

Selection is built on the catalog, not a parallel list:

```ts
export const inject = ['modelCatalog']

const snapshot = await ctx.modelCatalog.snapshot()
await ctx.modelCatalog.selectAgentModel({
  provider: 'volcengine',
  model: 'doubao-seed-1-6',
})
```

`snapshot().languageModels` is the live Agent-model candidate list, with portraits attached when they exist. `selectAgentModel()` refuses task models and unknown ids. It only affects newly created Agents.

Other plugins that only need the directory can stop at `snapshot()`. Do not scrape `settings.yaml`, and do not ask the Agent to call tools just to read the catalog.

## Agent tools

- `list_model_routes`, `configure_model_route`, and `select_default_model` manage primary language models through llm-pi-ai.
- `inspect_volcengine_provider` returns safe credential state, the authenticated Ark catalog, selections, task routes, and correct invocation paths.
- `select_volcengine_language_models` replaces the Ark language/VLM selection; an empty array explicitly disables the route.
- `list_task_models` inspects non-language registrations and reports registration separately from callability.
- `discover_task_models` queries a connection's authenticated provider catalog without registering anything.
- `select_task_models` replaces the enabled set; `ids: []` explicitly disables every route on that connection.
- `register_task_model` creates or updates a task-model route and its reusable connection profile.
- `prepare_model_portraits` expands a short “build initial portraits” request into seed facts, gaps, and official documentation URLs.
- `ingest_portrait_research` merges Agent-researched facts that have http(s) source URLs.
- `get_model_portrait`, `upsert_model_portrait`, and `validate_model_portrait` manage evidence-backed model profiles.
- `invoke_task_model` invokes a callable multimodal route through its runtime adapter.
- `summarize_model_usage` aggregates native LLM and task-model observations from the current durable session.

Registration tools accept credential references such as `OPENAI_API_KEY`, never API-key values. Doubao Realtime uses the single `DOUBAO_API_KEY` reference. The user enters actual values only in secure Settings credential fields; the Agent can fill provider, URL, model catalog, and profile metadata.

## Settings UI and data model

Installation extends the built-in **Models** Settings section instead of adding a separate Model Portraits navigation item. Language models expose portraits in their own disclosure; the Doubao Realtime row has a **Model Portrait** disclosure with the same sectioned Markdown description, structured price rows, and measured runtime fields. Speed is never hand-entered. Language-model probes send one minimal request capped at eight output tokens, while the Doubao Realtime probe opens one minimal session.

Catalog-less directory providers such as Volcengine Ark run a read-only model-directory connectivity check before their profile is committed. Ark remains an ordinary language-model provider using `ARK_API_KEY`. Doubao Speech is a separate provider in the same Models page, using one `DOUBAO_API_KEY`, a documented Realtime O/SC voice-profile catalog, and a registration-time connection test.

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
      credentialRef: DOUBAO_API_KEY
      credentialRefs:
        apiKey: DOUBAO_API_KEY
        realtimeApiKey: DOUBAO_API_KEY
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

The visible built-in catalog includes `openai/gpt-image-2`, `openai/gpt-realtime`, and 25 documented Realtime S2S-O/SC 2.0 voice profiles. Doubao fixes `session.model` to `1.2.6.1`; the Models picker therefore selects the actual voice profile and the runtime maps it to that fixed protocol model. The routes belong to the independent `doubao-speech` connection and start disabled until selected in Models settings. They appear in `list_task_models`, not in the language-model picker. Former ASR/TTS entries remain migration-only and are not shown by this Provider.

Supported tasks cover image understanding/generation, speech synthesis/transcription/translation/analysis, voice conversion/cloning/design, podcasts, realtime speech, audio/video generation, embedding, and reranking. Routes also declare Lore-compatible capability ids such as `speech.transcribe.file`, `speech.synthesize.short`, and `speech.realtime_session`; `file` is a distinct input modality. Input/output modalities, operations, and execution lifecycle remain separate so task semantics are not conflated with modality.

`volcengine` and `doubao-speech` are separate providers because their protocols, credentials, catalogs, and probes differ. Ark catalog discovery uses `ARK_API_KEY`; Realtime Duplex uses the new Speech console's single `DOUBAO_API_KEY`. Ark `/models` is not a speech-entitlement catalog, while Volcengine's `ListSpeakers`/`ServiceStatus` OpenAPI requires cloud-account AK/SK and cannot use the Speech API Key. The one-key provider therefore carries the documented Realtime catalog and verifies access with a minimal session probe.

Every task route has an explicit `enabled` state. Selection is replacement-based, and an empty selection remains empty: it never falls back to the full provider catalog. Disabled routes stay inspectable for portrait work but are not callable.

## Portraits, invocation, and routing evidence

A portrait keeps one sectioned qualitative Markdown description, structured pricing, and an explicit `performance.lastProbe` observation separate from long-term measured usage. Portraits cover task route ids and LLM ids in `llm:<provider>/<model>` form. Price rates carry operation, billing unit, currency, effective dates, and an evidence id so stale claims can be detected. Registration remains authoritative for capabilities, input/output modalities, execution mode, and operations.

The user can simply say “build the initial portraits.” Installed guidance requires the Harness Agent to call `prepare_model_portraits`, infer scope from recent registration/discovery context, gather current official documentation or benchmark evidence, save each portrait with `upsert_model_portrait`, and run `validate_model_portrait`. A paid or traffic-producing live probe still requires explicit approval.

Request/response providers implement `TaskModelRuntimeAdapter`; full-duplex speech providers implement `RealtimeModelSessionAdapter` against `realtimeModelRuntime`. `invoke_task_model` records privacy-safe task metrics. LLM observations reuse native durable Harness `request/header`, `step/start`, and `assistant/message.usage` events, so no wrapper or duplicate content log is added. `summarize_model_usage` aggregates counts, success, latency, tokens, and cost without copying prompts, responses, media, or credentials.

## Runtime boundary

- This plugin owns registration, portraits, Settings schemas, safe credential references, the unified invocation entry point, `realtimeModelRuntime`, and privacy-safe invocation observations.
- llm-pi-ai owns language-model protocol adaptation and execution.
- Independent provider adapters execute image/audio/video routes and handle binary artifacts through `TaskModelRuntimeAdapter`; routes without one remain registered-only.
- A peer plugin should inject `modelCatalog` and call `snapshot()`. It must not scrape `settings.yaml`, and it should not ask the Agent to call these tools just to read the catalog.
- `selectAgentModel()` / `select_default_model` chooses the Agent language model from `snapshot().languageModels`. It does not auto-route task models and only affects newly created Agents.

## Install

This is a community composition bundle for DeepSeek Harness `0.1.0-rc.6`. It is not an official DeepSeek package. Host and Web runtime files are committed, so a Git install does not need `prepare` or `allowBuilds`.

Pin a commit for a reproducible install:

```sh
dsh plugin --profile web add github:AlexKaiqi/dsh-multi-model-provider#857fdfded2961373d4f3b71cc7809f310711731c
```

Follow `main` (moves when the branch moves):

```sh
dsh plugin --profile web add github:AlexKaiqi/dsh-multi-model-provider
```

Install from a local checkout while developing:

```sh
git clone https://github.com/AlexKaiqi/dsh-multi-model-provider.git
cd dsh-multi-model-provider
dsh plugin --profile web add "$PWD"
```

After the package is published to npm:

```sh
dsh plugin --profile web add 'dsh-multi-model-provider@0.1.0-rc.9'
```

Through dsh.pub, once listed:

```sh
npx dshpub add AlexKaiqi/dsh-multi-model-provider --profile web
```

Verify the bundle layer, then restart Web and open a new Agent task so tools and system-prompt guidance load:

```sh
dsh --profile web --dump-config   # look for "# == dsh-multi-model-provider"
dsh web --profile web
```

Remove it from the profile:

```sh
dsh plugin --profile web remove dsh-multi-model-provider
```

## Development

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.
