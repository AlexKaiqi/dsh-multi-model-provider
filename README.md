# dsh-multi-model-provider

English | [中文](README.zh.md)

This plugin has three capabilities:

1. **Register models** — language models stay in `@deepseek-ai/dsh-llm-pi-ai`; image, speech, audio, video, embedding, and reranking models live in this plugin's task-model catalog. The built-in `realtimeModelRuntime` owns effective Realtime route selection, credential references, adapter/profile registries, and bounded session assembly. Provider plugins register wire adapters; product plugins register role profiles.
2. **Assist with portraits** — evidence-backed profiles plus an explicit eight-token speed probe. Settings owns these writes.
3. **Select the Agent model** — `selectAgentModel()` / `select_default_model` picks the primary language model for newly created Agents from the live language catalog. It does not auto-route task models.

Peer plugins inject `modelCatalog` and call `snapshot()` to read every registered model, portrait, and last probe. Installing this package does **not** make image, speech, or realtime models callable; `dsh-realtime-voice` supplies the GPT and Doubao full-duplex adapters.

## Capabilities

### 1. Registration

Language routes use `configure_model_route` / `list_model_routes`. Task routes use `register_task_model` / `list_task_models`. A task-model registration describes a route; a separate runtime adapter is still required to invoke it. `select_task_models` with `ids: []` disables every route on that connection without fallback.

For a declared language route, `contextWindow` describes model capacity. Leave `requestMaxTokens` unset unless the deployment intentionally wants that exact output limit sent on every request. Discovery-only `maxTokens` metadata is validated but is not persisted as a request default; this prevents large advertised capacities from becoming invalid `max_output_tokens` values at compatible gateways.

### 2. Portraits

Portrait work is on demand for models already registered or selected in the current profile; the plugin no longer pre-researches unconfigured built-in catalog entries. `prepare_model_portraits` returns seed facts, gaps, and official documentation URLs for those configured targets. The Agent opens those pages and calls `ingest_portrait_research` with http(s) source URLs; price rates must cite that evidence. `lastProbe` is recorded only by an explicitly approved Agent call to `validate_model_portrait(liveProbe=true)`, never copied from documentation.

The catalog retains exact-id portrait fallbacks, but they are used only after the same model is registered or selected in the current profile. A fallback neither creates a portrait target nor starts advance research. A stored user portrait always wins. Route portraits may contain effective-dated provider prices; portable portraits deliberately leave pricing empty because API and infrastructure cost depend on the selected deployment. Neither kind fabricates benchmark scores, latency ranges, or `lastProbe` results.

Specialized task routes are a separate layer. The built-in capability catalog covers Google Gemini Omni Flash Preview and Veo 3.1 Standard / Fast / Lite; MiniMax H3 and Hailuo 2.3 / Fast; OpenAI Sora 2 / Pro; MiniMax Speech 2.8 HD / Turbo, Music 3.0, and image-01. These catalog entries become portrait targets only after the user registers or selects them. H3 is a `video-generation` route with native audio output, not an Agent LLM. Routes remain `registered-only` until their declared runtime adapters and credentials are available. Sora 2 / Pro and Music 3.0 remain disabled because their provider APIs are legacy or unavailable to new users.

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

`snapshot().languageModels` is the live Agent-model candidate list, with stored or exact-match bundled portraits attached when they exist. `portraitSource` reports `stored` or `bundled`. `selectAgentModel()` refuses task models and unknown ids. It only affects newly created Agents.

Other plugins that only need the directory can stop at `snapshot()`. Do not scrape `settings.yaml`, and do not ask the Agent to call tools just to read the catalog.

## Agent tools

- `list_model_routes`, `configure_model_route`, and `select_default_model` manage primary language models through llm-pi-ai.
- `inspect_volcengine_provider` returns safe credential state, the authenticated Ark catalog, selections, task routes, and correct invocation paths.
- `select_volcengine_language_models` replaces the Ark language/VLM selection; an empty array explicitly disables the route.
- `list_task_models` inspects non-language registrations and reports registration separately from callability.
- `discover_task_models` queries a connection's authenticated provider catalog without registering anything.
- `select_task_models` replaces the enabled set; `ids: []` explicitly disables every route on that connection.
- `register_task_model` creates or updates a task-model route and its reusable connection profile.
- `prepare_model_portraits` builds an on-demand research plan only for models configured in the current profile; unconfigured built-in catalog ids are rejected.
- `ingest_portrait_research` merges Agent-researched facts that have http(s) source URLs.
- `get_model_portrait`, `upsert_model_portrait`, and `validate_model_portrait` manage evidence-backed model profiles.
- `invoke_task_model` invokes a callable non-Realtime request/response route through its runtime adapter. Realtime speech uses `realtimeModelRuntime` and a provider-owned session transport.
- `summarize_model_usage` aggregates native LLM and task-model observations from the current durable session.

