# Task 31 — Centralized Messages (error / warning / success / log) + zero emoji

**Status: TODO**
**Priority:** Medium

## Goal

Extract **all** runtime messages (error, warning, success, logs) from components/services into a typed constants file, and remove all emoji from messages (including the `⚠️` prefix).
Error rendering must no longer depend on text sniffing (`startsWith('⚠️')`).

## Current State

| Location | Issue |
| --- | --- |
| `core/services/message.service.ts` (323, 376, 417-452) | 8 hardcoded error texts, prefixed `⚠️`; `formatApiError()` logged in the service |
| `chat-room/components/message-item/message-item.component.ts:174` | `isError` derived from text (`startsWith('⚠️')`, `startsWith('Error:')`) |
| `chat-room/components/chat-container/chat-container.component.ts:18` | Duplicated `Message` interface (3rd definition of `Message` name in repo) |
| `chat-room/chat-page.component.html:50-74` | Hardcoded quota banner text + emojis `🔑` `✕` + inline `<svg>` (forbidden by `stack.md`) |
| `chat-room/chat-page.component.ts:305` | Hardcoded fallback phrase |
| `core/services/*` (tts, vad, voice-call, ai-config, elevenlabs) + audio players | ~30 hardcoded `console.*` labels |
| `apps/backend/src/main.ts:38,47` | `🚀` `` in boot logs |
| `libs/backend/feature-live/*` (gemini-live, ai-stream, elevenlabs, openai-compat) | Hardcoded `Logger` messages |
| `libs/data-access-prisma/src/lib/prisma.service.ts:17-29` | DB error message in multi-line ASCII-art |

**Line budget**: `message.service.ts` = **454 lines** (> 200, AGENT.MD "Anti-Spaghetti" rule) → needs splitting.

## Decisions

1. **Frontend constants**: `apps/frontend/src/app/core/constants/messages.ts` →
   `export const MESSAGES = { error, warning, success, log } as const` + derived types
   (`export type ErrorCode = keyof typeof MESSAGES.error`). Import: `@core/constants/messages`.
2. **API error resolution**: extract logic into **pure** function
   `resolveApiErrorCode(raw: string): ErrorCode` in `core/utils/api-error.util.ts`
   (service keeps only `MESSAGES.error[code]`).
3. **Single `ChatMessage` type**: `models/chat-message.model.ts`
   (`role: 'user' | 'ai'`, `text`, `audioData?`, `mimeType?`, `kind?: 'normal' | 'error'`),
   imported by `message.service.ts`, `chat-container`, `message-item` → remove duplicates.
   `models/session.model.ts`: `Message` → **`SessionMessage`** (GraphQL data `role/content/createdAt`)
   to resolve name ambiguity.
4. **Explicit errors**: `kind: 'error'` set at creation;
   `isError = computed(() => this.message().kind === 'error')` → no more text sniffing.
5. **Backend**: `libs/backend/feature-live/src/lib/constants/messages.ts` (+ export via `src/index.ts`)
   for feature-live and `apps/backend/src/main.ts`;
   `libs/data-access-prisma/src/lib/constants/messages.ts` for DB message (ASCII-art → 1 line).
6. **UI Emojis** (rule `stack.md`: lucide SVG only, emojis forbidden in UI):
   `🔑` → `lucideKeyRound`, `✕` → `lucideX`, `<svg xmlns…><path …>` in banner → `lucideTriangleAlert`.
   Language flags (`🇧`…) are **kept**: product content, not a message.
7. **i18n out of scope**: messages stay in English (current behavior); an i18n pass
   (`ai.error.*` in `i18n.service.ts`) can be a follow-up task.

## Steps

1. Create `core/constants/messages.ts`, `core/utils/api-error.util.ts`, `models/chat-message.model.ts`.
2. Split `message.service.ts` (454 lines) → `message.service.ts` (state + send) +
   `chat-stream.service.ts` (SSE + headers); import `MESSAGES` / `kind: 'error'`.
3. `message-item.component.ts`: `isError` based on `kind`; `chat-container`: shared type.
4. `chat-page.component.html/.ts`: banner → `MESSAGES` + lucide icons; fallback → `MESSAGES`.
5. Replace `console.*` labels with `MESSAGES.log`.
6. Backend: feature-live constants + `main.ts` (no emoji) + `prisma.service.ts`.
7. Verifications below.

## Acceptance Criteria

- `rg -nP '[\x{1F300}-\x{1FAFF}]' apps libs --glob '!node_modules'` → 0 emoji (excluding `language.service` flags).
- `rg -n '⚠️' apps libs` → 0 result; `rg -n "startsWith\('Error:'\)" apps libs` → 0 result.
- `rg -n "text: '[A-Z][a-z]+ .{20,}'" apps/frontend/src` → 0 hardcoded user-facing message outside `messages.ts`.
- `wc -l apps/frontend/src/app/core/services/*.ts` → each file ≤ 200 lines.
- `pnpm lint` (4 projects) OK, `npx nx build frontend` OK, `npx nx build backend` OK, `pnpm format:check` OK.

## Extension — Global Error Handling Architecture (Task 32)

> See task `32_error-handling-architecture.md` for detailed breakdown. Task 31 lays the foundation (constants + resolution); Task 32 adds Toast infrastructure + HTTP interceptor + global error handler. Task 32 imports come from `@core/services/notification.service` and `@core/interceptors/error-interceptor.ts`.
