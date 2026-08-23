import type { Context } from '@deepseek-ai/cordis';
import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
import type { InvokeTaskModelInput } from './types.ts';
export declare function invokeTaskModel(ctx: Context, input: InvokeTaskModelInput, exec: ToolRunContext): Promise<Record<string, unknown>>;
