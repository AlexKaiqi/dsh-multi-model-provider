import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { listModelRoutes, ModelManagerError } from '../operations.ts'
import { portraitChecks } from '../portrait-core.ts'
import type { ModelPortrait, ModelPortraitValidationCheck, ModelRouteView, ValidateModelPortraitInput } from '../types.ts'
import { mutatePortraitSettings } from './storage.ts'
import { resolvePortraitTarget } from './targets.ts'

function validationState(checks: readonly ModelPortraitValidationCheck[]) {
  return checks.some(check => check.status === 'fail') ? 'invalid' as const
    : checks.some(check => check.status === 'warn') ? 'partial' as const
      : 'valid' as const
}

export async function validateModelPortrait(ctx: Context, input: ValidateModelPortraitInput, signal: AbortSignal): Promise<Record<string, unknown>> {
  const target = await resolvePortraitTarget(ctx, input.id, signal)
  const portrait = target.portrait
  if (portrait === undefined) throw new ModelManagerError(`model '${target.id}' has no portrait`, 'MODEL_PORTRAIT_MISSING')
  const checks: ModelPortraitValidationCheck[] = [...portraitChecks(portrait)]
  if (target.kind === 'llm') {
    const routeResult = await listModelRoutes(ctx, { provider: target.provider, includeModels: false })
    const routeView = (routeResult.providers as ModelRouteView[])[0]
    const credentialConfigured = routeView?.credential?.configured !== false
    checks.push({ id: 'registration.llm-route', status: 'pass', message: `LLM route '${target.provider}/${target.model}' resolves through its installed adapter` })
    checks.push({
      id: 'registration.modalities',
      status: (target.info.inputModalities?.length ?? 0) > 0 ? 'pass' : 'warn',
      message: (target.info.inputModalities?.length ?? 0) > 0 ? 'input modalities are declared by the LLM adapter' : 'input modalities are unknown',
    })
    checks.push({
      id: 'runtime.credentials',
      status: credentialConfigured ? 'pass' : 'warn',
      message: routeView?.credential === undefined ? 'provider adapter does not expose a credential reference' : credentialConfigured ? 'provider credential reference is configured' : 'provider credential reference is not configured',
    })
    if (input.liveProbe === true) {
      checks.push({ id: 'runtime.live-probe', status: 'warn', message: 'LLM portrait validation does not create a paid synthetic turn; normal Harness calls are observed automatically.' })
    }
    const validated: ModelPortrait = { ...portrait, validation: { state: validationState(checks), checkedAt: new Date().toISOString(), checks } }
    await mutatePortraitSettings(ctx, [{ op: 'set', path: [...target.storagePath], value: { kind: 'llm', provider: target.provider, model: target.model, portrait: validated } }])
    return { id: target.id, kind: 'llm', validation: validated.validation, callable: routeView?.status === 'live' && credentialConfigured }
  }

  const route = target.route
  checks.push({
    id: 'registration.modalities',
    status: route.registration.input.length > 0 && route.registration.output.length > 0 ? 'pass' : 'fail',
    message: route.registration.input.length > 0 && route.registration.output.length > 0 ? 'input and output modalities are declared' : 'input or output modalities are missing',
  })
  checks.push({
    id: 'registration.capabilities',
    status: (route.registration.capabilities?.length ?? 0) > 0 ? 'pass' : 'warn',
    message: (route.registration.capabilities?.length ?? 0) > 0 ? 'cross-provider capabilities are declared' : 'capabilities are missing',
  })
  const allRefs = {
    ...(route.connection.credentialRef === undefined ? {} : { default: route.connection.credentialRef }),
    ...(route.connection.credentialRefs ?? {}),
  }
  const selected = route.registration.credentialNames === undefined ? undefined : new Set(route.registration.credentialNames)
  const refs = Object.entries(allRefs).filter(([name]) => selected === undefined || selected.has(name)).map(([, ref]) => ref)
  const statuses = await Promise.all(refs.map(ref => ctx.credentials.describe(credentialRef(ref))))
  checks.push({
    id: 'runtime.credentials',
    status: statuses.every(status => status.configured) ? 'pass' : 'warn',
    message: statuses.every(status => status.configured) ? 'all credential references are configured' : 'one or more credential references are not configured',
  })
  const adapterAvailable = ctx.taskModelRuntime.hasAdapter(route.registration.runtimeAdapter, route)
  checks.push({
    id: 'runtime.adapter',
    status: adapterAvailable ? 'pass' : 'warn',
    message: adapterAvailable ? `runtime adapter '${route.registration.runtimeAdapter}' is available` : `runtime adapter '${route.registration.runtimeAdapter ?? 'undeclared'}' is unavailable`,
  })
  if (input.liveProbe === true) {
    try {
      const probe = await ctx.taskModelRuntime.probe(route, signal)
      checks.push({ id: 'runtime.live-probe', status: probe.ok ? 'pass' : 'fail', message: probe.message })
    } catch (error) {
      checks.push({ id: 'runtime.live-probe', status: 'fail', message: error instanceof Error ? error.message : 'live probe failed' })
    }
  }
  const validated: ModelPortrait = { ...portrait, validation: { state: validationState(checks), checkedAt: new Date().toISOString(), checks } }
  await mutatePortraitSettings(ctx, [{ op: 'set', path: [...target.storagePath], value: validated }])
  return { id: target.id, kind: 'task', validation: validated.validation, callable: route.registration.enabled !== false && adapterAvailable && statuses.every(status => status.configured) }
}
