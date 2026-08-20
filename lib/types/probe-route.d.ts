import type { IncomingMessage } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
/** HTTP path for the paid Settings availability probe. */
export declare const MODEL_PROBE_PATH = "/dsh-multi-model-provider/probe";
/** Header the Settings UI must send so casual GET/form traffic cannot bill. */
export declare const MODEL_PROBE_HEADER = "x-dsh-model-probe";
export type ProbeHttpRequest = {
    readonly method?: string | undefined;
    readonly headers: IncomingMessage['headers'];
};
/**
 * Decide whether a browser request is same-origin with the Host header.
 *
 * Args:
 *   req: Incoming HTTP request, or a headers-only stand-in used by tests.
 *
 * Returns:
 *   True when Origin uses http(s) and its host matches the Host header.
 */
export declare function isSameOriginHttpRequest(req: ProbeHttpRequest): boolean;
/**
 * Refuse a paid LLM probe unless it looks like the local Settings UI.
 *
 * A static marker header is not enough: any client that can set it could
 * stream against the user's configured models. Same-origin Origin matching,
 * plus Sec-Fetch-Site when the browser sends it, keeps the bill on this page.
 *
 * Args:
 *   req: Incoming HTTP request, or a headers-only stand-in used by tests.
 *
 * Returns:
 *   `{ ok: true }` when the probe may run, otherwise a 403 payload to send.
 */
export declare function authorizePaidModelProbe(req: ProbeHttpRequest): {
    ok: true;
} | {
    ok: false;
    status: 403;
    error: string;
};
/**
 * Stream one eight-token ping so Settings can record reachability and latency.
 *
 * Args:
 *   llm: Host language-model runtime used for the billed ping.
 *   provider: llm-pi-ai provider route id.
 *   model: Exact model id on that route.
 *
 * Returns:
 *   Reachability payload with latency; throws when the model stream fails.
 */
export declare function runPaidModelProbe(llm: Context['llm'], provider: string, model: string): Promise<{
    ok: true;
    provider: string;
    model: string;
    observedAt: string;
    latencyMs: number;
    timeToFirstTokenMs?: number;
}>;
/** Mount the explicit, minimally billed per-model availability/latency probe. */
export declare function registerModelProbeRoute(ctx: Context): void;
//# sourceMappingURL=probe-route.d.ts.map