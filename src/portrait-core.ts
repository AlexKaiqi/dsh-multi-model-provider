import { ModelManagerError } from './operations.ts'
import type {
  ModelPortrait,
  ModelPortraitEvidence,
  ModelPortraitInput,
  ModelPortraitValidationCheck,
  ModelPriceRate,
  SpeedClass,
} from './types.ts'

const EVIDENCE_KINDS = new Set(['provider-doc', 'benchmark', 'runtime-probe', 'usage', 'manual'])
const SPEED_CLASSES = new Set<SpeedClass>(['instant', 'fast', 'balanced', 'slow', 'async'])

function optionalText(value: string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  if (normalized === '') throw new ModelManagerError(`${name} must not be blank`, 'INVALID_MODEL_PORTRAIT')
  return normalized
}

function stringList(values: readonly string[] | undefined, name: string): string[] {
  if (values === undefined) return []
  return [...new Set(values.map((value, index) => {
    const normalized = value.trim()
    if (normalized === '') throw new ModelManagerError(`${name}[${index}] must not be blank`, 'INVALID_MODEL_PORTRAIT')
    return normalized
  }))]
}

function finiteNonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new ModelManagerError(`${name} must be a finite non-negative number`, 'INVALID_MODEL_PORTRAIT')
  }
  return value
}

function normalizeRate(rate: ModelPriceRate, index: number): ModelPriceRate {
  const tier = optionalText(rate.tier, `pricing.rates[${index}].tier`)
  const effectiveFrom = optionalText(rate.effectiveFrom, `pricing.rates[${index}].effectiveFrom`)
  const effectiveTo = optionalText(rate.effectiveTo, `pricing.rates[${index}].effectiveTo`)
  const evidenceId = optionalText(rate.evidenceId, `pricing.rates[${index}].evidenceId`)
  return {
    operation: optionalText(rate.operation, `pricing.rates[${index}].operation`)!,
    unit: optionalText(rate.unit, `pricing.rates[${index}].unit`)!,
    amount: finiteNonNegative(rate.amount, `pricing.rates[${index}].amount`),
    currency: optionalText(rate.currency, `pricing.rates[${index}].currency`)!.toUpperCase(),
    ...(tier === undefined ? {} : { tier }),
    ...(effectiveFrom === undefined ? {} : { effectiveFrom }),
    ...(effectiveTo === undefined ? {} : { effectiveTo }),
    ...(evidenceId === undefined ? {} : { evidenceId }),
  }
}

function normalizeEvidence(item: ModelPortraitEvidence, index: number): ModelPortraitEvidence {
  if (!EVIDENCE_KINDS.has(item.kind)) {
    throw new ModelManagerError(`evidence[${index}].kind is unsupported`, 'INVALID_MODEL_PORTRAIT')
  }
  const observedAt = optionalText(item.observedAt, `evidence[${index}].observedAt`)!
  if (Number.isNaN(Date.parse(observedAt))) {
    throw new ModelManagerError(`evidence[${index}].observedAt must be an ISO date/time`, 'INVALID_MODEL_PORTRAIT')
  }
  return {
    id: optionalText(item.id, `evidence[${index}].id`)!,
    kind: item.kind,
    source: optionalText(item.source, `evidence[${index}].source`)!,
    observedAt,
    claims: stringList(item.claims, `evidence[${index}].claims`),
    ...(optionalText(item.notes, `evidence[${index}].notes`) === undefined ? {} : { notes: item.notes!.trim() }),
  }
}

export function portraitChecks(portrait: ModelPortrait): ModelPortraitValidationCheck[] {
  const checks: ModelPortraitValidationCheck[] = []
  const evidence = portrait.evidence ?? []
  const rates = portrait.pricing?.rates ?? []
  const performance = portrait.performance ?? {}
  const evidenceIds = new Set(evidence.map(item => item.id))
  const hasDescription = portrait.description !== undefined || portrait.summary !== undefined
  checks.push({ id: 'portrait.description', status: hasDescription ? 'pass' : 'warn', message: hasDescription ? 'Markdown description is present' : 'Markdown description is missing' })
  checks.push({ id: 'portrait.pricing', status: rates.length === 0 ? 'warn' : 'pass', message: rates.length === 0 ? 'pricing is unknown' : 'pricing rates are present' })
  checks.push({ id: 'portrait.performance.speed', status: performance.speedClass === undefined ? 'warn' : 'pass', message: performance.speedClass === undefined ? 'speed class is unknown' : 'speed class is present' })
  for (const [index, rate] of rates.entries()) {
    const supported = rate.evidenceId !== undefined && evidenceIds.has(rate.evidenceId)
    checks.push({
      id: `portrait.pricing.${index}`,
      status: supported ? 'pass' : 'warn',
      message: supported ? `price rate '${rate.operation}' has evidence` : `price rate '${rate.operation}' has no matching evidence`,
    })
  }
  if (performance.typicalLatencyMs !== undefined) {
    checks.push({
      id: 'portrait.performance.latency-evidence',
      status: evidence.some(item => item.kind === 'benchmark' || item.kind === 'runtime-probe' || item.kind === 'usage') ? 'pass' : 'warn',
      message: evidence.some(item => item.kind === 'benchmark' || item.kind === 'runtime-probe' || item.kind === 'usage') ? 'latency has measurable evidence' : 'latency estimate has no benchmark, probe, or usage evidence',
    })
  }
  return checks
}

