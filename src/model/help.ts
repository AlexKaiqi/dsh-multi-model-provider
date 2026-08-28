/**
 * Version and command surface for the model-management tool set.
 *
 * This plugin has no CLI; its "commands" are the model-callable tools.
 * Stating them in one place lets a deployment answer "what can this plugin do?"
 * without reading the registration code, and pins the version so the model-facing
 * surface cannot drift from a release.
 *
 * @module dsh-multi-model-provider
 */

import { MODEL_MANAGER_TOOL_SURFACES } from './tool-surfaces.ts'

/** Package version; asserted equal to package.json by the contract tests. */
export const VERSION = '0.1.0-rc.18'

/** Every model-callable tool name, in registration order. */
export const TOOL_NAMES = MODEL_MANAGER_TOOL_SURFACES.map(surface => surface.name)

/** Discoverable summary of the tool set and the three plugin capabilities. */
export const HELP = `multi-model-provider ${VERSION}

Three capabilities: register models, assist with portraits, and select the
Agent (primary) language model from that catalog. Language/chat models stay
owned by llm-pi-ai; non-language task models live in this plugin's catalog.

1. registration:
  list_model_routes        inspect routes, credential status, and model catalogs
  configure_model_route    create or update one llm-pi-ai provider profile
  inspect_volcengine_provider inspect Ark/Doubao credentials, live catalog, selections, and usage paths
  select_volcengine_language_models replace one Ark payg/Agent Plan selection; both may coexist
  list_task_models         inspect registrations and whether they are callable
  discover_task_models     query an authenticated provider model catalog
  select_task_models       replace the enabled set; [] disables all
  register_task_model      create or update a registration and its connection

2. portraits:
  prepare_model_portraits  research configured models on demand; never pre-research catalog-only entries
  fetch_portrait_source    open an exact first-party URL approved by the target research plan
  ingest_portrait_research merge Agent-researched facts that have official source URLs
  get_model_portrait       inspect price, strengths, speed, I/O, and evidence
  upsert_model_portrait    save an evidence-backed model portrait
  validate_model_portrait  check registration, evidence, credentials, and adapter
  summarize_model_usage    aggregate current-session invocation observations

3. Agent model:
  select_default_model     save the default Agent language model from the live catalog

invoke_task_model executes one registered non-realtime request/response task operation
through its adapter. It explicitly excludes realtime-speech routes; those require
realtimeModelRuntime. It is not Agent-model selection.

credentials:
  Registration tools accept only reference names such as OPENAI_API_KEY. A
  multi-credential provider may use named refs; Doubao Realtime uses the single
  DOUBAO_API_KEY reference. Tools never accept an API key value. When a reference is not configured, direct
  the user to the secure Settings credential field; never ask for a key in chat.

registration is not callability:
  A task-model registration is catalog metadata until a compatible runtime
  adapter is installed. list_task_models reports the two states separately.
  Disabled registrations remain inspectable but cannot be routed or invoked.
  This plugin does not ship runtime adapters. Built-in catalog entries such as
  openai/gpt-image-2 and Doubao speech start registered-only.

provider discovery and selection:
  Volcengine Ark pay-as-you-go, Ark Agent Plan, and Doubao Speech are separate routes.
  provider=volcengine uses /api/v3 and provider=volcengine-agent-plan uses /api/plan/v3;
  they may coexist and neither is a silent fallback for the other. Discovery is advisory and never
  auto-registers or auto-enables returned models. An empty enabled selection is
  preserved as all disabled; it never falls back to all models.

portrait workflow:
  Only models already configured or selected in this profile are portrait targets.
  “整理画像” is sufficient: load the collect-model-portraits skill, call prepare_model_portraits, open the
  suggested official documentation, calls ingest_portrait_research with source URLs,
  and validates with liveProbe=false. lastProbe is measured by an explicitly approved Agent live probe, never copied from docs.
`
