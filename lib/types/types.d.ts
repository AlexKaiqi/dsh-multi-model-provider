import type { LlmModelInfo } from '@deepseek-ai/dsh-llm';
import type { JsonValue } from '@deepseek-ai/dsh-session';
export type ProviderApi = 'openai-completions' | 'openai-responses' | 'anthropic-messages';
export type InputModality = 'text' | 'image';
export declare const TASK_MODEL_TASKS: readonly ["image-understanding", "image-generation", "speech-synthesis", "transcription", "speech-translation", "speech-analysis", "voice-conversion", "podcast-generation", "realtime-speech", "voice-cloning", "voice-design", "audio-generation", "video-generation", "embedding", "reranking"];
export declare const MODEL_MODALITIES: readonly ["text", "image", "audio", "video", "file", "vector", "data"];
export declare const MODEL_EXECUTION_MODES: readonly ["request-response", "streaming", "async-job", "realtime"];
/** Stable cross-provider capability ids shared with Lore's model registry. */
export declare const TASK_MODEL_CAPABILITIES: readonly ["text.generate", "image.understand", "image.generate", "speech.transcribe.stream", "speech.transcribe.file", "speech.synthesize.short", "speech.synthesize.long", "speech.translate.stream", "speech.analyze", "speech.convert_voice", "speech.create_podcast", "speech.realtime_session", "voice.clone", "voice.design", "voice.preview", "voice.activate", "audio.generate", "video.generate"];
export type TaskModelTask = typeof TASK_MODEL_TASKS[number];
export type ModelModality = typeof MODEL_MODALITIES[number];
export type ModelExecutionMode = typeof MODEL_EXECUTION_MODES[number];
export type TaskModelCapability = typeof TASK_MODEL_CAPABILITIES[number];
export type ModelProfile = Record<string, unknown>;
export type PortraitEvidenceKind = 'provider-doc' | 'benchmark' | 'runtime-probe' | 'usage' | 'manual';
export type PortraitValidationState = 'unvalidated' | 'partial' | 'valid' | 'invalid' | 'stale';
export type SpeedClass = 'instant' | 'fast' | 'balanced' | 'slow' | 'async';
export interface ModelPriceRate {
    readonly operation: string;
    readonly unit: string;
    readonly amount: number;
    readonly currency: string;
    readonly tier?: string;
    readonly effectiveFrom?: string;
    readonly effectiveTo?: string;
    readonly evidenceId?: string;
}
export interface ModelPortraitEvidence {
    readonly id: string;
    readonly kind: PortraitEvidenceKind;
    readonly source: string;
    readonly observedAt: string;
    readonly claims: readonly string[];
    readonly notes?: string;
}
export interface ModelPortraitValidationCheck {
    readonly id: string;
    readonly status: 'pass' | 'warn' | 'fail';
    readonly message: string;
}
export interface ModelPortrait {
    readonly schemaVersion: 1;
    /** Free-form, sectioned Markdown used for qualitative routing knowledge. */
    readonly description?: string;
    /** Legacy short text retained for stored portraits created before description. */
    readonly summary?: string;
    readonly specialties: readonly string[];
    readonly limitations: readonly string[];
    readonly bestFor: readonly string[];
    readonly avoidFor: readonly string[];
    readonly pricing: {
        readonly rates: readonly ModelPriceRate[];
        readonly notes?: string;
    };
    readonly performance: {
        readonly speedClass?: SpeedClass;
        readonly typicalLatencyMs?: {
            readonly min: number;
            readonly max: number;
        };
        readonly throughputPerMinute?: number;
        readonly notes?: string;
        /** Most recent explicit live probe; never inferred from registration metadata. */
        readonly lastProbe?: {
            readonly observedAt: string;
            readonly reachable: boolean;
            readonly latencyMs: number;
            readonly timeToFirstTokenMs?: number;
        };
    };
    readonly qualityScores: Readonly<Record<string, number>>;
    readonly evidence: readonly ModelPortraitEvidence[];
    readonly validation: {
        readonly state: PortraitValidationState;
        readonly checkedAt?: string;
        readonly checks: readonly ModelPortraitValidationCheck[];
    };
}
export interface ModelPortraitInput {
    readonly description?: string;
    readonly summary?: string;
    readonly specialties?: readonly string[];
    readonly limitations?: readonly string[];
    readonly bestFor?: readonly string[];
    readonly avoidFor?: readonly string[];
    readonly pricing?: {
        readonly rates?: readonly ModelPriceRate[];
        readonly notes?: string;
    };
    readonly performance?: {
        readonly speedClass?: SpeedClass;
        readonly typicalLatencyMs?: {
            readonly min: number;
            readonly max: number;
        };
        readonly throughputPerMinute?: number;
        readonly notes?: string;
        readonly lastProbe?: {
            readonly observedAt: string;
            readonly reachable: boolean;
            readonly latencyMs: number;
            readonly timeToFirstTokenMs?: number;
        };
    };
    readonly qualityScores?: Readonly<Record<string, number>>;
    readonly evidence?: readonly ModelPortraitEvidence[];
}
export interface TaskModelConnection {
    readonly provider: string;
    readonly displayName?: string;
    /** Legacy single-secret reference retained for backward compatibility. */
    readonly credentialRef?: string;
    /** Named secret references for providers that require multiple credentials. */
    readonly credentialRefs?: Readonly<Record<string, string>>;
    readonly baseURL?: string;
    /** Optional provider model-catalog endpoint. Defaults to `${baseURL}/models`. */
    readonly catalogEndpoint?: string;
    /** Credential slot used for catalog discovery: `default` or a credentialRefs key. */
    readonly catalogCredentialName?: string;
    readonly profile?: ModelProfile;
}
export interface RegisteredTaskModel {
    /** Explicit routing selection. False means registered but unavailable to routing/invocation. */
    readonly enabled?: boolean;
    readonly connection: string;
    readonly model: string;
    readonly displayName?: string;
    readonly task: TaskModelTask;
    readonly runtimeAdapter?: string;
    /** Named connection credential slots required by this route. Omit for all legacy slots. */
    readonly credentialNames?: readonly string[];
    readonly input: readonly ModelModality[];
    readonly output: readonly ModelModality[];
    readonly execution: ModelExecutionMode;
    /** Optional in persisted legacy entries; the Settings schema resolves it to []. */
    readonly capabilities?: readonly TaskModelCapability[];
    readonly operations: readonly string[];
    readonly roles: readonly string[];
    readonly profile: ModelProfile;
    readonly portrait?: ModelPortrait;
}
export interface TaskModelRegistryConfig {
    readonly connections: Readonly<Record<string, TaskModelConnection>>;
    readonly models: Readonly<Record<string, RegisteredTaskModel>>;
    readonly defaults: Readonly<Partial<Record<TaskModelTask, string>>>;
    /** Portraits for models owned by another runtime registry, currently llm-pi-ai. */
    readonly portraits?: Readonly<Record<string, ExternalModelPortrait>>;
}
export interface ExternalModelPortrait {
    readonly kind: 'llm';
    readonly provider: string;
    readonly model: string;
    readonly portrait: ModelPortrait;
}
export interface ResolvedTaskModelRoute {
    readonly id: string;
    readonly connection: TaskModelConnection;
    readonly registration: RegisteredTaskModel;
}
export interface TaskModelAdapterRequest {
    readonly route: ResolvedTaskModelRoute;
    readonly operation: string;
    readonly request: Readonly<Record<string, JsonValue>>;
    /** Resolved for this invocation only. Adapters must never log or return it. */
    readonly credentials: Readonly<Record<string, string>>;
}
export interface TaskModelAdapterProbeResult {
    readonly ok: boolean;
    readonly message: string;
    readonly latencyMs?: number;
}
export interface TaskModelRuntimeAdapter {
    readonly id: string;
    available?(route: ResolvedTaskModelRoute): boolean;
    invoke(request: TaskModelAdapterRequest, signal: AbortSignal): Promise<TaskModelInvocationResult>;
    probe?(route: ResolvedTaskModelRoute, credentials: Readonly<Record<string, string>>, signal: AbortSignal): Promise<TaskModelAdapterProbeResult>;
}
export interface RegisterTaskModelInput {
    readonly id: string;
    readonly connection: string;
    readonly provider?: string;
    readonly connectionDisplayName?: string;
    readonly credentialRef?: string;
    readonly credentialRefs?: Readonly<Record<string, unknown>>;
    readonly baseURL?: string;
    readonly catalogEndpoint?: string;
    readonly catalogCredentialName?: string;
    readonly connectionProfile?: ModelProfile;
    readonly model: string;
    readonly displayName?: string;
    readonly task: TaskModelTask;
    readonly runtimeAdapter?: string;
    readonly enabled?: boolean;
    readonly credentialNames?: readonly string[];
    readonly input?: readonly ModelModality[];
    readonly output?: readonly ModelModality[];
    readonly execution?: ModelExecutionMode;
    readonly capabilities?: readonly TaskModelCapability[];
    readonly operations?: readonly string[];
    readonly roles?: readonly string[];
    readonly profile?: ModelProfile;
    readonly portrait?: ModelPortraitInput;
}
export interface UpsertModelPortraitInput {
    readonly id: string;
    readonly portrait: ModelPortraitInput;
}
export interface GetModelPortraitInput {
    readonly id: string;
    readonly includeEvidence?: boolean;
    readonly includeUsage?: boolean;
}
export interface ValidateModelPortraitInput {
    readonly id: string;
    readonly liveProbe?: boolean;
}
export interface InvokeTaskModelInput {
    readonly id: string;
    readonly operation: string;
    readonly request: Readonly<Record<string, JsonValue>>;
}
export interface DiscoverTaskModelsInput {
    readonly connection: string;
}
export interface SelectTaskModelsInput {
    readonly connection: string;
    /** Exact registered route ids. An empty list intentionally disables every route on the connection. */
    readonly ids: readonly string[];
}
export interface SelectVolcengineLanguageModelsInput {
    /** Complete selected LLM/VLM profiles. An empty array explicitly disables the Volcengine LLM route. */
    readonly models: readonly ModelProfileInput[];
}
export interface DiscoveredTaskModel {
    readonly id: string;
    readonly ownedBy?: string;
}
export interface SummarizeModelUsageInput {
    readonly id?: string;
}
export interface PrepareModelPortraitsInput {
    /** Exact task route ids or llm:<provider>/<model> ids. Omit to find every enabled model needing initial work. */
    readonly ids?: readonly string[];
    readonly includeDisabled?: boolean;
}
export interface IngestPortraitResearchInput {
    readonly id: string;
    readonly findings: {
        readonly description?: string;
        readonly summary?: string;
        readonly specialties?: readonly string[];
        readonly limitations?: readonly string[];
        readonly bestFor?: readonly string[];
        readonly avoidFor?: readonly string[];
        readonly pricing?: {
            readonly rates?: readonly ModelPriceRate[];
            readonly notes?: string;
        };
        readonly performance?: {
            readonly speedClass?: SpeedClass;
            readonly typicalLatencyMs?: {
                readonly min: number;
                readonly max: number;
            };
            readonly throughputPerMinute?: number;
            readonly notes?: string;
            /** Rejected when present. lastProbe is measured, not researched. */
            readonly lastProbe?: unknown;
        };
        readonly qualityScores?: Readonly<Record<string, number>>;
        readonly evidence: readonly ModelPortraitEvidence[];
    };
}
export interface TaskModelInvocationMetrics {
    readonly inputUnits?: number;
    readonly outputUnits?: number;
    readonly estimatedCost?: number;
    readonly currency?: string;
    readonly providerRequestId?: string;
}
export interface TaskModelInvocationResult {
    /** JSON result metadata; binary media must be returned by durable URI/reference. */
    readonly output: Readonly<Record<string, JsonValue>>;
    readonly outputModalities?: readonly ModelModality[];
    readonly metrics?: TaskModelInvocationMetrics;
}
export interface TaskModelInvocationRecord {
    readonly routeId: string;
    readonly provider: string;
    readonly model: string;
    readonly task: TaskModelTask;
    readonly adapter: string;
    readonly operation: string;
    readonly startedAt: string;
    readonly durationMs: number;
    readonly success: boolean;
    readonly inputModalities: readonly ModelModality[];
    readonly outputModalities: readonly ModelModality[];
    readonly metrics?: TaskModelInvocationMetrics;
    readonly errorCode?: string;
}
export interface ListTaskModelsInput {
    readonly id?: string;
    readonly provider?: string;
    readonly task?: TaskModelTask;
    readonly includeProfile?: boolean;
}
export interface ModelProfileInput {
    readonly id: string;
    readonly name?: string;
    readonly contextWindow?: number;
    readonly maxTokens?: number;
    readonly input?: readonly InputModality[];
}
export interface ConfigureModelRouteInput {
    readonly provider: string;
    readonly apiKeyEnv?: string;
    readonly displayName?: string;
    readonly api?: ProviderApi;
    readonly baseURL?: string;
    readonly models?: readonly ModelProfileInput[];
    readonly defaultContextWindow?: number;
    readonly defaultMaxTokens?: number;
}
export interface ListModelRoutesInput {
    readonly provider?: string;
    readonly includeDormant?: boolean;
    readonly includeModels?: boolean;
}
export interface SelectDefaultModelInput {
    readonly provider: string;
    readonly model: string;
    readonly reasoningEffort?: string;
}
export interface CredentialStatus {
    readonly ref: string;
    readonly configured: boolean;
    readonly writable: boolean;
    readonly source?: string;
}
export interface ModelRouteView {
    readonly provider: string;
    readonly displayName: string;
    readonly status: 'live' | 'dormant';
    readonly declared?: boolean;
    readonly settingsNs?: string;
    readonly settingsPath?: readonly string[];
    readonly credential?: CredentialStatus;
    readonly models?: readonly LlmModelInfo[];
    readonly modelError?: string;
}
//# sourceMappingURL=types.d.ts.map