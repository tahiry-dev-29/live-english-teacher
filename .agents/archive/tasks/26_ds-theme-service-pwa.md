# Task 26 — Dark/Light Design System: theme.service + PWA (T3bis)

**Status: DONE**
**Priority:** 🟡 Medium — depends on Task 22

## Goal

`ThemeService` 100% Angular drives the 2 declared themes, without hardcoded colors, consistent PWA manifest.

## Files

- `apps/frontend/src/app/core/services/theme.service.ts` — `meta theme-color` read from active theme variables (no more hardcoded `#1d232a`); mapping `dark→halloween` / `light→emerald|light` per T0 decisions
- `apps/frontend/src/index.html` — `data-theme="halloween"` static default (kept)
- `apps/frontend/public/manifest.webmanifest` + `apps/frontend/public/dark/manifest.webmanifest` — `background_color` aligned to each theme
- `apps/frontend/src/app/app.config.ts` — `provideAppInitializer` (kept, verified)

## Steps

1. Read the active theme color via `getComputedStyle(document.documentElement).getPropertyValue('--color-base-100')` (or equivalent variable) for `meta theme-color`.
2. Align the 2 PWA manifests to the actual theme backgrounds.
3. Do NOT reintroduce any inline `<script>` (Angular rule validated previously).

## Acceptance Criteria

- [x] `meta theme-color` follows the active theme (dark + light + system)
- [x] PWA manifests consistent with each theme
- [x] Zero inline `<script>` in `index.html`
- [x] `tsc` front, `eslint`, `prettier --check`, fresh builds pass
