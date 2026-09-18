# Task 23 — Dark/Light Design System: Shell (T1)

**Status: DONE**
**Priority:** 🔴 High — depends on Task 22

## Scope note (cleanup 2026-09-16)

- The shell background (sidebar, overlays) is handled here; the **connected user menu** (real name/email, logout) remains in Task 28 (auth, not design).
- Theme persistence is in the `app_theme` cookie (Task 26), not in DB: no `user_preferences` before auth.

## Goal

All shell elements (sidebar, session list, user-menu, chat page, settings) switch cleanly dark ↔ light ↔ system.

## Files

- `apps/frontend/src/app/core/components/sidebar/sidebar-component.html` — overlays `bg-black/50` → `bg-base-content/40`
- `apps/frontend/src/app/core/components/sidebar/sidebar-session-list.component.html` — same for search-modal + contrast check (file excluded from Prettier 2.8, do not reformat)
- `apps/frontend/src/app/core/components/user-menu/user-menu-component.ts` — avatar gradient tokens (kept, verify light contrast)
- `apps/frontend/src/app/features/chat-room/chat-page.component.html` — mobile header + gradient title (tokens)
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` — `shadow-2xl`, `backdrop-blur` → tokens

## Steps

1. Replace each overlay/hardcoded color with the equivalent token (never `dark:`).
2. Keep `from-primary/to-secondary` gradients (valid tokens in both themes).
3. Keep `span role=button` on the session-list (prior valid HTML fix, do not revert to `<button><div>`).
4. Visual review dark → light → system.

## Acceptance Criteria

- [x] No dark residues in light (overlays, sidebar, modals)
- [x] Session list readable and contrasted in light
- [x] `tsc` front, `eslint`, `prettier --check` (excluding file), fresh builds pass
