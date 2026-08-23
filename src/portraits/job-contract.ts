/** Plugin-owned requirements passed to an anonymous background research Agent. */
export const PORTRAIT_JOB_CONTRACT = {
  version: 1,
  ownership: {
    plugin: [
      'target selection and canonical ids',
      'registered interface facts and immutable seed data',
      'portrait schema and persistence tools',
      'evidence validation and acceptance checks',
      'live-test authorization boundary',
    ],
    agent: [
      'open current first-party documentation',
      'extract only supported qualitative and commercial claims',
      'attach source URLs, observation dates, and claim-level evidence',
      'submit findings through the plugin tools',
      'report unsupported or unknown fields without guessing',
    ],
  },
  requiredPortrait: {
    qualitative: ['positioning', 'strengths', 'limitations', 'best-for scenarios', 'avoid-for scenarios'],
    commercial: ['operation', 'billing unit', 'amount', 'currency', 'effective date or caveat', 'evidence id'],
    performance: ['source-labelled benchmark claims only; live reachability and latency are never copied from documentation'],
    provenance: ['http(s) source', 'provider-doc or benchmark kind', 'observedAt', 'supported claims', 'source limitations'],
  },
  acceptance: [
    'registered identity, modalities, capabilities, operations, and execution mode are never rewritten from research',
    'every price rate references an evidence record from the same portrait',
    'unknown facts remain unknown instead of being inferred',
    'provider claims and independent benchmarks are labelled separately',
    'research never writes performance.lastProbe',
    'every saved portrait is passed through portrait_job_validate_portrait, which forces liveProbe=false',
  ],
} as const

export function buildPortraitResearchPrompt(manifest: Record<string, unknown>): string {
  return `You are an anonymous background research Agent for the model-portrait Settings page. There is no human conversation to continue and no project work to perform.

The plugin owns the following contract. Follow it exactly; do not redefine the schema or ask the user to fill fields:
${JSON.stringify(PORTRAIT_JOB_CONTRACT, null, 2)}

The plugin selected these targets and supplied immutable seed facts, gaps, and suggested sources:
${JSON.stringify(manifest, null, 2)}

For every target, call fetch_portrait_source for the exact URLs in researchPlan.suggestedSources. When web_search or web_fetch is also available, use it only to locate or open additional credible benchmark sources. Extract only claims actually present in the returned content and use its final URL and observedAt in evidence. Then call portrait_job_ingest_research with current http(s) evidence, or portrait_job_upsert_portrait only when a complete replacement is required. Immediately call portrait_job_validate_portrait after every save, then inspect the stored result with portrait_job_get_portrait. These wrappers reject targets outside this job, and validation always forces liveProbe=false. Do not call global portrait mutation or validation tools. Do not write files, modify the anonymous workspace, register models, change model selection, or perform unrelated work. Finish with a concise target-by-target account of saved facts, remaining unknowns, evidence URLs, and validation states.`
}

export function buildPortraitProbePrompt(ids: readonly string[], approvedAt: string): string {
  return `You are an anonymous background validation Agent for the model-portrait Settings page.

The user explicitly authorized provider-traffic live tests at ${approvedAt} for exactly these portrait targets:
${JSON.stringify(ids)}

For each exact id, call get_model_portrait first, then call validate_model_portrait with liveProbe=true, and finally call get_model_portrait again to verify performance.lastProbe and runtime-probe evidence were saved. Do not research or alter qualitative claims, do not test any other target, do not invoke models through unrelated tools, and do not write files. Finish with reachability, measured latency, observation time, validation state, and any adapter limitation for every target.`
}
