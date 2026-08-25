import type { Context } from '@deepseek-ai/cordis';
/** Secret-free unified registry snapshot consumed by the Settings portrait page. */
export declare const MODEL_CATALOG_PATH = "/dsh-multi-model-provider/catalog";
/** Mount the browser-readable view of the same modelCatalog service peer plugins consume. */
export declare function registerModelCatalogRoute(ctx: Context): void;
