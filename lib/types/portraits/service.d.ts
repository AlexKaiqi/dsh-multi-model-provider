import type { Context } from '@deepseek-ai/cordis';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { GetModelPortraitInput, UpsertModelPortraitInput } from '../types.ts';
export declare function upsertModelPortrait(ctx: Context, input: UpsertModelPortraitInput, expectedRevision?: number): Promise<Record<string, unknown>>;
export declare function getModelPortrait(ctx: Context, input: GetModelPortraitInput, events?: readonly SessionEvent[]): Promise<Record<string, unknown>>;
