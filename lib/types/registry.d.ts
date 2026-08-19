import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type DiscoverTaskModelsInput, type ListTaskModelsInput, type RegisterTaskModelInput, type ResolvedTaskModelRoute, type TaskModelRegistryConfig, type SelectTaskModelsInput } from './types.ts';
export declare const TASK_MODEL_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
export declare const TASK_MODEL_REGISTRY_SCHEMA: z<TaskModelRegistryConfig>;
export declare const BUILTIN_TASK_MODEL_REGISTRY: TaskModelRegistryConfig;
export declare function resolveTaskModelRoute(ctx: Context, id: string): ResolvedTaskModelRoute;
export declare function validateTaskModelRegistry(config: TaskModelRegistryConfig): void;
export declare function registerTaskModelSettings(ctx: Context): void;
export declare function registerTaskModel(ctx: Context, input: RegisterTaskModelInput): Promise<Record<string, unknown>>;
export declare function discoverTaskModels(ctx: Context, input: DiscoverTaskModelsInput, signal?: AbortSignal): Promise<Record<string, unknown>>;
export declare function selectTaskModels(ctx: Context, input: SelectTaskModelsInput): Promise<Record<string, unknown>>;
export declare function listTaskModels(ctx: Context, input?: ListTaskModelsInput): Promise<Record<string, unknown>>;
//# sourceMappingURL=registry.d.ts.map