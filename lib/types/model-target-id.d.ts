export declare function llmTargetId(provider: string, model: string): string;
export declare function parseLlmTargetId(id: string): {
    provider: string;
    model: string;
} | undefined;
