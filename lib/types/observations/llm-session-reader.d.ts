import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { LlmInvocationObservation } from './types.ts';
/**
 * Adapts durable Harness LLM events into privacy-safe observations.
 * Prompt and response content are deliberately ignored.
 */
export declare function llmObservations(events: readonly SessionEvent[] | undefined): LlmInvocationObservation[];
