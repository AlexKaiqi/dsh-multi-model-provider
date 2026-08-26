---
name: collect-model-portraits
description: Research and update evidence-backed portraits for models already configured in the current DSH profile. Use when the user asks to collect, organize, create, refresh, or improve model portraits; do not use for unconfigured catalog entries.
---

# Collect model portraits

Treat model-portrait collection as work in the current conversation. Do not create a background Agent, subagent, temporary Workspace, or separate Session.

Read exact target ids from the user's request when present. Otherwise infer them only from models the user just registered or selected; if recent context does not narrow them, let `prepare_model_portraits` return configured portraits that need work.

1. Call `prepare_model_portraits` with the selected ids.
2. For each returned candidate, use its immutable seed facts as-is. Treat `researchPlan.suggestedSources` as the source-discovery result: it contains model-specific stored evidence first, followed by current first-party entry points bundled for the provider. Open the relevant URLs with `fetch_portrait_source`, passing the same candidate id and exact URL. The tool safely resolves reviewed same-site documentation redirects. Do not require the user to supply URLs when `sourceStatus` is `ready`.
3. Extract only claims actually present in opened first-party documentation or clearly labelled independent benchmarks. Keep unsupported facts unknown. Never infer price, limits, quality, or performance from model names or memory.
4. Call `ingest_portrait_research` with current HTTP(S) evidence and claim-level provenance. Every price rate must reference evidence from the same portrait.
5. Immediately call `validate_model_portrait` with `liveProbe=false`, then call `get_model_portrait` to verify the stored result.

Do not rewrite registered identity, modalities, operations, execution mode, or other declared interface facts. Documentation must never populate `performance.lastProbe`; a provider-traffic live probe requires the user's explicit approval at action time.

If `sourceStatus` is `unavailable`, report that this provider has no trusted source mapping; do not incorrectly claim that the environment merely lacks generic Web tools. If mapped pages do not mention the exact model, save only the supported provider-level facts and report the remaining model-specific gaps. Finish with a concise target-by-target summary of saved facts, remaining unknowns, evidence URLs, and validation state.
