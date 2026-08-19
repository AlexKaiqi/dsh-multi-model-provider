import type { Context } from '@deepseek-ai/cordis';
import type { SettingsPathOp } from '@deepseek-ai/dsh-settings';
import type { TaskModelRegistryConfig } from '../types.ts';
export declare function portraitSettings(ctx: Context): import("@deepseek-ai/dsh-settings").SettingsDescriptor;
export declare function portraitRegistry(ctx: Context): TaskModelRegistryConfig;
export declare function mutatePortraitSettings(ctx: Context, operations: readonly SettingsPathOp[]): Promise<void>;
//# sourceMappingURL=storage.d.ts.map