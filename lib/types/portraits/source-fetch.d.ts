export declare const FETCH_PORTRAIT_SOURCE_TOOL = "fetch_portrait_source";
/** Convert provider documentation HTML to compact text without executing page code. */
export declare function portraitSourceText(body: string, contentType: string): string;
/** Collect the exact plugin-approved documentation entry points from a research manifest. */
export declare function portraitResearchSources(value: unknown): readonly string[];
/** Build the private, per-job source reader exposed only inside the anonymous Agent. */
export declare function portraitSourceTool(allowedSources: readonly string[]): import("@deepseek-ai/dsh-tools").ToolDefinition;
