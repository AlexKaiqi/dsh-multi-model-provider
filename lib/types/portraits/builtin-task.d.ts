import type { ModelPortrait, TaskModelTask } from '../types.ts';
export declare const CURATED_TASK_MODEL_PORTRAIT_SELECTION: {
    readonly observedAt: "2026-08-20T00:00:00.000Z";
    readonly policy: "current-specialized-task-routes";
    readonly providerCatalogs: readonly ["https://developers.openai.com/api/docs/models", "https://ai.google.dev/gemini-api/docs/models", "https://www.minimax.io/blog/minimax-h3", "https://platform.minimax.io/docs/api-reference/api-overview", "https://platform.minimax.io/docs/guides/pricing-paygo"];
    readonly rationale: "Represent materially different image, video, speech, and music routes as task models. Prefer current production models from major providers, retain legacy routes only when they remain callable and clearly mark them disabled, preserve input/output and execution boundaries, and never treat a task generator as an Agent LLM.";
};
export declare const CURATED_TASK_MODEL_PORTRAIT_IDS: string[];
/** Return a cloned task portrait only for an exact provider/model/task identity. */
export declare function builtinTaskPortrait(provider: string, model: string, task: TaskModelTask): ModelPortrait | undefined;
