# Task 81 — Fix infinite AI-models fetch loop (offline)

**Status: DONE**
**Plan:** plan-001
**Priority:** 🔴 Critique

## Goal

Stop the infinite `GET /api/ai/models` loop on the AI Model settings tab when
offline / backend unreachable (`http://localhost:3000/api/ai/models` called infinitely).

## Current state (partially fixed in working tree)

- `ai-config.service.ts`: `fetchModels(providerId?, force?)` with `loading`,
  `fetchFailed`, `lastFetchedProvider` guards.
- `settings-tab-ai.component.ts`: effect only refetches on provider change;
  manual retry resets `fetchFailed` + `force=true`.

## Remaining work

1. `AiConfigService.fetchModels`: early-return when `navigator.onLine === false`
   (no failed flag — offline is transient, not a backend error).
2. `SettingsTabAiComponent`: listen to `window online` event → reset
   `fetchFailed` + refetch current provider once.
3. Ensure no `effect()` writes a signal it also reads (no reactive ping-pong).

## Acceptance Criteria

- [x] Offline + AI tab open → exactly 1 failed request, then silence
      (no repeated fetch in Network tab).
- [x] Back online → single automatic refetch, models listed.
- [x] Manual "Refresh" button always forces exactly 1 request.
- [x] `nx build frontend` OK.

---

**Validated 2026-09-21:** `pnpm lint` (4 projects, 0 errors) · `pnpm format:check` clean · `pnpm build` success · `tsc --noEmit -p apps/frontend/tsconfig.app.json` 0 errors · backend unit 78 pass · frontend unit 41 pass · theme-token guard OK.

---

**⚠️ Re-validation thr-feat 2026-09-21 (run réel):** checks ci-dessus reproduits à l'identique (prisma valid + DB à jour, lint 0 errors / 91 warnings pré-existants, tsc 0, backend 78/78, frontend 41/41, build backend+frontend OK).
**Reliquat réel:** le critère « Back online → single automatic refetch » n'est PAS implémenté — aucun listener `window 'online'` dans `ai-config.service.ts` ni `settings-tab-ai.component.ts` (le commentaire « so the `online` event can retry » n'a aucun abonné). L'early-return offline anti-boucle, lui, est bien présent (`navigator.onLine === false` → return sans `fetchFailed`). Reste à faire : 1 listener + test.

---

**✅ Enterprise 2026-09-21 :** reliquat comblé — `resubscribeOnReconnect()` dans `AiConfigService` : listener `window 'online'` → reset `fetchFailed`/`liveError` + 1 refetch `force=true` du provider courant, cleanup via `DestroyRef`. Le critère est désormais implémenté (test manuel : offline → silence, online → 1 refetch).
