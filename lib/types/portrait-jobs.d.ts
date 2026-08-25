import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
import type { TemporaryWorkspaceService } from 'dsh-temporary-workspace';
import { modelManagerTools } from './tools.ts';
export declare const PORTRAIT_JOBS_PATH = "/dsh-multi-model-provider/portrait-jobs";
export declare const PORTRAIT_JOB_HEADER = "x-dsh-portrait-job";
type PortraitJobAction = 'research' | 'probe';
type PortraitJobStatus = 'queued' | 'running' | 'completed' | 'failed';
export interface PortraitJobView {
    readonly id: string;
    readonly action: PortraitJobAction;
    readonly status: PortraitJobStatus;
    readonly targetIds: readonly string[];
    readonly workspaceLabel: 'temporary workspace';
    /** Visible DSH Session created for this collection run once the Agent is mounted. */
    readonly sessionId?: string;
    readonly phase: string;
    readonly startedAt: string;
    readonly finishedAt?: string;
    readonly summary?: string;
    readonly error?: string;
}
type PortraitTemporaryWorkspaces = Pick<TemporaryWorkspaceService, 'reserve' | 'adopt' | 'retain' | 'discard'>;
type PortraitJobScope = Context & {
    readonly agents: Context['agents'];
    readonly agentDefaultModel: Context['agentDefaultModel'];
    readonly temporaryWorkspaces: PortraitTemporaryWorkspaces;
    readonly webServer: {
        register(route: {
            kind: 'exact';
            path: string;
            handler(req: IncomingMessage, res: ServerResponse): Promise<void>;
        }): () => void;
    };
};
export declare function boundPortraitResearchTools(tools: ReturnType<typeof modelManagerTools>, targetIds: readonly string[]): {
    name: "portrait_job_ingest_research" | "portrait_job_upsert_portrait" | "portrait_job_validate_portrait" | "portrait_job_get_portrait";
    description: string;
    execute: (args: Record<string, unknown>, exec: ToolRunContext) => Promise<unknown>;
    output: import("@deepseek-ai/dsh-tools").ToolOutputDefinition;
    finalizeContent?(exec: Readonly<import("@deepseek-ai/dsh-tools").ToolExecution>, result: Readonly<import("@deepseek-ai/dsh-tools").ToolExecutionResult>): import("@deepseek-ai/dsh-llm").ContentBlock[] | undefined;
    timeoutMs?: number;
    isConcurrencySafe?(args: unknown): boolean;
    presentCall?(args: unknown): import("@deepseek-ai/dsh-tools").ToolCallView | undefined;
    presentResult?(args: unknown, result: import("@deepseek-ai/dsh-tools").ToolResult): import("@deepseek-ai/dsh-tools").ToolResultView | undefined;
    parameters: Record<string, unknown>;
}[];
export declare class PortraitJobCoordinator {
    private readonly ctx;
    private latest;
    private activeHandle;
    private activeRun;
    private activeAbort;
    private starting;
    private disposed;
    constructor(ctx: PortraitJobScope);
    snapshot(): PortraitJobView | undefined;
    start(action: PortraitJobAction, ids: readonly string[] | undefined, approved: boolean): Promise<PortraitJobView>;
    dispose(): Promise<void>;
    private execute;
}
export declare function registerPortraitJobRoutes(ctx: Context): void;
export {};
