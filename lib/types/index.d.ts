/**
 * Register models, assist with portraits, and select the Agent model.
 *
 * Peer plugins inject `modelCatalog` and call `snapshot()` to read every
 * registered model. `selectAgentModel()` saves the Agent (primary) language
 * model from that catalog. Language models stay in llm-pi-ai; this plugin
 * owns non-language task-model registration, portraits, and speed probes.
 */
import type { Context } from '@deepseek-ai/cordis';
export * from './model/guidance.ts';
export * from './model/tool-surfaces.ts';
export * from './model/help.ts';
export * from './operations.ts';
export * from './providers/index.ts';
export * from './registry.ts';
export * from './runtime.ts';
export * from './catalog.ts';
export * from './portrait-core.ts';
export * from './portraits.ts';
export * from './observations/index.ts';
export * from './portraits/index.ts';
export * from './invocation.ts';
export * from './types.ts';
export { modelManagerTools } from './tools.ts';
export declare const name = "multi-model-provider";
export declare const inject: string[];
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map