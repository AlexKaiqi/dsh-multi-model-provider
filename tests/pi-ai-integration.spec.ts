import { Context, type Fiber } from '@deepseek-ai/cordis'
import CredentialProvider, {
  type CredentialInfo,
  type CredentialRef,
  type ResolvedCredential,
} from '@deepseek-ai/dsh-credentials'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import * as PiAiPlugin from '@deepseek-ai/dsh-llm-pi-ai'
import SettingsProvider, { type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { describe, expect, it, vi } from 'vitest'
import { configureModelRoute } from '../src/operations.ts'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  private readonly document: Record<string, unknown> = {}

  protected async load(): Promise<Record<string, unknown>> {
    return structuredClone(this.document)
  }

  protected async persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    this.document[String(ns)] = structuredClone(section)
  }
}

class MemoryCredentials extends CredentialProvider {
  private readonly values = new Map<string, string>()

  async resolve(ref: CredentialRef): Promise<ResolvedCredential | undefined> {
    const value = this.values.get(String(ref))
    return value === undefined ? undefined : { value, source: 'memory' }
  }

  async describe(ref: CredentialRef): Promise<CredentialInfo> {
    return {
      configured: this.values.has(String(ref)),
      writable: true,
      ...(this.values.has(String(ref)) ? { source: 'memory' } : {}),
    }
  }

  async set(ref: CredentialRef, value: string): Promise<void> {
    this.values.set(String(ref), value)
  }

  async unset(ref: CredentialRef): Promise<void> {
    this.values.delete(String(ref))
  }
}

describe('official llm-pi-ai integration', () => {
  it('accepts the minimal OpenAI profile and activates the built-in catalog route', async () => {
    const ctx = new Context()
    const fibers: Fiber[] = []
    try {
      fibers.push(await ctx.plugin(LlmRuntime))
      fibers.push(await ctx.plugin(MemorySettings))
      fibers.push(await ctx.plugin(MemoryCredentials))
      fibers.push(await ctx.plugin(PiAiPlugin, { providers: {} }))

      expect(ctx.llm.listProviders()).toEqual([])
      const result = await configureModelRoute(ctx, {
        provider: 'openai',
        apiKeyEnv: 'OPENAI_API_KEY',
      })
      expect(result).toMatchObject({
        provider: 'openai',
        saved: true,
        requiresCredential: true,
      })

      await vi.waitFor(() => {
        expect(ctx.llm.listProviders()).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: 'openai' }),
        ]))
      })
      const models = await ctx.llm.listModels('openai')
      expect(models.length).toBeGreaterThan(0)
      expect(models.every(model => model.provider === 'openai')).toBe(true)
    } finally {
      for (const fiber of fibers.reverse()) await fiber.dispose()
    }
  })
})
