import type { JsonValue } from '@deepseek-ai/dsh-tools';
/** Convert provider documentation HTML to compact text without executing page code. */
export declare function portraitSourceText(body: string, contentType: string): string;
/** Collect the exact plugin-approved documentation entry points from a research manifest. */
export declare function portraitResearchSources(value: unknown): readonly string[];
export declare function fetchPortraitSource(url: string, allowedSources: ReadonlySet<string>, signal?: AbortSignal): Promise<JsonValue>;
