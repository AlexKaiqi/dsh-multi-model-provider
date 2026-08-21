import type { Context } from '@deepseek-ai/cordis'
import { ModelManagerError } from '../operations.ts'
import { initialPortrait } from '../portrait-core.ts'
import type {
  IngestPortraitResearchInput,
  ModelPortrait,
  ModelPortraitEvidence,
  ModelPortraitInput,
} from '../types.ts'
import { officialResearchSources } from './research-sources.ts'
import { upsertModelPortrait } from './service.ts'
import { resolvePortraitTarget } from './targets.ts'

const RESEARCH_EVIDENCE_KINDS = new Set(['provider-doc', 'benchmark'])
const RESEARCHABLE_GAPS = ['description', 'pricing', 'specialties', 'limitations', 'evidence'] as const

/**
 * List portrait fields that still need research or a live probe.
 *
 * Args:
 *   portrait: Stored portrait, or undefined when none exists.
 *
 * Returns:
 *   Gap ids. `lastProbe` is measured, not researched.
 */
export function portraitGaps(portrait: ModelPortrait | undefined): readonly string[] {
  const gaps: string[] = []
  if (portrait === undefined || (portrait.description === undefined && portrait.summary === undefined)) gaps.push('description')
  if (portrait === undefined || (portrait.pricing?.rates?.length ?? 0) === 0) gaps.push('pricing')
  if (portrait === undefined || (portrait.specialties?.length ?? 0) === 0) gaps.push('specialties')
  if (portrait === undefined || (portrait.limitations?.length ?? 0) === 0) gaps.push('limitations')
  if (portrait === undefined || (portrait.evidence?.length ?? 0) === 0) gaps.push('evidence')
  if (portrait?.performance?.lastProbe === undefined) gaps.push('lastProbe')
  return gaps
}

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
export function researchPlanFor(provider: string, gaps: readonly string[]): Record<string, unknown> {
  const suggestedSources = [...officialResearchSources(provider)]
  const questions = RESEARCHABLE_GAPS
    .filter(field => gaps.includes(field))
    .map(field => ({
      field,
      question: questionFor(field),
      suggestedSources,
    }))
  return {
    suggestedSources,
    questions,
    lastProbe: gaps.includes('lastProbe')
      ? 'After explicit user approval, run validate_model_portrait with liveProbe=true. Do not copy documentation latency into lastProbe.'
      : undefined,
  }
}

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
export async function ingestPortraitResearch(
  ctx: Context,
  input: IngestPortraitResearchInput,
): Promise<Record<string, unknown>> {
  const target = await resolvePortraitTarget(ctx, input.id)
  const findings = input.findings
  if (findings.performance !== undefined && Object.prototype.hasOwnProperty.call(findings.performance, 'lastProbe')) {
    throw new ModelManagerError(
      'ingest_portrait_research cannot write lastProbe; only validate_model_portrait(liveProbe=true) may record an approved Agent live probe',
      'RESEARCH_CANNOT_WRITE_PROBE',
    )
  }
  const incomingEvidence = findings.evidence ?? []
  if (incomingEvidence.length === 0) {
    throw new ModelManagerError('ingest_portrait_research requires at least one evidence record with a source URL', 'RESEARCH_EVIDENCE_REQUIRED')
  }
  for (const [index, item] of incomingEvidence.entries()) {
    if (!RESEARCH_EVIDENCE_KINDS.has(item.kind)) {
      throw new ModelManagerError(
        `evidence[${index}].kind must be provider-doc or benchmark`,
        'RESEARCH_EVIDENCE_KIND_INVALID',
      )
    }
    if (!httpUrl(item.source)) {
      throw new ModelManagerError(
        `evidence[${index}].source must be an http(s) URL`,
        'RESEARCH_EVIDENCE_SOURCE_INVALID',
      )
    }
  }

  const existing = target.portrait ?? initialPortrait()
  const evidence = mergeEvidence(existing.evidence, incomingEvidence)
  const rates = findings.pricing?.rates ?? existing.pricing.rates
  const evidenceIds = new Set(evidence.map(item => item.id))
  for (const [index, rate] of rates.entries()) {
    if (rate.evidenceId === undefined || !evidenceIds.has(rate.evidenceId)) {
      throw new ModelManagerError(
        `pricing.rates[${index}] must reference an evidence id gathered during research`,
        'RESEARCH_PRICE_EVIDENCE_REQUIRED',
      )
    }
  }

  const portrait: ModelPortraitInput = {
    ...(findings.description === undefined && existing.description === undefined ? {} : { description: findings.description ?? existing.description }),
    ...(findings.summary === undefined && existing.summary === undefined ? {} : { summary: findings.summary ?? existing.summary }),
    specialties: findings.specialties ?? existing.specialties,
    limitations: findings.limitations ?? existing.limitations,
    bestFor: findings.bestFor ?? existing.bestFor,
    avoidFor: findings.avoidFor ?? existing.avoidFor,
    pricing: {
      rates,
      ...(findings.pricing?.notes === undefined && existing.pricing.notes === undefined ? {} : { notes: findings.pricing?.notes ?? existing.pricing.notes }),
    },
    performance: {
      ...(findings.performance?.speedClass === undefined && existing.performance.speedClass === undefined
        ? {}
        : { speedClass: findings.performance?.speedClass ?? existing.performance.speedClass }),
      ...(findings.performance?.typicalLatencyMs === undefined && existing.performance.typicalLatencyMs === undefined
        ? {}
        : { typicalLatencyMs: findings.performance?.typicalLatencyMs ?? existing.performance.typicalLatencyMs }),
      ...(findings.performance?.throughputPerMinute === undefined && existing.performance.throughputPerMinute === undefined
        ? {}
        : { throughputPerMinute: findings.performance?.throughputPerMinute ?? existing.performance.throughputPerMinute }),
      ...(findings.performance?.notes === undefined && existing.performance.notes === undefined
        ? {}
        : { notes: findings.performance?.notes ?? existing.performance.notes }),
      ...(existing.performance.lastProbe === undefined ? {} : { lastProbe: existing.performance.lastProbe }),
    },
    qualityScores: findings.qualityScores ?? existing.qualityScores,
    evidence,
  }
  const saved = await upsertModelPortrait(ctx, { id: target.id, portrait })
  return {
    ...saved,
    mergedFrom: 'research',
    preservedLastProbe: existing.performance.lastProbe !== undefined,
    next: `Call validate_model_portrait for '${target.id}' with liveProbe=false.`,
  }
}

