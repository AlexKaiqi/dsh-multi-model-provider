export interface LlmInvocationObservation {
    readonly id: string;
    readonly provider: string;
    readonly model: string;
    readonly startedAt: string;
    readonly durationMs: number;
    readonly success: boolean;
    readonly usage: {
        readonly inputTokens?: number;
        readonly outputTokens?: number;
        readonly cacheReadTokens?: number;
        readonly cacheWriteTokens?: number;
        readonly reasoningTokens?: number;
    };
    readonly errorCode?: string;
}
//# sourceMappingURL=types.d.ts.map