Registration tools accept credential references such as `OPENAI_API_KEY`, never API-key values. Doubao Realtime uses the single `DOUBAO_API_KEY` reference. The user enters actual values only in secure Settings credential fields; the Agent can fill provider, URL, model catalog, and profile metadata.

## Settings UI and data model

Installation leaves the shipped **Models** Settings section as the only model-management surface. **Volcengine Ark** is contributed through DSH's native configurable-language-provider directory, so DeepSeek and Ark keep the shipped provider rows, editors, model lists, and delete behavior. The plugin does not register a second Models section or append a parallel provider editor. It also adds a flat, read-only **Model portraits** Settings page with two tabs: collect and view. Its selector lists only models registered or selected in the current profile; unconfigured built-in catalog entries remain hidden. Each collection reserves and adopts an isolated **Temporary Workspace** provided by `dsh-temporary-workspace`. The collection tab therefore requires that profile bundle; catalog and Agent-tool features remain available without it.

Ark uses `ARK_API_KEY` and the official `https://ark.cn-beijing.volces.com/api/v3` base URL. On upgrade, a legacy `VOLCENGINE_API_KEY` value is safely copied to the standard `ARK_API_KEY` reference when the latter is missing; the legacy reference is retained and the secret is never logged or written to ordinary settings. Doubao keeps the fixed Realtime protocol model `1.2.6.1` and voice as separate task-profile fields. DSH `0.1.1-rc.2` exposes no third-party provider-editor or per-model-field slot in its Models page, so this package does not fake native integration by mounting another editor. Doubao registration and selection remain available through the task catalog and Agent tools until DSH exposes that extension contract.

Ark language models are written to `llm-pi-ai.providers.volcengine`; Doubao Speech task models and all portrait bindings are written to `multi-model-provider`; credential values never enter ordinary `settings.yaml`. ChatVoice only selects registered Realtime routes and does not own provider credentials.

Ark and DeepSeek can be edited or removed through the shipped Models page. Doubao is deliberately not represented there as an LLM provider, because doing so would pollute the Agent language-model picker and misrepresent its Realtime protocol.

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

The visible built-in catalog includes Google Gemini Omni Flash Preview and Veo 3.1 Standard / Fast / Lite; OpenAI Sora 2 / Pro, `gpt-image-2`, and `gpt-realtime`; MiniMax H3, Hailuo 2.3 / Fast, Speech 2.8 HD / Turbo, Music 3.0, and image-01; plus 25 documented Realtime S2S-O/SC 2.0 voice profiles. Doubao fixes `session.model` to `1.2.6.1`; its task profile keeps that protocol model independent from the selected voice, and the runtime maps the voice automatically. The routes belong to independent provider connections and appear in `list_task_models`, not in the language-model picker. Generative-media routes remain registered-only until their adapters are installed; legacy Sora and Music API routes are disabled by default. Former ASR/TTS entries remain migration-only.

Supported tasks cover image understanding/generation, speech synthesis/transcription/translation/analysis, voice conversion/cloning/design, podcasts, realtime speech, audio/video generation, embedding, and reranking. Routes also declare Lore-compatible capability ids such as `speech.transcribe.file`, `speech.synthesize.short`, and `speech.realtime_session`; `file` is a distinct input modality. Input/output modalities, operations, and execution lifecycle remain separate so task semantics are not conflated with modality.

`volcengine` and `doubao-speech` are separate providers because their protocols, credentials, catalogs, and probes differ. Ark catalog discovery uses `ARK_API_KEY`; Realtime Duplex uses the new Speech console's single `DOUBAO_API_KEY`. Ark `/models` is not a speech-entitlement catalog, while Volcengine's `ListSpeakers`/`ServiceStatus` OpenAPI requires cloud-account AK/SK and cannot use the Speech API Key. The one-key provider therefore carries the documented Realtime catalog and verifies access with a minimal session probe.

The built-in Doubao catalog is capability metadata, not user configuration. Web Settings keeps the shipped **Models** entry untouched; task and Realtime providers are not appended as a second UI. A future native Doubao editor requires a DSH provider-editor/per-model extension point so DSH can keep ownership of the row, lifecycle, and common fields while the plugin contributes only speech-specific fields such as voice.

