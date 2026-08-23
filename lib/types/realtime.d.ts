import type { Context } from '@deepseek-ai/cordis';
import { Service } from '@deepseek-ai/cordis';
import type { RealtimeModelProfile, RealtimeModelRoute, RealtimeModelSessionAdapter } from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        realtimeModelRuntime: RealtimeModelRuntime;
    }
}
/**
 * Provider-neutral runtime for registered full-duplex model sessions.
 *
 * The multi-model plugin owns route selection and credential resolution.
 * Provider plugins register wire adapters; product plugins register role
 * profiles. Neither side needs to inspect the other's settings schema.
 */
export declare class RealtimeModelRuntime extends Service {
    private readonly adapters;
    private readonly profiles;
    private readonly maxContextChars;
    constructor(ctx: Context, options?: {
        maxContextChars?: number;
    });
    registerAdapter(adapter: RealtimeModelSessionAdapter): () => void;
    hasAdapter(id: string | undefined): boolean;
    registerProfile(profile: RealtimeModelProfile): () => void;
    profile(id: string): RealtimeModelProfile;
    models(): Promise<RealtimeModelRoute[]>;
    model(routeId?: string, protocol?: string): Promise<RealtimeModelRoute | undefined>;
    credential(route: RealtimeModelRoute): Promise<{
        value: string;
        credentialRef: string;
    }>;
    publicModels(): Promise<Array<Record<string, unknown>>>;
    instructions(profile: RealtimeModelProfile, context: string): string;
    session(input: {
        profileId: string;
        route: RealtimeModelRoute;
        context?: string;
    }): unknown;
}
export default RealtimeModelRuntime;
