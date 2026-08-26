import type { Context } from '@deepseek-ai/cordis';
export declare const MODEL_PORTRAIT_SKILL_NAME = "collect-model-portraits";
export declare const MODEL_PORTRAIT_SKILL_DESCRIPTION = "Research and update evidence-backed portraits for models already configured in the current DSH profile. Use when the user asks to collect, organize, create, refresh, or improve model portraits; do not use for unconfigured catalog entries.";
export declare function modelPortraitSkillContent(url?: URL): string;
export declare function registerModelPortraitSkill(ctx: Context): () => void;
