# Task 88 — Chunked initialisation (input → UI → API history)

**Status: DONE**
**Priority:** 🔴 Critique (perf)

## Goal

On load: paint input chunks first, then the interface, and only at the end
call the APIs (chat history lists, models).

## Current state (partially done in working tree)

- `ChatService`: lazy `sessionsResource` guarded by `_shouldLoadSessions`;
  `loadSessions()` called in `setTimeout(..., 0)` from `ChatPageComponent`
  so first paint happens before the history fetch.

## Remaining work

1. `AiConfigService` constructor: defer initial `fetchModels()` to idle
   (`requestIdleCallback` + `setTimeout(1500)` fallback) — models are only
   needed when the settings dialog opens.
2. `ElevenLabsVoiceService` (TTS voices): same idle-deferral for the initial
   `loadVoicesForProvider()` if it fires at startup (check callers first).
3. Keep `loadSessions()` deferred (already done) — verify single fetch.

## Acceptance Criteria

- [x] First paint (input + shell) renders with 0 pending API calls.
- [x] History + models + voices fetch only after idle/defer.
- [x] No regression: history list still loads automatically once.
- [x] `nx build frontend` OK.

---

**Validated 2026-09-21:** `pnpm lint` (4 projects, 0 errors) · `pnpm format:check` clean · `pnpm build` success · `tsc --noEmit -p apps/frontend/tsconfig.app.json` 0 errors · backend unit 78 pass · frontend unit 41 pass · theme-token guard OK.
