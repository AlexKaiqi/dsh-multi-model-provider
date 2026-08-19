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
export const VERSION = '0.1.0-rc.2'

/** Every model-callable tool name, in registration order. */
export const TOOL_NAMES = MODEL_MANAGER_TOOL_SURFACES.map(surface => surface.name)

/** Discoverable summary of the tool set and the two registration paths. */
export const HELP = `multi-model-provider ${VERSION}

Two deliberately separate registration paths. Language/chat models stay owned by
llm-pi-ai; non-language task models live in this plugin's own catalog.

language / chat models:
  list_model_routes        inspect routes, credential status, and model catalogs
  configure_model_route    create or update one llm-pi-ai provider profile
  select_default_model     save the default model for newly created Agents

non-language task models (image, speech, audio, video, embedding, reranking):
  list_task_models         inspect registrations and whether they are callable
  register_task_model      create or update a registration and its connection

credentials:
  Registration tools accept only a reference name such as OPENAI_API_KEY.
  They never accept an API key value. When a reference is not configured, direct
  the user to the secure Settings credential field; never ask for a key in chat.

registration is not callability:
  A task-model registration is catalog metadata until a compatible runtime
  adapter is installed. list_task_models reports the two states separately.
`
