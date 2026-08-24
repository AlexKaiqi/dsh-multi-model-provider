import type { Context } from '@deepseek-ai/cordis';
import type { PrepareModelPortraitsInput } from '../types.ts';
/**
 * Start the portrait workflow: seed known facts, list gaps, and give a research plan.
 *
 * The Agent should open suggestedSources, then call ingest_portrait_research.
 * lastProbe is never filled from documentation.
 *
 * Args:
 *   ctx: Host context with settings, credentials, and llm.
 *   input: Optional exact configured ids. Omit to find configured models whose portraits are not valid.
 *   signal: Optional abort signal used while listing language-model catalogs.
 *
 * Returns:
 *   Candidates with seed, gaps, and a research plan. Never includes secrets.
 */
export declare function prepareModelPortraits(ctx: Context, input: PrepareModelPortraitsInput, signal?: AbortSignal): Promise<Record<string, unknown>>;
