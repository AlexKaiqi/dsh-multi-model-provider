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

`prepare_model_portraits` returns seed facts, gaps, and official documentation URLs. The Agent opens those pages and calls `ingest_portrait_research` with http(s) source URLs; price rates must cite that evidence. `lastProbe` is recorded only by an explicitly approved Agent call to `validate_model_portrait(liveProbe=true)`, never copied from documentation. `get_model_portrait`, `upsert_model_portrait`, and `validate_model_portrait` manage the stored profile.

The catalog ships a source-backed starter set without a fixed model-count cap. Its provider-priced routes cover GPT-5.6 Sol / Terra, Claude Opus 5 / Sonnet 5, Gemini 3.1 Pro Preview / 3.7 Flash, DeepSeek V4 Pro / Flash, Kimi K3 / K2.6, GLM-5.3 / 5-Turbo / 5V-Turbo, Grok 4.5 / 4.3, MiniMax M3 / M2.7, and Mistral Small 4 / Ministral 8B. It also carries provider-independent capability portraits for Qwen 3.8 Max Preview / 3.7 Plus, Qwen 3.5 4B / 9B / 27B, Qwen 3.6 35B-A3B, Qwen3-Coder-Next, and the open-weight MiniMax and Mistral checkpoints. Selection is current-generation first, then accounts for usage, specialization, private-deployment adoption, and hardware footprint. These are exact-id fallbacks, not registrations. A stored user portrait always wins. Route portraits may contain effective-dated provider prices; portable portraits deliberately leave pricing empty because API and infrastructure cost depend on the selected deployment. Neither kind fabricates benchmark scores, latency ranges, or `lastProbe` results.

Specialized task routes are a separate layer. The video starter set covers Google Gemini Omni Flash Preview and Veo 3.1 Standard / Fast / Lite; MiniMax H3 and Hailuo 2.3 / Fast; and OpenAI Sora 2 / Pro. It also includes MiniMax Speech 2.8 HD / Turbo, Music 3.0, and image-01. Every route keeps exact task, modality, execution, price, and source-backed capability boundaries. H3 is therefore a `video-generation` candidate with native audio output, not an Agent LLM. These routes remain `registered-only` until their declared runtime adapters and credentials are available. Google’s current video routes are enabled as candidates; Sora 2 / Pro are disabled because OpenAI now marks them Legacy. Music 3.0 is disabled because its paid API stopped accepting new users on August 20, 2026; its portrait remains visible for existing paying users and open-weight deployment decisions.

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
- `prepare_model_portraits` expands a short “build initial portraits” request into seed facts, gaps, and official documentation URLs.
- `ingest_portrait_research` merges Agent-researched facts that have http(s) source URLs.
- `get_model_portrait`, `upsert_model_portrait`, and `validate_model_portrait` manage evidence-backed model profiles.
- `invoke_task_model` invokes a callable non-Realtime request/response route through its runtime adapter. Realtime speech uses `realtimeModelRuntime` and a provider-owned session transport.
- `summarize_model_usage` aggregates native LLM and task-model observations from the current durable session.

Registration tools accept credential references such as `OPENAI_API_KEY`, never API-key values. Doubao Realtime uses the single `DOUBAO_API_KEY` reference. The user enters actual values only in secure Settings credential fields; the Agent can fill provider, URL, model catalog, and profile metadata.

## Settings UI and data model

Installation adds **Volcengine Ark** and **Doubao Speech** as two independent providers in the built-in **Models** Settings section and retains inline portrait results on language-model rows. It also adds a flat, read-only **Model portraits** Settings page with two tabs: collect and view. Each collection creates a visible temporary Session backed by `dsh-temporary-session` that Settings can open. The collection tab therefore requires the separately installed `dsh-temporary-session` profile bundle; catalog and Agent-tool features remain available without it. It does not add a separate top-level Volcengine settings page.

Ark uses `ARK_API_KEY` and the official `https://ark.cn-beijing.volces.com/api/v3` base URL. On upgrade, a legacy `VOLCENGINE_API_KEY` value is safely copied to the standard `ARK_API_KEY` reference when the latter is missing; the legacy reference is retained and the secret is never logged or written to ordinary settings. Doubao shows the fixed Realtime protocol model `1.2.6.1` and voice as separate fields. “Validate API key and load voices” first creates a minimal live Realtime session with the draft `DOUBAO_API_KEY`; the documented O/SC voice catalog is exposed only after `session.created` succeeds. Each provider is configured and saved from its own Models editor card; users never need to edit YAML.

The UI creates no parallel source of truth. Ark language models are written to `llm-pi-ai.providers.volcengine`; Doubao Speech task models and all portrait bindings are written to `multi-model-provider`; credential values only cross the write-only Credentials API and never enter ordinary `settings.yaml`. ChatVoice only selects registered Realtime routes and does not own provider credentials.

Ark, DeepSeek, and Doubao can be edited or removed independently from Models. Removing an active DeepSeek or Doubao user configuration clears its user-layer settings and page-managed credential, while leaving the built-in provider definition available for later reconfiguration. Environment-sourced credentials are never deleted by the page.

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

