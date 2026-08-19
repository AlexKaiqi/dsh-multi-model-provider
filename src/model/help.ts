/**
 * Version and command surface for the model-management tool set.
 *
 * This plugin has no CLI; its "commands" are the five tools the model can call.
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

/** Discoverable summary of the tool set and the two registration paths. */
export const HELP = `multi-model-provider ${VERSION}

Two deliberately separate registration paths. Language/chat models stay owned by
llm-pi-ai; non-language task models live in this plugin's own catalog.

language / chat models:
  list_model_routes        inspect routes, credential status, and model catalogs
  configure_model_route    create or update one llm-pi-ai provider profile
  inspect_volcengine_provider inspect Ark/Doubao credentials, live catalog, selections, and usage paths
  select_volcengine_language_models replace Ark language/VLM selection; [] disables all
  select_default_model     save the default model for newly created Agents

non-language task models (image, speech, audio, video, realtime, embedding, reranking):
  list_task_models         inspect registrations and whether they are callable
  discover_task_models     query an authenticated provider model catalog
  select_task_models       replace the enabled set; [] disables all
  register_task_model      create or update a registration and its connection
  prepare_model_portraits  expand one short intent into the complete portrait workflow
  get_model_portrait       inspect price, strengths, speed, I/O, and evidence
  upsert_model_portrait    save an evidence-backed router-facing portrait
  validate_model_portrait  check registration, evidence, credentials, and adapter
  invoke_task_model        execute one registered operation through its adapter
  summarize_model_usage    aggregate current-session invocation observations

credentials:
  Registration tools accept only reference names such as OPENAI_API_KEY. A
  multi-credential provider may use named refs such as DOUBAO_APPID and
  DOUBAO_TOKEN. They never accept an API key value. When a reference is not configured, direct
  the user to the secure Settings credential field; never ask for a key in chat.

registration is not callability:
  A task-model registration is catalog metadata until a compatible runtime
  adapter is installed. list_task_models reports the two states separately.
  Disabled registrations remain inspectable but cannot be routed or invoked.

provider discovery and selection:
  Volcengine is one provider connection spanning Ark and Doubao products while
  each product keeps its own credential slots. Discovery is advisory and never
  auto-registers or auto-enables returned models. An empty enabled selection is
  preserved as all disabled; it never falls back to all models.

portrait workflow:
  “整理初始画像” is sufficient: the Agent calls prepare_model_portraits, gathers
  authoritative facts, saves each portrait, and validates it automatically.
  Native LLM and task invocation events record metrics but never content or credentials.
`
