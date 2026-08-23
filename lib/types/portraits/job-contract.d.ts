/** Plugin-owned requirements passed to an anonymous background research Agent. */
export declare const PORTRAIT_JOB_CONTRACT: {
    readonly version: 1;
    readonly ownership: {
        readonly plugin: readonly ["target selection and canonical ids", "registered interface facts and immutable seed data", "portrait schema and persistence tools", "evidence validation and acceptance checks", "live-test authorization boundary"];
        readonly agent: readonly ["open current first-party documentation", "extract only supported qualitative and commercial claims", "attach source URLs, observation dates, and claim-level evidence", "submit findings through the plugin tools", "report unsupported or unknown fields without guessing"];
    };
    readonly requiredPortrait: {
        readonly qualitative: readonly ["positioning", "strengths", "limitations", "best-for scenarios", "avoid-for scenarios"];
        readonly commercial: readonly ["operation", "billing unit", "amount", "currency", "effective date or caveat", "evidence id"];
        readonly performance: readonly ["source-labelled benchmark claims only; live reachability and latency are never copied from documentation"];
        readonly provenance: readonly ["http(s) source", "provider-doc or benchmark kind", "observedAt", "supported claims", "source limitations"];
    };
    readonly acceptance: readonly ["registered identity, modalities, capabilities, operations, and execution mode are never rewritten from research", "every price rate references an evidence record from the same portrait", "unknown facts remain unknown instead of being inferred", "provider claims and independent benchmarks are labelled separately", "research never writes performance.lastProbe", "every saved portrait is passed through portrait_job_validate_portrait, which forces liveProbe=false"];
};
export declare function buildPortraitResearchPrompt(manifest: Record<string, unknown>): string;
export declare function buildPortraitProbePrompt(ids: readonly string[], approvedAt: string): string;
