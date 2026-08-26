import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-skill'
import { existsSync, readFileSync } from 'node:fs'

export const MODEL_PORTRAIT_SKILL_NAME = 'collect-model-portraits'
export const MODEL_PORTRAIT_SKILL_DESCRIPTION = 'Research and update evidence-backed portraits for models already configured in the current DSH profile. Use when the user asks to collect, organize, create, refresh, or improve model portraits; do not use for unconfigured catalog entries.'

function skillDocumentUrl(): URL {
  const installed = new URL('../skills/collect-model-portraits/SKILL.md', import.meta.url)
  if (existsSync(installed)) return installed
  return new URL('../../skills/collect-model-portraits/SKILL.md', import.meta.url)
}

export function modelPortraitSkillContent(url: URL = skillDocumentUrl()): string {
  const document = readFileSync(url, 'utf8')
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/u.exec(document)
  if (match === null) throw new Error('collect-model-portraits SKILL.md is missing YAML frontmatter')
  return match[1]!.trim()
}

export function registerModelPortraitSkill(ctx: Context): () => void {
  return ctx.skills.register({
    name: MODEL_PORTRAIT_SKILL_NAME,
    description: MODEL_PORTRAIT_SKILL_DESCRIPTION,
    content: modelPortraitSkillContent(),
    source: 'bundled',
    invocation: { modelInvocable: true, userInvocable: true },
    provider: 'dsh-multi-model-provider',
  })
}
