import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { SummarizeModelUsageInput } from '../types.ts';
export declare function summarizeModelUsage(input: SummarizeModelUsageInput, events?: readonly SessionEvent[]): Record<string, unknown>;
