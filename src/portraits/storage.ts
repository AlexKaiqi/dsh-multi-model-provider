import type { Context } from '@deepseek-ai/cordis'
import type { SettingsPathOp } from '@deepseek-ai/dsh-settings'
import { ModelManagerError } from '../operations.ts'
import { TASK_MODEL_SETTINGS_NAMESPACE } from '../registry.ts'
import type { TaskModelRegistryConfig } from '../types.ts'

export function portraitSettings(ctx: Context) {
  const value = ctx.settings.describe({ redactSecrets: true })
    .find(item => item.ns === TASK_MODEL_SETTINGS_NAMESPACE)
  if (value === undefined) throw new ModelManagerError('multi-model-provider settings are unavailable', 'TASK_MODEL_SETTINGS_UNAVAILABLE')
  return value
}

export function portraitRegistry(ctx: Context): TaskModelRegistryConfig {
  return portraitSettings(ctx).value as TaskModelRegistryConfig
}

export async function mutatePortraitSettings(ctx: Context, operations: readonly SettingsPathOp[]): Promise<void> {
  const current = portraitSettings(ctx)
  await ctx.settings.mutate(TASK_MODEL_SETTINGS_NAMESPACE, operations, current.revision)
}
