import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import {
  MODEL_PORTRAIT_SKILL_DESCRIPTION,
  MODEL_PORTRAIT_SKILL_NAME,
  modelPortraitSkillContent,
  registerModelPortraitSkill,
} from '../src/model/portrait-skill.ts'
import { officialResearchSources } from '../src/portraits/research-sources.ts'

describe('model portrait skill', () => {
  it('ships one user- and model-invocable skill without temporary Workspace orchestration', async () => {
    const url = new URL('../skills/collect-model-portraits/SKILL.md', import.meta.url)
    const document = await readFile(url, 'utf8')
    const content = modelPortraitSkillContent(url)
    expect(document).toContain(`name: ${MODEL_PORTRAIT_SKILL_NAME}`)
    expect(document).toContain(`description: ${MODEL_PORTRAIT_SKILL_DESCRIPTION}`)
    expect(content).toContain('Do not create a background Agent, subagent, temporary Workspace, or separate Session.')
    expect(content).toContain('fetch_portrait_source')
    expect(content).toContain('validate_model_portrait')

    const dispose = vi.fn()
    const register = vi.fn(() => dispose)
    expect(registerModelPortraitSkill({ skills: { register } } as never)).toBe(dispose)
    expect(register).toHaveBeenCalledWith(expect.objectContaining({
      name: MODEL_PORTRAIT_SKILL_NAME,
      invocation: { modelInvocable: true, userInvocable: true },
      content,
    }))
  })

  it('recognizes the official DeepSeek provider route used by DSH', () => {
    expect(officialResearchSources('deepseek-official')).toEqual(officialResearchSources('deepseek'))
    expect(officialResearchSources('deepseek-official')).not.toHaveLength(0)
  })
})