export function normalizePortrait(input: ModelPortraitInput): ModelPortrait {
  const evidence = (input.evidence ?? []).map(normalizeEvidence)
  if (new Set(evidence.map(item => item.id)).size !== evidence.length) {
    throw new ModelManagerError('portrait evidence ids must be unique', 'INVALID_MODEL_PORTRAIT')
  }
  const speedClass = input.performance?.speedClass
  if (speedClass !== undefined && !SPEED_CLASSES.has(speedClass)) {
    throw new ModelManagerError(`unsupported speedClass '${speedClass}'`, 'INVALID_MODEL_PORTRAIT')
  }
  const latency = input.performance?.typicalLatencyMs
  if (latency !== undefined) {
    finiteNonNegative(latency.min, 'performance.typicalLatencyMs.min')
    finiteNonNegative(latency.max, 'performance.typicalLatencyMs.max')
    if (latency.min > latency.max) throw new ModelManagerError('typical latency min must not exceed max', 'INVALID_MODEL_PORTRAIT')
  }
  const lastProbe = input.performance?.lastProbe
  if (lastProbe !== undefined) {
    if (Number.isNaN(Date.parse(lastProbe.observedAt))) {
      throw new ModelManagerError('performance.lastProbe.observedAt must be an ISO date/time', 'INVALID_MODEL_PORTRAIT')
    }
    finiteNonNegative(lastProbe.latencyMs, 'performance.lastProbe.latencyMs')
    if (lastProbe.timeToFirstTokenMs !== undefined) finiteNonNegative(lastProbe.timeToFirstTokenMs, 'performance.lastProbe.timeToFirstTokenMs')
  }
  const qualityScores = Object.fromEntries(Object.entries(input.qualityScores ?? {}).map(([key, value]) => {
    const normalized = optionalText(key, 'qualityScores key')!
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new ModelManagerError(`qualityScores.${normalized} must be between 0 and 1`, 'INVALID_MODEL_PORTRAIT')
    }
    return [normalized, value]
  }))
  const draft: ModelPortrait = {
    schemaVersion: 1,
    ...(optionalText(input.description, 'description') === undefined ? {} : { description: input.description!.trim() }),
    ...(optionalText(input.summary, 'summary') === undefined ? {} : { summary: input.summary!.trim() }),
    specialties: stringList(input.specialties, 'specialties'),
    limitations: stringList(input.limitations, 'limitations'),
    bestFor: stringList(input.bestFor, 'bestFor'),
    avoidFor: stringList(input.avoidFor, 'avoidFor'),
    pricing: {
      rates: (input.pricing?.rates ?? []).map(normalizeRate),
      ...(optionalText(input.pricing?.notes, 'pricing.notes') === undefined ? {} : { notes: input.pricing!.notes!.trim() }),
    },
    performance: {
      ...(speedClass === undefined ? {} : { speedClass }),
      ...(latency === undefined ? {} : { typicalLatencyMs: { min: latency.min, max: latency.max } }),
      ...(input.performance?.throughputPerMinute === undefined ? {} : { throughputPerMinute: finiteNonNegative(input.performance.throughputPerMinute, 'performance.throughputPerMinute') }),
      ...(optionalText(input.performance?.notes, 'performance.notes') === undefined ? {} : { notes: input.performance!.notes!.trim() }),
      ...(lastProbe === undefined ? {} : { lastProbe: {
          observedAt: lastProbe.observedAt,
          reachable: lastProbe.reachable,
          latencyMs: lastProbe.latencyMs,
          ...(lastProbe.timeToFirstTokenMs === undefined ? {} : { timeToFirstTokenMs: lastProbe.timeToFirstTokenMs }),
        } }),
    },
    qualityScores,
    evidence,
    validation: { state: 'unvalidated', checks: [] },
  }
  const checks = portraitChecks(draft)
  return {
    ...draft,
    validation: {
      state: checks.some(check => check.status === 'fail') ? 'invalid' : checks.some(check => check.status === 'warn') ? 'partial' : 'valid',
      checkedAt: new Date().toISOString(),
      checks,
    },
  }
}

/** Fill fields omitted by legacy stored portraits while preserving their last validation result. */
export function normalizeStoredPortrait(input: ModelPortraitInput | ModelPortrait): ModelPortrait {
  const normalized = normalizePortrait(input)
  const stored = (input as { readonly validation?: ModelPortrait['validation'] }).validation
  if (stored === undefined) return normalized
  return {
    ...normalized,
    validation: {
      state: stored.state ?? normalized.validation.state,
      ...(stored.checkedAt === undefined ? {} : { checkedAt: stored.checkedAt }),
      checks: Array.isArray(stored.checks) ? stored.checks : normalized.validation.checks,
    },
  }
}

export function initialPortrait(summary?: string): ModelPortrait {
  return {
    schemaVersion: 1,
    ...(summary === undefined ? {} : { summary }),
    specialties: [],
    limitations: [],
    bestFor: [],
    avoidFor: [],
    pricing: { rates: [] },
    performance: {},
    qualityScores: {},
    evidence: [],
    validation: { state: 'unvalidated', checks: [] },
  }
}
