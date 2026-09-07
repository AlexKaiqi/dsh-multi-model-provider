import type { Context } from '@deepseek-ai/cordis';
import { HarnessError } from '@deepseek-ai/dsh-llm';
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings';
import type { ConfigureModelRouteInput, ListModelRoutesInput } from './types.ts';
export declare const PI_AI_SETTINGS_NAMESPACE: SettingsNamespace;
export declare class ModelManagerError extends HarnessError {
    constructor(message: string, code: string, options?: ErrorOptions);
}
export declare function configureModelRoute(ctx: Context, input: ConfigureModelRouteInput): Promise<Record<string, unknown>>;
export declare function listModelRoutes(ctx: Context, input?: ListModelRoutesInput): Promise<Record<string, unknown>>;
