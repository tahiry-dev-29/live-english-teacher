# Task 22 — Dark/Light Design System: Theme Setup + Guardrail (T0, blocking)

**Status: DONE**
**Priority:** 🔴 High (prerequisite for all other tasks)

## Goal

Declare the light theme in the daisyUI CSS and set up the anti-regression guardrail, without touching any component.

## Context

`apps/frontend/src/styles.css` only declares `halloween`. `ThemeService` sets `data-theme="emerald"` but no emerald variables are generated → light "doesn't work". The custom scrollbar (`#4b5563`) is a fixed dark gray. Decision in visual review: `emerald` (already wired in theme.service.ts) vs `light` official daisyUI.

## Files

- `apps/frontend/src/styles.css` — modify
- `scripts/check-theme-tokens.mjs` — create
- `package.json` or `apps/frontend/project.json` — script prebuild hook
- `.agents/rules/stack.md` — add the tokens-only rule

## Steps

1. `styles.css`: `themes: halloween --default, emerald;` (or `light` depending on review).
2. Scrollbar via tokens: `scrollbar-color: color-mix(in oklch, var(--color-base-content) 30%, transparent) transparent`, thumb `var(--color-base-300)`, hover `color-mix(... 40%)`.
3. Create `scripts/check-theme-tokens.mjs`: blocking grep (exit 1) for `bg-white`, `bg-black`, `bg-[`, `dark:`, `text-gray-`, `bg-gray-`, `from-blue`, `text-blue` in `apps/frontend/src`.
4. Wire the script into prebuild (non-zero exit = build refused).
5. Add the rule in `.agents/rules/stack.md`: colors = daisyUI tokens only, `dark:` forbidden with data-theme.

## Acceptance Criteria

- [x] `npx tsc --noEmit -p apps/frontend/tsconfig.app.json` → 0 errors (executed, not approximated)
- [x] `nx build backend` + `nx build frontend` fresh (`--skip-nx-cache`) pass
- [x] `prettier --check` ts/html/css + `eslint` → 0 errors / 0 warnings
- [x] The guardrail script fails (exit 1) if a test `bg-white` is reintroduced, passes otherwise
