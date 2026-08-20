import type { Context } from '@deepseek-ai/cordis'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { summarizeModelUsage } from '../observations/aggregate.ts'
import { normalizePortrait } from '../portrait-core.ts'
import type { GetModelPortraitInput, UpsertModelPortraitInput } from '../types.ts'
import { mutatePortraitSettings } from './storage.ts'
import { resolvePortraitTarget } from './targets.ts'

export async function upsertModelPortrait(ctx: Context, input: UpsertModelPortraitInput): Promise<Record<string, unknown>> {
  const target = await resolvePortraitTarget(ctx, input.id)
  const portrait = normalizePortrait(input.portrait)
  await mutatePortraitSettings(ctx, [{
    op: 'set',
    path: [...target.storagePath],
    value: target.kind === 'task' ? portrait : { kind: 'llm', provider: target.provider, model: target.model, portrait },
  }])
  return { id: target.id, kind: target.kind, portrait, structurallyValidated: true, automaticallyValidated: true, next: `Call validate_model_portrait for '${target.id}'.` }
}

export async function getModelPortrait(ctx: Context, input: GetModelPortraitInput, events?: readonly SessionEvent[]): Promise<Record<string, unknown>> {
  const target = await resolvePortraitTarget(ctx, input.id)
  const visiblePortrait = target.portrait === undefined
    ? undefined
    : input.includeEvidence === false
      ? { ...target.portrait, evidence: undefined }
      : target.portrait
  return {
    id: target.id,
    kind: target.kind,
    provider: target.kind === 'task' ? target.route.connection.provider : target.provider,
    model: target.kind === 'task' ? target.route.registration.model : target.model,
    ...(target.portraitSource === undefined ? {} : { portraitSource: target.portraitSource }),
    declared: target.declared,
    portrait: visiblePortrait,
    ...(input.includeUsage === true ? { observed: summarizeModelUsage({ id: target.id }, events) } : {}),
  }
}
