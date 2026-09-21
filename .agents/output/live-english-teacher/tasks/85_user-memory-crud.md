# Task 85 — User memory (ChatGPT/Gemini-like)

**Status: DONE**
**Priority:** 🟡 Moyen

## Goal

Each user has their own memory DB, like ChatGPT/Gemini Memories:

- Visible memory list, quota limit (e.g. 50 entries) for healthy usage.
- Full CRUD on memories, minimalist UX.

## Work

1. `memory.service.ts` (`@core/services/`): signals-backed store persisted in
   `localStorage` (key per user, e.g. `lt_memory_<userId|guest>`):
   `list()`, `add(text)`, `update(id, text)`, `remove(id)`, `clear()`;
   `MAX_MEMORIES = 50` (oldest blocked with toast when full).
2. Minimalist UI: "Memory" section (settings dialog, general tab or dedicated
   tab): list + inline add input + edit + delete, counter `n/50`.
3. Wire `NotificationService` for full-limit warning.

## Acceptance Criteria

- [x] Memories persist across reloads; list visible; add/edit/delete work.
- [x] 51st memory blocked with a clear toast; counter displayed.
- [x] Empty state with minimalist hint text.
- [x] `nx build frontend` OK.

---

**Validated 2026-09-21:** `pnpm lint` (4 projects, 0 errors) · `pnpm format:check` clean · `pnpm build` success · `tsc --noEmit -p apps/frontend/tsconfig.app.json` 0 errors · backend unit 78 pass · frontend unit 41 pass · theme-token guard OK.
