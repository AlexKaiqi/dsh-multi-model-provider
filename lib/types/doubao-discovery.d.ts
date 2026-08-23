import type { LlmDiscoveredModel, LlmModelDiscoveryRequest } from '@deepseek-ai/dsh-llm';
export declare const DOUBAO_REALTIME_ENDPOINT = "wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue";
export declare const DOUBAO_REALTIME_MODEL = "1.2.6.1";
type ProbeOptions = {
    readonly endpoint?: string;
    readonly apiKey?: string;
    readonly signal?: AbortSignal;
    readonly timeoutMs?: number;
    readonly trustedOrigins?: ReadonlySet<string>;
};
/**
 * Authenticate the draft API key against the actual Realtime Duplex service.
 * The service has no ListModels endpoint, so discovery must not pretend the
 * bundled voice directory came from the network. A successful minimal session
 * proves the key, endpoint, fixed protocol model, and one documented voice work
 * together before the UI offers the documented voice choices.
 */
export declare function probeDoubaoRealtimeKey(options: ProbeOptions): Promise<void>;
/** Validate the draft key live, then return the documented voice directory. */
export declare function discoverDoubaoRealtimeVoices(request: LlmModelDiscoveryRequest): Promise<LlmDiscoveredModel[]>;
export {};
