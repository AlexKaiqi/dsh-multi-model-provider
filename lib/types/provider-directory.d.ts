export declare const VOLCENGINE_EDITOR: {
    readonly kind: "provider";
    readonly apiKeyRef: "ARK_API_KEY";
    readonly defaults: {
        readonly displayName: "火山方舟";
        readonly apiKeyEnv: "ARK_API_KEY";
        readonly baseURL: "https://ark.cn-beijing.volces.com/api/v3";
        readonly api: "openai-responses";
        readonly models: readonly [];
    };
    readonly credentialRequired: true;
    readonly modelsRequired: true;
};
export declare const DOUBAO_EDITOR: {
    readonly kind: "provider";
    readonly apiKeyRef: "DOUBAO_API_KEY";
    readonly defaults: {
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
            readonly product: "doubao-speech";
            readonly speechResources: "documented-resource-ids";
        };
    };
    readonly credentialRequired: true;
    readonly modelsRequired: true;
};
export declare function doubaoProviderDirectoryEntry(): {
    readonly provider: "doubao-speech";
    readonly displayName: "豆包语音";
    readonly settingsNs: "multi-model-provider";
    readonly settingsPath: readonly ["providerProfiles", "doubao-speech"];
    readonly editor: {
        readonly kind: "provider";
        readonly apiKeyRef: "DOUBAO_API_KEY";
        readonly defaults: {
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
                readonly product: "doubao-speech";
                readonly speechResources: "documented-resource-ids";
            };
        };
        readonly credentialRequired: true;
        readonly modelsRequired: true;
    };
    readonly declared: false;
};
export declare function volcengineProviderDirectoryEntry(): {
    readonly provider: "volcengine";
    readonly displayName: "火山方舟";
    readonly settingsNs: "llm-pi-ai";
    readonly settingsPath: readonly ["providers", "volcengine"];
    readonly editor: {
        readonly kind: "provider";
        readonly apiKeyRef: "ARK_API_KEY";
        readonly defaults: {
            readonly displayName: "火山方舟";
            readonly apiKeyEnv: "ARK_API_KEY";
            readonly baseURL: "https://ark.cn-beijing.volces.com/api/v3";
            readonly api: "openai-responses";
            readonly models: readonly [];
        };
        readonly credentialRequired: true;
        readonly modelsRequired: true;
    };
    readonly declared: false;
};
