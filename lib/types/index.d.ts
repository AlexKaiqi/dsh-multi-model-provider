/**
 * Agent-assisted model provider management for DeepSeek Harness.
 *
 * The official llm-pi-ai settings namespace remains authoritative for
 * language models. This plugin owns a separate task-model catalog for routes
 * that cannot participate in the LLM request contract.
 */
import type { Context } from '@deepseek-ai/cordis';
export * from './model/guidance.ts';
export * from './model/tool-surfaces.ts';
export * from './model/help.ts';
export * from './operations.ts';
export * from './providers/index.ts';
export * from './registry.ts';
export * from './runtime.ts';
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