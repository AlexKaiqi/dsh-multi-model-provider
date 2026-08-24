import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type SettingsDescriptor } from '@deepseek-ai/dsh-settings';
import { type CredentialStatus, type DiscoverTaskModelsInput, type ListTaskModelsInput, type RegisterTaskModelInput, type ResolvedTaskModelRoute, type TaskModelRegistryConfig, type SelectTaskModelsInput } from './types.ts';
export declare const TASK_MODEL_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
export declare const TASK_MODEL_REGISTRY_SCHEMA: z<TaskModelRegistryConfig>;
export declare const BUILTIN_TASK_MODEL_REGISTRY: TaskModelRegistryConfig;
/**
 * Exact task routes that the user registered or selected for this profile.
 *
 * The merged Settings value contains the entire built-in catalog, so presence
 * in config.models alone is not evidence that a route is user configured.
 */
export declare function configuredTaskModelIds(ctx: Context): ReadonlySet<string>;
export declare function resolveTaskModelRoute(ctx: Context, id: string, descriptor?: SettingsDescriptor): ResolvedTaskModelRoute;
export interface EffectiveTaskModelAvailability {
    readonly route: ResolvedTaskModelRoute;
    readonly enabled: boolean;
    readonly adapterAvailable: boolean;
    readonly credentialReady: boolean;
    readonly callable: boolean;
    readonly credential?: CredentialStatus;
    readonly credentials?: Record<string, CredentialStatus>;
}
/** Authoritative effective availability after selection, adapter, and credential policy. */
export declare function effectiveTaskModelAvailability(ctx: Context, routeOrId: ResolvedTaskModelRoute | string, descriptor?: SettingsDescriptor): Promise<EffectiveTaskModelAvailability>;
export declare function validateTaskModelRegistry(config: TaskModelRegistryConfig): void;
export declare function registerTaskModelSettings(ctx: Context): void;
export declare function registerTaskModel(ctx: Context, input: RegisterTaskModelInput): Promise<Record<string, unknown>>;
export declare function assertSafeCatalogEndpoint(endpoint: string): Promise<void>;
export declare function discoverTaskModels(ctx: Context, input: DiscoverTaskModelsInput, signal?: AbortSignal): Promise<Record<string, unknown>>;
export declare function selectTaskModels(ctx: Context, input: SelectTaskModelsInput): Promise<Record<string, unknown>>;
export declare function listTaskModels(ctx: Context, input?: ListTaskModelsInput): Promise<Record<string, unknown>>;