The visible built-in catalog includes Google Gemini Omni Flash Preview and Veo 3.1 Standard / Fast / Lite; OpenAI Sora 2 / Pro, `gpt-image-2`, and `gpt-realtime`; MiniMax H3, Hailuo 2.3 / Fast, Speech 2.8 HD / Turbo, Music 3.0, and image-01; plus 25 documented Realtime S2S-O/SC 2.0 voice profiles. Doubao fixes `session.model` to `1.2.6.1`; the Models page displays that protocol model independently from the selectable voice profile, and the runtime maps the selected voice automatically. The routes belong to independent provider connections and appear in `list_task_models`, not in the language-model picker. Generative-media routes remain registered-only until their adapters are installed; legacy Sora and Music API routes are disabled by default. Doubao routes start disabled until selected in Models settings; former ASR/TTS entries remain migration-only and are not shown by this Provider.

Supported tasks cover image understanding/generation, speech synthesis/transcription/translation/analysis, voice conversion/cloning/design, podcasts, realtime speech, audio/video generation, embedding, and reranking. Routes also declare Lore-compatible capability ids such as `speech.transcribe.file`, `speech.synthesize.short`, and `speech.realtime_session`; `file` is a distinct input modality. Input/output modalities, operations, and execution lifecycle remain separate so task semantics are not conflated with modality.

`volcengine` and `doubao-speech` are separate providers because their protocols, credentials, catalogs, and probes differ. Ark catalog discovery uses `ARK_API_KEY`; Realtime Duplex uses the new Speech console's single `DOUBAO_API_KEY`. Ark `/models` is not a speech-entitlement catalog, while Volcengine's `ListSpeakers`/`ServiceStatus` OpenAPI requires cloud-account AK/SK and cannot use the Speech API Key. The one-key provider therefore carries the documented Realtime catalog and verifies access with a minimal session probe.

Every task route has an explicit `enabled` state. Selection is replacement-based, and an empty selection remains empty: it never falls back to the full provider catalog. Disabled routes stay inspectable for portrait work but are not callable.

## Portraits, invocation, and routing evidence

A portrait keeps one sectioned qualitative Markdown description, structured pricing, and an explicit `performance.lastProbe` observation separate from long-term measured usage. Portraits cover task route ids and LLM ids in `llm:<provider>/<model>` form. Price rates carry operation, billing unit, currency, effective dates, and an evidence id so stale claims can be detected. Registration remains authoritative for capabilities, input/output modalities, execution mode, and operations.

The starter set is intentionally selective but has no fixed size: cover widely adopted providers, then include current flagships, workhorses, specialized models, and commonly self-hosted models with distinct hardware footprints. Usage, open-weight adoption, and deployment form are selection signals; every model claim and price cites first-party documentation. Matching has two exact layers: `provider/model` route profiles may carry route pricing, while an explicitly enumerated exact model id may receive a provider-independent capability profile. There is no fuzzy alias guessing and no price transfer across providers. Runtime reachability, time to first token, and latency remain separate probe/usage observations.

The **Model portraits** page collects or refreshes the currently selected model. Each job creates a visible background Agent Session in a `dsh-temporary-session` scratch directory. The active Agent handle is disposed when the job finishes, while the adopted Session and workspace remain recoverable so Settings can open the research record later. The plugin supplies immutable registration seeds and the full research/acceptance contract, and requires the Agent to gather current official documentation or benchmark evidence, save findings through `ingest_portrait_research` / `upsert_model_portrait`, and run `validate_model_portrait(liveProbe=false)`. Settings displays job status and the resulting portrait, evidence, validation, and latest probe. Paid or traffic-producing live probes are not started by collection; they require a separate explicit user approval before the Agent may call `validate_model_portrait(liveProbe=true)`.

Request/response providers implement `TaskModelRuntimeAdapter`; full-duplex speech providers implement `RealtimeModelSessionAdapter` against `realtimeModelRuntime`. `invoke_task_model` records privacy-safe task metrics. LLM observations reuse native durable Harness `request/header`, `step/start`, and `assistant/message.usage` events, so no wrapper or duplicate content log is added. `summarize_model_usage` aggregates counts, success, latency, tokens, and cost without copying prompts, responses, media, or credentials.

## Runtime boundary

- This plugin owns registration, portraits, Settings schemas, safe credential references, request/response task invocation, `realtimeModelRuntime`, and privacy-safe invocation observations.
- llm-pi-ai owns language-model protocol adaptation and execution.
- Independent provider adapters execute image/audio/video routes and handle binary artifacts through `TaskModelRuntimeAdapter`; routes without one remain registered-only.
- A peer plugin should inject `modelCatalog` and call `snapshot()`. It must not scrape `settings.yaml`, and it should not ask the Agent to call these tools just to read the catalog.
- `selectAgentModel()` / `select_default_model` chooses the Agent language model from `snapshot().languageModels`. It does not auto-route task models and only affects newly created Agents.

## Install

This is a community composition bundle for DeepSeek Harness `0.1.0-rc.6`. It is not an official DeepSeek package. Host and Web runtime files are committed, so a Git install does not need `prepare` or `allowBuilds`.

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