Every task route has an explicit `enabled` state. Selection is replacement-based, and an empty selection remains empty: it never falls back to the full provider catalog. Disabled routes stay inspectable for portrait work but are not callable.

## Portraits, invocation, and routing evidence

A portrait keeps one sectioned qualitative Markdown description, structured pricing, and an explicit `performance.lastProbe` observation separate from long-term measured usage. Portraits cover task route ids and LLM ids in `llm:<provider>/<model>` form. Price rates carry operation, billing unit, currency, effective dates, and an evidence id so stale claims can be detected. Registration remains authoritative for capabilities, input/output modalities, execution mode, and operations.

The starter set is intentionally selective but has no fixed size: cover widely adopted providers, then include current flagships, workhorses, specialized models, and commonly self-hosted models with distinct hardware footprints. Usage, open-weight adoption, and deployment form are selection signals; every model claim and price cites first-party documentation. Matching has two exact layers: `provider/model` route profiles may carry route pricing, while an explicitly enumerated exact model id may receive a provider-independent capability profile. There is no fuzzy alias guessing and no price transfer across providers. Runtime reachability, time to first token, and latency remain separate probe/usage observations.

The **Model portraits** page collects or refreshes the currently selected model. Each job reserves a unique child below the configured `dsh-temporary-workspace` parent, creates a visible background Agent Session with that child as `cwd`, and adopts it as an independent Workspace. The parent defaults to `$DSH_HOME/temporary-workspaces` and can be changed in Temporary Workspace Settings. The active Agent handle is disposed when the job finishes, while the Session and Workspace remain recoverable so Settings can open the research record later. The collection Agent has no filesystem tools, keeping its isolated scratch directory separate from project work and model-portrait persistence. The plugin supplies immutable registration seeds and the full research/acceptance contract, and requires the Agent to gather current official documentation or benchmark evidence, save findings through `ingest_portrait_research` / `upsert_model_portrait`, and run `validate_model_portrait(liveProbe=false)`. Settings displays job status and the resulting portrait, evidence, validation, and latest probe. Paid or traffic-producing live probes are not started by collection; they require a separate explicit user approval before the Agent may call `validate_model_portrait(liveProbe=true)`.

Request/response providers implement `TaskModelRuntimeAdapter`; full-duplex speech providers implement `RealtimeModelSessionAdapter` against `realtimeModelRuntime`. `invoke_task_model` records privacy-safe task metrics. LLM observations reuse native durable Harness `request/header`, `step/start`, and `assistant/message.usage` events, so no wrapper or duplicate content log is added. `summarize_model_usage` aggregates counts, success, latency, tokens, and cost without copying prompts, responses, media, or credentials.

## Runtime boundary

- This plugin owns registration, portraits, Settings schemas, safe credential references, request/response task invocation, `realtimeModelRuntime`, and privacy-safe invocation observations.
- llm-pi-ai owns language-model protocol adaptation and execution.
- Independent provider adapters execute image/audio/video routes and handle binary artifacts through `TaskModelRuntimeAdapter`; routes without one remain registered-only.
- A peer plugin should inject `modelCatalog` and call `snapshot()`. It must not scrape `settings.yaml`, and it should not ask the Agent to call these tools just to read the catalog.
- `selectAgentModel()` / `select_default_model` chooses the Agent language model from `snapshot().languageModels`. It does not auto-route task models and only affects newly created Agents.

## Install

This is a community composition bundle for DeepSeek Harness `0.1.1-rc.2`. It is not an official DeepSeek package. Host and Web runtime files are committed, so a Git install does not need `prepare` or `allowBuilds`.

`dsh-temporary-workspace` is optional and is used only by portrait collection. DSH does not automatically install, activate, or update peer plugins; install it as a direct profile dependency when that workflow is needed.

For a reproducible Git install, append the reviewed release commit SHA to the GitHub spec (`#<release-commit-sha>`). Do not pin an earlier commit merely because it reports the same prerelease version.

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
dsh plugin --profile web add 'dsh-multi-model-provider@0.1.0-rc.15'
```

Prerelease versions are published under the npm `next` tag. Install `dsh-temporary-workspace@next` in the same profile when model-portrait collection is needed.

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

Updates are explicit:

```sh
dsh plugin --profile web update dsh-multi-model-provider dsh-temporary-workspace
```

## Development

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0.
