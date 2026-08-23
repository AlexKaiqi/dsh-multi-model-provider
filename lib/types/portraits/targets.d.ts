import type { Context } from '@deepseek-ai/cordis';
import type { LlmResolvedModelInfo } from '@deepseek-ai/dsh-llm';
import { resolveTaskModelRoute } from '../registry.ts';
import type { ModelPortrait } from '../types.ts';
export interface TaskPortraitTarget {
    readonly kind: 'task';
    readonly id: string;
    readonly portrait: ModelPortrait | undefined;
    readonly portraitSource: 'stored' | 'bundled' | undefined;
    readonly settingsRevision: number;
    readonly storagePath: readonly string[];
    readonly declared: Record<string, unknown>;
    readonly route: ReturnType<typeof resolveTaskModelRoute>;
}
export interface LlmPortraitTarget {
    readonly kind: 'llm';
    readonly id: string;
    readonly provider: string;
    readonly model: string;
    readonly portrait: ModelPortrait | undefined;
    readonly portraitSource: 'stored' | 'bundled' | undefined;
    readonly settingsRevision: number;
    readonly storagePath: readonly string[];
    readonly declared: Record<string, unknown>;
    readonly info: LlmResolvedModelInfo;
}
export type PortraitTarget = TaskPortraitTarget | LlmPortraitTarget;
export declare function resolvePortraitTarget(ctx: Context, id: string, signal?: AbortSignal): Promise<PortraitTarget>;
