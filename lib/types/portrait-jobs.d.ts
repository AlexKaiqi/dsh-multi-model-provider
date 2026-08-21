import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
export declare const PORTRAIT_JOBS_PATH = "/dsh-multi-model-provider/portrait-jobs";
export declare const PORTRAIT_JOB_HEADER = "x-dsh-portrait-job";
type PortraitJobAction = 'research' | 'probe';
type PortraitJobStatus = 'queued' | 'running' | 'completed' | 'failed';
export interface PortraitJobView {
    readonly id: string;
    readonly action: PortraitJobAction;
    readonly status: PortraitJobStatus;
    readonly targetIds: readonly string[];
    readonly workspaceLabel: 'anonymous temporary workspace';
    readonly phase: string;
    readonly startedAt: string;
    readonly finishedAt?: string;
    readonly summary?: string;
    readonly error?: string;
}
type PortraitJobScope = Context & {
    readonly agents: Context['agents'];
    readonly agentDefaultModel: Context['agentDefaultModel'];
    readonly webServer: {
        register(route: {
            kind: 'exact';
            path: string;
            handler(req: IncomingMessage, res: ServerResponse): Promise<void>;
        }): () => void;
    };
};
export declare class PortraitJobCoordinator {
    private readonly ctx;
    private latest;
    private activeHandle;
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
//# sourceMappingURL=portrait-jobs.d.ts.map