/**
 * Write a research question for one missing portrait field.
 *
 * Args:
 *   field: Researchable gap id.
 *
 * Returns:
 *   An instruction the Agent can follow on official documentation.
 */
function questionFor(field: typeof RESEARCHABLE_GAPS[number]): string {
  switch (field) {
    case 'description':
      return 'Write a short Markdown description from current official documentation. Do not invent capabilities.'
    case 'pricing':
      return 'Extract current official price rates with unit, amount, currency, and the exact documentation URL as evidence.'
    case 'specialties':
      return 'List documented strengths only. Cite the page in evidence.'
    case 'limitations':
      return 'List documented limits, quotas, or unsupported cases. Cite the page in evidence.'
    case 'evidence':
      return 'Record every used documentation URL as provider-doc evidence with observedAt and the claims it supports.'
  }
}

/**
 * Merge stored evidence with newly researched records, replacing the same id.
 *
 * Args:
 *   existing: Evidence already on the portrait.
 *   incoming: Evidence gathered during this research pass.
 *
 * Returns:
 *   Combined evidence, with incoming ids taking precedence.
 */
function mergeEvidence(
  existing: readonly ModelPortraitEvidence[],
  incoming: readonly ModelPortraitEvidence[],
): ModelPortraitEvidence[] {
  const byId = new Map(existing.map(item => [item.id, item]))
  for (const item of incoming) byId.set(item.id, item)
  return [...byId.values()]
}

/**
 * Return whether a string is an http or https URL.
 *
 * Args:
 *   value: Evidence source field.
 *
 * Returns:
 *   True when the source can be opened as a web page.
 */
function httpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
