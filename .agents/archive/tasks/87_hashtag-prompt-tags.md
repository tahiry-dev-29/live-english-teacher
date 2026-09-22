# Task 87 — Hashtag skill tags (#correction, #spoken, …) + custom tags CRUD

**Status: DONE**
**Plan:** plan-001
**Priority:** 🟡 Moyen

## Goal

Parameters work like skills/TAGs: typing `#` in the input shows the tag list.
E.g. "Hello today let's #correction vocabulary for real life usage" or
"how to #spoken good morning". Each `#tag` maps to a small system prompt
telling the AI what to do in that chat (pronunciation only, correction only…).

- 15 predefined tags + custom tag tab (add `tag_name` + `description`).
- Full CRUD management of tags.

## Work

1. `prompt-tag.service.ts` (`@core/services/`): 15 predefined tags
   (`{ name, description, systemPrompt }`) + custom tags in `localStorage`;
   CRUD; `extractTags(text): string[]`; `buildSystemPrompt(text): string`.
2. `chat-input.component.ts`: `#` detection in textarea → dropdown list
   (filter as you type, keyboard: ↑/↓/Enter/Esc, click to insert `#name `).
3. Sending: display raw text in bubble, send `raw + system context` to backend
   (`MessageService.sendTextMessage` gains optional enriched payload; backend
   `chat` already accepts free text — prepend `[context: …]` invisibly).
4. Settings dialog: "Tags" tab — list, add (name+description), edit, delete,
   reset-to-defaults.

## Acceptance Criteria

- [x] Typing `#` opens the tag list; filtering + insertion work by keyboard/mouse.
- [x] Message with `#correction` changes AI behaviour (system prompt injected).
- [x] Custom tag CRUD persists; 15 defaults restorable.
- [x] `nx build frontend` OK.

---

**Validated 2026-09-21:** `pnpm lint` (4 projects, 0 errors) · `pnpm format:check` clean · `pnpm build` success · `tsc --noEmit -p apps/frontend/tsconfig.app.json` 0 errors · backend unit 78 pass · frontend unit 41 pass · theme-token guard OK.

---

**✅ Enterprise 2026-09-21 :** `PromptTag` en DB (custom seuls, `@@unique(deviceKey, name)`), 15 built-ins = source unique `prompt-tags.defaults.ts` servie par `GET /api/user/tags`, CRUD + reset via `/api/user/tags/*` (conflit built-in/doublon → 409). Frontend 100 % backend (`ensureLoaded` + suggest synchrone). Preuve live : 15 defaults reçus du PG. Specs : 5 tests backend + 3 frontend, tous verts.
