# Plugin check warns

`plugin check --root .` reports zero errors. The three remaining warns are
accepted, with reasons. Per the workbench's D-004, a heuristic warn needs review
and an explanation — not a code change that games the scan.

Re-audit this file whenever the rule set version changes.

## ERR-001 — 错误类缺少：extends Error

**False positive.** The rule text-scans one file for the literal `extends Error`.

`ModelManagerError` (`src/operations.ts`) extends `HarnessError`, which itself
extends `Error` (`@deepseek-ai/dsh-llm`, `src/error.ts:13`). The class therefore
satisfies the rule's intent — a stable error type carrying `code` and `message` —
but the scan cannot follow an inheritance chain across packages.

Extending `Error` directly to silence the warn would *lose* the harness error
contract this plugin is supposed to participate in, making the code worse to make
a checker greener. Not done.

Coverage: `tests/operations.spec.ts` and `tests/registry.spec.ts` assert real
`code` values (`MODEL_SETTINGS_UNAVAILABLE`, `INVALID_MODEL_CONFIGURATION`) on
thrown errors, and assert that validation refuses to mutate settings first.

## REL-001 — runtime 测试未覆盖幂等/崩溃恢复

**Accepted heuristic, covered at the owning layers.** This plugin persists
configuration only through the Host Settings and Credentials services. Every
Settings write supplies the descriptor revision, so compare-and-swap,
serialization, and crash-safe storage remain owned by `dsh-settings`; credential
storage remains owned by `dsh-credentials`. The plugin does not maintain a second
journal or writable file store that it could replay after a crash.

Plugin-owned temporary resources do have lifecycle coverage:
`tests/realtime-runtime.spec.ts` verifies adapter/session cleanup and
`tests/probe-route.spec.ts` verifies exact route re-ownership after service
reactivation. Portrait collection is a current-Session skill and intentionally
does not own a background Agent, temporary Workspace, job reservation, or
persistent queue. Configuration tests assert that validation happens before
mutation and that the Settings revision is forwarded.

Revisit this acceptance if the plugin starts writing files directly, adds its own
persistent store, or performs a multi-namespace write that needs compensation.

## CAND-001 — 未声明可脚本化 CLI 入口

**Accepted, does not apply.** This is a candidate rule, `warn` by design and
statistical while it is being evaluated.

The plugin's operations are model-facing tools that mutate host settings and
credential references through the Settings service. They are not shell
operations, and there is no host-local workflow a script could drive that the
tools do not already cover. Adding a CLI would create a second, untested surface
onto credential handling for no caller.

If a scriptable surface is ever wanted, it should wrap `src/operations.ts` and
`src/registry.ts` and be declared under `cli.entrypoint` at that point.
