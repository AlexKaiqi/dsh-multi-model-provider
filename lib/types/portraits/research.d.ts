import type { Context } from '@deepseek-ai/cordis';
import type { IngestPortraitResearchInput, ModelPortrait } from '../types.ts';
/**
 * List portrait fields that still need research or a live probe.
 *
 * Args:
 *   portrait: Stored portrait, or undefined when none exists.
 *
 * Returns:
 *   Gap ids. `lastProbe` is measured, not researched.
 */
export declare function portraitGaps(portrait: ModelPortrait | undefined): readonly string[];
/**
 * Build a research plan from gaps and bundled official documentation URLs.
 *
 * Args:
 *   provider: Provider id used to look up official documentation entry points.
 *   gaps: Gap ids from `portraitGaps`.
 *
 * Returns:
 *   Suggested sources and questions. lastProbe is never a research question.
 */
export declare function researchPlanFor(provider: string, gaps: readonly string[]): Record<string, unknown>;
/**
 * Merge Agent-researched, source-backed facts into a stored portrait.
 *
 * Registration I/O stays on the route. lastProbe is preserved from the stored
 * portrait and cannot be written from research findings.
 *
 * Args:
 *   ctx: Host context with settings, credentials, and llm.
 *   input: Target id plus researched findings. Evidence sources must be http(s) URLs.
 *
 * Returns:
 *   The upserted portrait. Never includes secrets.
 */
export declare function ingestPortraitResearch(ctx: Context, input: IngestPortraitResearchInput): Promise<Record<string, unknown>>;
