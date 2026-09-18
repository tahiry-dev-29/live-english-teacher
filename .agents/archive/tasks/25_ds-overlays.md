# Task 25 — Dark/Light Design System: Overlays (T3)

**Status: DONE**
**Priority:** 🟡 Medium — depends on Task 22

## Goal

Full-screen call, 404, starry background, and local CSS without dark artifacts in light.

## Files

- `apps/frontend/src/app/core/components/call-interface/call-interface.component.ts` — `bg-[radial-gradient(ellipse_at_center,...)]` → halo `bg-primary/10` (token); `bg-base-100`, `bg-success/secondary/warning/base-300` (verify)
- `apps/frontend/src/app/core/components/not-found-page/not-found-page-component.ts` — gradient `from-primary via-secondary to-warning` (tokens, kept) + `btn-primary`
- `apps/frontend/src/app/core/components/star-background/star-background.component.ts` — `bg-white` → conditional hiding in light via `resolvedTheme()` (validated decision)
- `apps/frontend/src/app/core/components/space-illustration/space-illustration.component.ts` — `text-primary`/`text-secondary` (tokens, kept)
- `apps/frontend/src/app/features/chat-room/chat-page.component.css` — hardcoded color audit
- `apps/frontend/src/app/features/chat-room/components/chat-container/chat-container.component.css` — hardcoded color audit

## Steps

1. Remove the only arbitrary `bg-[...]` in the repo (call-interface).
2. Star-background: render stars only in dark theme (input or `resolvedTheme()` read — do not duplicate ThemeService).
3. Verify the 2 local CSS files (zero hardcoded colors expected).

## Acceptance Criteria

- [x] Full-screen call without dark halo in light
- [x] 404 readable and consistent in light
- [x] Zero invisible white stars in light
- [x] `tsc` front, `eslint`, `prettier --check`, fresh builds pass
