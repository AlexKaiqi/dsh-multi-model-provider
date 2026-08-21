/**
 * Version and command surface for the model-management tool set.
 *
 * This plugin has no CLI; its "commands" are the sixteen tools the model can call.
 * Stating them in one place lets a deployment answer "what can this plugin do?"
 * without reading the registration code, and pins the version so the model-facing
 * surface cannot drift from a release.
 *
 * @module dsh-multi-model-provider
 */

import { MODEL_MANAGER_TOOL_SURFACES } from './tool-surfaces.ts'

/** Package version; asserted equal to package.json by the contract tests. */
export const VERSION = '0.1.0-rc.9'

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
  select_volcengine_language_models replace Ark language/VLM selection; [] disables all
  list_task_models         inspect registrations and whether they are callable
  discover_task_models     query an authenticated provider model catalog
  select_task_models       replace the enabled set; [] disables all
  register_task_model      create or update a registration and its connection

2. portraits:
  prepare_model_portraits  expand one short intent into seed facts, gaps, and a research plan
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
  Volcengine Ark and Doubao Speech are separate provider connections with
  separate protocols, catalogs, and API keys. Discovery is advisory and never
  auto-registers or auto-enables returned models. An empty enabled selection is
  preserved as all disabled; it never falls back to all models.

portrait workflow:
  “整理初始画像” is sufficient: the Agent calls prepare_model_portraits, opens the
  suggested official documentation, calls ingest_portrait_research with source URLs,
  and validates with liveProbe=false. lastProbe is measured by an explicitly approved Agent live probe, never copied from docs.
`
