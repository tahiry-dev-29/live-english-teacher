# Task 82 — Auto-title on first conversation message

**Status: DONE**
**Priority:** 🟡 Moyen

## Goal

On the first message of a new chat, the AI/app writes the chat title
automatically (like ChatGPT/Gemini).

## Current state (partially done in working tree)

- `chat-page.component.ts`: `generateChatTitle()` (50 chars, capitalised) +
  `renameSession()` on first text/audio message.

## Remaining work

1. Remove the double `sessionsResource.reload()` after rename
   (`renameSession` already reloads internally).
2. Fire-and-forget rename (`void`) so navigation is never blocked by it.

## Acceptance Criteria

- [x] New chat + first message → sidebar shows a meaningful title (< 2 s).
- [x] Single `getSessions` refetch after rename (no duplicate Network call).
- [x] Navigation to `/chat/:id` never waits for the rename.
- [x] `nx build frontend` OK.

---

**Validated 2026-09-21:** `pnpm lint` (4 projects, 0 errors) · `pnpm format:check` clean · `pnpm build` success · `tsc --noEmit -p apps/frontend/tsconfig.app.json` 0 errors · backend unit 78 pass · frontend unit 41 pass · theme-token guard OK.
