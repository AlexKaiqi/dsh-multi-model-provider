export declare const VOLCENGINE_DEFAULT_PROFILE: {
    readonly displayName: "火山方舟（按量计费）";
    readonly apiKeyEnv: "ARK_API_KEY";
    readonly baseURL: "https://ark.cn-beijing.volces.com/api/v3";
    readonly api: "openai-completions";
    readonly models: readonly [];
};
export declare const DOUBAO_DEFAULT_PROFILE: {
    readonly provider: "doubao-speech";
    readonly displayName: "豆包语音";
    readonly apiKeyEnv: "DOUBAO_API_KEY";
    readonly credentialRef: "DOUBAO_API_KEY";
    readonly credentialRefs: {
        readonly apiKey: "DOUBAO_API_KEY";
        readonly speechAppId: "DOUBAO_APPID";
        readonly speechToken: "DOUBAO_TOKEN";
        readonly realtimeApiKey: "DOUBAO_API_KEY";
    };
    readonly baseURL: "wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue";
    readonly models: readonly [];
    readonly profile: {
        readonly kind: "realtime-speech";
        readonly adapter: "dsh-realtime-voice";
        readonly protocol: "doubao-realtime-duplex";
        readonly protocolModel: "1.2.6.1";
        readonly modelOption: "voice";
        readonly product: "doubao-speech";
        readonly speechResources: "documented-resource-ids";
    };
};
export declare function doubaoProviderDirectoryEntry(): {
    readonly provider: "doubao-speech";
    readonly displayName: "豆包语音";
    readonly settingsNs: "multi-model-provider";
    readonly settingsPath: readonly ["providerProfiles", "doubao-speech"];
    readonly declared: false;
};
export declare function volcengineProviderDirectoryEntry(): {
    readonly provider: "volcengine";
    readonly displayName: "火山方舟（按量计费）";
    readonly settingsNs: "llm-pi-ai";
    readonly settingsPath: readonly ["providers", "volcengine"];
    readonly declared: false;
};
