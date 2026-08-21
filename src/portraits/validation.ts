import type { Context } from '@deepseek-ai/cordis'
import { listModelRoutes, ModelManagerError } from '../operations.ts'
import { portraitChecks } from '../portrait-core.ts'
import { runPaidModelProbe } from '../probe-route.ts'
import { effectiveTaskModelAvailability } from '../registry.ts'
import type { ModelPortrait, ModelPortraitValidationCheck, ModelRouteView, ValidateModelPortraitInput } from '../types.ts'
import { mutatePortraitSettings } from './storage.ts'
import { resolvePortraitTarget } from './targets.ts'

function validationState(checks: readonly ModelPortraitValidationCheck[]) {
  return checks.some(check => check.status === 'fail') ? 'invalid' as const
    : checks.some(check => check.status === 'warn') ? 'partial' as const
      : 'valid' as const
}

function probeSpeedClass(latencyMs: number) {
  return latencyMs <= 1_000 ? 'instant' as const
    : latencyMs <= 2_500 ? 'fast' as const
      : latencyMs <= 6_000 ? 'balanced' as const
        : 'slow' as const
}

function portraitWithProbe(
  portrait: ModelPortrait,
  probe: {
    readonly observedAt: string
    readonly reachable: boolean
    readonly latencyMs: number
    readonly timeToFirstTokenMs?: number
    readonly message?: string
  },
): ModelPortrait {
  const measuredLatency = probe.timeToFirstTokenMs ?? probe.latencyMs
  return {
    ...portrait,
    performance: {
      ...portrait.performance,
      speedClass: portrait.performance.speedClass ?? probeSpeedClass(measuredLatency),
      lastProbe: {
        observedAt: probe.observedAt,
        reachable: probe.reachable,
        latencyMs: probe.latencyMs,
        ...(probe.timeToFirstTokenMs === undefined ? {} : { timeToFirstTokenMs: probe.timeToFirstTokenMs }),
      },
    },
    evidence: [
      ...portrait.evidence.filter(item => item.id !== 'runtime-probe:latest'),
      {
        id: 'runtime-probe:latest',
        kind: 'runtime-probe',
        source: 'DSH Agent live probe',
        observedAt: probe.observedAt,
        claims: [
          `reachable=${probe.reachable}`,
          `latencyMs=${probe.latencyMs}`,
          ...(probe.timeToFirstTokenMs === undefined ? [] : [`timeToFirstTokenMs=${probe.timeToFirstTokenMs}`]),
        ],
        ...(probe.message === undefined ? {} : { notes: probe.message }),
      },
    ],
  }
}

function elapsedMs(started: number): number {
  return Math.max(0, Math.round(performance.now() - started))
}

export async function validateModelPortrait(ctx: Context, input: ValidateModelPortraitInput, signal: AbortSignal): Promise<Record<string, unknown>> {
  const target = await resolvePortraitTarget(ctx, input.id, signal)
  const portrait = target.portrait
  if (portrait === undefined) throw new ModelManagerError(`model '${target.id}' has no portrait`, 'MODEL_PORTRAIT_MISSING')

  if (target.kind === 'llm') {
    let workingPortrait = portrait
    let liveCheck: ModelPortraitValidationCheck | undefined
    if (input.liveProbe === true) {
      const started = performance.now()
      try {
        const probe = await runPaidModelProbe(ctx.llm, target.provider, target.model, signal)
        workingPortrait = portraitWithProbe(workingPortrait, { ...probe, reachable: true })
        liveCheck = { id: 'runtime.live-probe', status: 'pass', message: `Agent live probe passed in ${probe.latencyMs} ms` }
      } catch (error) {
        if (signal.aborted) throw error
        const message = error instanceof Error ? error.message : 'live probe failed'
        workingPortrait = portraitWithProbe(workingPortrait, {
          observedAt: new Date().toISOString(),
          reachable: false,
          latencyMs: elapsedMs(started),
          message,
        })
        liveCheck = { id: 'runtime.live-probe', status: 'fail', message }
      }
    }

    const checks: ModelPortraitValidationCheck[] = [...portraitChecks(workingPortrait)]
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
    if (liveCheck !== undefined) checks.push(liveCheck)
    const validated: ModelPortrait = { ...workingPortrait, validation: { state: validationState(checks), checkedAt: new Date().toISOString(), checks } }
    await mutatePortraitSettings(ctx, [{ op: 'set', path: [...target.storagePath], value: { kind: 'llm', provider: target.provider, model: target.model, portrait: validated } }])
    return {
      id: target.id,
      kind: 'llm',
      validation: validated.validation,
      callable: routeView?.status === 'live' && credentialConfigured,
      ...(input.liveProbe === true ? { lastProbe: validated.performance.lastProbe } : {}),
    }
  }

  const route = target.route
  const availability = await effectiveTaskModelAvailability(ctx, route)
  let workingPortrait = portrait
  let liveCheck: ModelPortraitValidationCheck | undefined
  if (input.liveProbe === true) {
    if (route.registration.execution === 'realtime') {
      liveCheck = { id: 'runtime.live-probe', status: 'warn', message: 'realtime routes are probed through realtimeModelRuntime, not the generic task-model probe' }
    } else {
      const started = performance.now()
      try {
        const probe = await ctx.taskModelRuntime.probe(route, signal)
        const latencyMs = probe.latencyMs ?? elapsedMs(started)
        workingPortrait = portraitWithProbe(workingPortrait, {
          observedAt: new Date().toISOString(),
          reachable: probe.ok,
          latencyMs,
          message: probe.message,
        })
        liveCheck = { id: 'runtime.live-probe', status: probe.ok ? 'pass' : 'fail', message: probe.message }
      } catch (error) {
        if (signal.aborted) throw error
        const message = error instanceof Error ? error.message : 'live probe failed'
        workingPortrait = portraitWithProbe(workingPortrait, {
          observedAt: new Date().toISOString(),
          reachable: false,
          latencyMs: elapsedMs(started),
          message,
        })
        liveCheck = { id: 'runtime.live-probe', status: 'fail', message }
      }
    }
  }

  const checks: ModelPortraitValidationCheck[] = [...portraitChecks(workingPortrait)]
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
  checks.push({
    id: 'runtime.selection',
    status: availability.enabled ? 'pass' : 'warn',
    message: availability.enabled ? 'route is enabled by the current model selection' : 'route is disabled by the current model selection',
  })
  checks.push({
    id: 'runtime.credentials',
    status: availability.credentialReady ? 'pass' : 'warn',
    message: availability.credentialReady ? 'all credential references are configured' : 'one or more credential references are not configured',
  })
  checks.push({
    id: 'runtime.adapter',
    status: availability.adapterAvailable ? 'pass' : 'warn',
    message: availability.adapterAvailable ? `runtime adapter '${route.registration.runtimeAdapter}' is available` : `runtime adapter '${route.registration.runtimeAdapter ?? 'undeclared'}' is unavailable`,
  })
  if (liveCheck !== undefined) checks.push(liveCheck)
  const validated: ModelPortrait = { ...workingPortrait, validation: { state: validationState(checks), checkedAt: new Date().toISOString(), checks } }
  await mutatePortraitSettings(ctx, [{ op: 'set', path: [...target.storagePath], value: validated }])
  return {
    id: target.id,
    kind: 'task',
    validation: validated.validation,
    callable: availability.callable,
    ...(input.liveProbe === true && route.registration.execution !== 'realtime' ? { lastProbe: validated.performance.lastProbe } : {}),
  }
}
