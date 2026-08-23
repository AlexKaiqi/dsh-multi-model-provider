import type { RegisteredTaskModel } from './types.ts';
/** Stable provider id for the Doubao speech product and its task routes. */
export declare const DOUBAO_SPEECH_PROVIDER = "doubao-speech";
export declare const DOUBAO_REALTIME_BASE_URL = "wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue";
export type DoubaoRealtimeVoice = {
    readonly voice: string;
    readonly name: string;
    readonly variant: 's2s-o' | 'sc-2.0';
};
type DoubaoSpeechCatalogEntry = {
    readonly id: string;
    readonly summary: string;
    readonly registration: Omit<RegisteredTaskModel, 'portrait'>;
};
/**
 * Legacy batch-speech routes retained only so existing settings remain valid
 * until the Realtime provider is saved or removed. They are deliberately not
 * shown by the Models provider editor: their Access Token contract is a
 * different product surface from Realtime Duplex.
 */
export declare const DOUBAO_SPEECH_LEGACY_CATALOG: readonly DoubaoSpeechCatalogEntry[];
/**
 * Public voices documented for the Realtime S2S-O and SC 2.0 products.
 *
 * The Realtime wire protocol itself has no ListModels endpoint and fixes
 * `session.model` to 1.2.6.1. Voice is the actual selectable upstream
 * capability, so the generic provider picker presents these profiles and the
 * runtime maps each one back to the fixed protocol model plus its voice id.
 */
export declare const DOUBAO_REALTIME_VOICES: readonly DoubaoRealtimeVoice[];
/** Realtime voice-backed profiles shown by the Doubao Speech provider. */
export declare const DOUBAO_SPEECH_CATALOG: readonly DoubaoSpeechCatalogEntry[];
export {};
