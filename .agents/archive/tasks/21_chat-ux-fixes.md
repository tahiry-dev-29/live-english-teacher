# Task 21 — Functional Chat (SSE, Language, Markdown, Errors, Context Menu)

**Status: DONE**
**Priority:** 🔴 High

## Goal

Stabilize the functional side of the chat: SSE streaming, learning language, Markdown rendering, readable errors, context menu. **The dark/light design of these same components is handled in Tasks 24–25 — do not mix the two.**

## 1. Fix SSE Streaming Error

**Problem:** `SSE streaming failed, falling back to GraphQL` — the stream endpoint returns a poorly exposed error.

**Root cause to investigate:**
- `message.service.ts` — `streamViaSSE` throws when `data.error === true`
- Backend `ai-stream.controller.ts` — identify the trigger of the error response

**Files:**
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts` — better error logging
- `apps/frontend/src/app/core/services/message.service.ts` — error handling in `streamViaSSE`

## 2. Sync Learning Language from Chat Input

**Problem:** The language chosen in the chat input dropdown is not taken into account by the AI.

**Requirements:**
- Dropdown chat input → `LanguageService.selectedLanguageCode`
- `MessageService.sendTextMessage` → `targetLanguage` always sent to backend
- Backend `AiProviderService` → `targetLanguage` in the system prompt (via `buildTutorSystemPrompt`)
- **Language persistence in DB**: save session `learningLanguage` in Prisma

**Files:**
- `apps/frontend/src/app/core/services/language.service.ts` — DB persistence
- `apps/frontend/src/app/core/services/message.service.ts` — systematic `targetLanguage`
- `libs/data-access-prisma/src/lib/prisma.service.ts` — verify `learningLanguage` field

## 3. Error Messages — readable handling

**Problem:** Some error messages are displayed raw and unreadable.

**Requirements:**
- All AI errors prefixed with `⚠️`
- `MessageItemComponent` detects `⚠️` → `chat-bubble-error` class
- Truncate long messages to 200 characters max
- "Retry" button on error messages

**Files:**
- `apps/frontend/src/app/features/chat-room/components/message-item/message-item.component.ts` — error detection + retry button
- `apps/frontend/src/app/core/services/message.service.ts` — systematic `⚠️` prefix

## 4. Markdown Rendering with ngx-markdown

**Requirements:**
- `ngx-markdown` package installed and configured
- Replace `innerHTML` parsing with the Markdown renderer in `MessageItemComponent`
- Support: bold, italic, code blocks, lists, links, headings + safe HTML sanitization
- ⚠️ The **markdown contrast in light theme** is verified in Task 24, not here

**Files:**
- `package.json` — `ngx-markdown` dependency
- `apps/frontend/src/app/features/chat-room/components/message-item/message-item.component.ts` — `markdown` component
- `apps/frontend/src/app/app.config.ts` — `provideMarkdown()`

## 5. Context Menu on AI Messages (⋯)

**Requirements:**
- `⋯` button on AI bubbles only
- daisyUI dropdown: **Copy** (clipboard), **Retry** (resends last user message), **Listen** (TTS), **Fork** (new session from this context)

**Files:**
- `apps/frontend/src/app/features/chat-room/components/message-item/message-item.component.ts` — dropdown menu
- `apps/frontend/src/app/features/chat-room/chat-page.component.ts` — retry/fork handlers
- `apps/frontend/src/app/features/chat-room/chat-page.component.html` — handler pass-through

## Steps

1. Fix SSE error handling + logging
2. Sync chat input language → backend + DB persistence
3. Error messages `⚠️` + retry (functional, light styling comes in Task 24)
4. Install/configure ngx-markdown + replace parsing
5. Build context menu + wire actions (copy, retry, listen, fork)
6. Build + lint verify

## Acceptance Criteria

- [x] SSE streaming without inappropriate fallback (or graceful fallback)
- [x] Language choice in chat input → AI responds in that language
- [x] Learning language persisted between sessions
- [x] Errors in `chat-bubble-error` bubbles with retry
- [x] AI responses in Markdown (code, bold, lists…)
- [x] ⋯ menu on AI messages: Copy/Retry/Listen/Fork
- [x] `nx build frontend` + `nx build backend` without errors

## Scope note (cleanup 2026-09-16)

- The former section "3. Theme Dark/Light Persistence + DB Sync" (DB `user_preferences`, DB → localStorage sync) is **removed**: the theme is persisted in the `app_theme` cookie (see Task 26), and there is no authentication to attach DB sync to (see Task 28). Reopen only after auth.
