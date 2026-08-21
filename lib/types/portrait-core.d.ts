import type { ModelPortrait, ModelPortraitInput, ModelPortraitValidationCheck } from './types.ts';
export declare function portraitChecks(portrait: ModelPortrait): ModelPortraitValidationCheck[];
export declare function normalizePortrait(input: ModelPortraitInput): ModelPortrait;
/** Fill fields omitted by legacy stored portraits while preserving their last validation result. */
export declare function normalizeStoredPortrait(input: ModelPortraitInput | ModelPortrait): ModelPortrait;
export declare function initialPortrait(summary?: string): ModelPortrait;
//# sourceMappingURL=portrait-core.d.ts.map