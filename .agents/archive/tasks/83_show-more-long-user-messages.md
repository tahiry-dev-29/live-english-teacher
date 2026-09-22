# Task 83 — Show more/less on long user messages (+5 lines)

**Status: DONE**
**Priority:** 🟡 Moyen

## Goal

In `app-root > app-chat-page > main > app-chat-container >
div.min-w-0.flex-1.overflow-x-hidden.overflow-y-auto.scroll-smooth`,
user bubbles longer than 5 lines are clamped with a "Show more / Show less" toggle.

## Work

1. `message-item.component.ts` (user bubble only):
   - `showFullUserText = signal(false)`, `line-clamp-5` when collapsed.
   - Toggle button under the bubble ("Show more" / "Show less", daisyUI
     `btn-ghost btn-xs`, lucide `ChevronDown/ChevronUp`).
   - Show the toggle only when content overflows (> 5 lines): measure
     `scrollHeight > clientHeight` via `viewChild` + `afterRender`/`effect`.
2. AI messages untouched.

## Acceptance Criteria

- [x] Short user message → no toggle, no clamp.
- [x] Long user message → clamped to 5 lines + toggle expands/collapses.
- [x] No layout shift of neighbouring messages when toggling.
- [x] `nx build frontend` OK.

---

**Validated 2026-09-21:** `pnpm lint` (4 projects, 0 errors) · `pnpm format:check` clean · `pnpm build` success · `tsc --noEmit -p apps/frontend/tsconfig.app.json` 0 errors · backend unit 78 pass · frontend unit 41 pass · theme-token guard OK.
