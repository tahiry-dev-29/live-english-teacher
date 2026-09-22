# Task 86 — User profile info (name, specialization, profession)

**Status: DONE**
**Plan:** plan-001
**Priority:** 🟡 Moyen

## Goal

Store user info (name, specialization, profession) usable for bot memory and UX.

## Work

1. `user-profile.service.ts` (`@core/services/`): signals `displayName`,
   `specialization`, `profession`, persisted in `localStorage`
   (`lt_user_profile`); `updateProfile(partial)` method.
2. Settings dialog (general tab): 3 minimalist fields bound with
   `[value]` + `(input)` (NO FormsModule/ngModel per `stack.md`).
3. `user-menu-component.ts`: show real display name instead of "Guest User"
   when set.
4. Expose `buildProfileContext(): string` (e.g. "User: X, a Y specialised in Z")
   for future memory/prompt injection (tasks 85/87).

## Acceptance Criteria

- [x] Profile persists; user menu shows the display name.
- [x] Empty profile → "Guest User" fallback, no crash.
- [x] `nx build frontend` OK.

---

**Validated 2026-09-21:** `pnpm lint` (4 projects, 0 errors) · `pnpm format:check` clean · `pnpm build` success · `tsc --noEmit -p apps/frontend/tsconfig.app.json` 0 errors · backend unit 78 pass · frontend unit 41 pass · theme-token guard OK.

---

**✅ Enterprise 2026-09-21 :** `UserProfile` en DB (upsert par deviceKey/userId, merge PATCH — jamais d'écrasement), `GET/PUT /api/user/profile`, frontend 100 % backend avec `buildProfileContext()` injecté dans l'envoi. Avatar `user-menu` dynamique (initiale live, plus de `G` hardcodé). Sauvegardes debouncées 500 ms + staging optimiste. Specs : 4 tests backend + 3 frontend, tous verts.
