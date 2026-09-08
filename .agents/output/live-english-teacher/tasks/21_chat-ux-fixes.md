# Task 21 — Chat UX Fixes + Markdown Rendering + Context Menu

**Status: TODO**
**Priorité:** 🔴 Haute

## Goal

Fix SSE streaming error, sync learning language from chat input to chat content, persist theme/language to localStorage + DB, render AI responses as Markdown, and add a context menu (Copy, Retry, Listen, Fork) on AI messages.

## 1. Fix SSE Streaming Error

**Problem:** `SSE streaming failed, falling back to GraphQL` — the stream endpoint returns an error but the error isn't properly surfaced.

**Root cause to investigate:**
- `message.service.ts:228` — `streamViaSSE` throws when `data.error === true`
- Backend `ai-stream.controller.ts` — check what triggers the error response
- The error message "I'm experiencing connectivity issues" should be replaced with a user-friendly daisyUI chat bubble (⚠️ prefix)

**Files:**
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts` — Add better error logging
- `apps/frontend/src/app/core/services/message.service.ts` — Improve error handling in `streamViaSSE`

## 2. Sync Learning Language from Chat Input

**Problem:** When user selects a language from the chat input dropdown, the AI doesn't know which language to speak.

**Requirements:**
- Chat input language dropdown → updates `LanguageService.selectedLanguageCode`
- `MessageService.sendTextMessage` → send `targetLanguage` to backend (already done)
- Backend `AiProviderService` → uses `targetLanguage` in system prompt (already done via `buildTutorSystemPrompt`)
- **Persist language to DB**: when user changes learning language, save it to the session in Prisma

**Files:**
- `apps/frontend/src/app/core/services/language.service.ts` — Add DB persistence
- `apps/frontend/src/app/core/services/message.service.ts` — Ensure `targetLanguage` is always sent
- `libs/data-access-prisma/src/lib/prisma.service.ts` — Verify session has `learningLanguage` field

## 3. Theme Dark/Light Persistence + DB Sync

**Requirements:**
- ThemeService already persists to localStorage ✅
- Add DB persistence for theme preference (user profile)
- On login/load, sync DB → localStorage → apply theme

**Files:**
- `apps/frontend/src/app/core/services/theme.service.ts` — Add DB sync
- Backend: Create `user_preferences` table or extend session model

## 4. Error Messages — Unreadable Message Handling

**Problem:** Some error messages are displayed raw and unreadable.

**Requirements:**
- All AI error responses start with `⚠️` prefix
- MessageItemComponent detects `⚠️` prefix → uses `chat-bubble-error` class
- Truncate long error messages to 200 chars max
- Add a "Retry" button on error messages

**Files:**
- `apps/frontend/src/app/features/chat-room/components/message-item/message-item.component.ts` — Add error detection + retry button
- `apps/frontend/src/app/core/services/message.service.ts` — Ensure all errors use `⚠️` prefix

## 5. Markdown Rendering with ngx-markdown

**Requirements:**
- Install `ngx-markdown` package
- Replace `innerHTML` markdown parsing in MessageItemComponent with proper Markdown renderer
- Support: bold, italic, code blocks, lists, links, headers
- Safe HTML sanitization

**Files:**
- `package.json` — Add `ngx-markdown` dependency
- `apps/frontend/src/app/features/chat-room/components/message-item/message-item.component.ts` — Use `markdown` component
- `apps/frontend/src/app/app.config.ts` — Provide `MarkdownService`

## 6. Context Menu on AI Messages (⋯ menu)

**Requirements:**
- Add `⋯` (three dots) button on AI message bubbles
- Opens a dropdown with actions:
  - **Copy** — Copy message text to clipboard
  - **Retry** — Re-send the last user message
  - **Listen** — Play TTS of the message
  - **Fork** — Create new session from this message context
- Use daisyUI `dropdown` component
- Only show on AI messages (not user messages)

**Files:**
- `apps/frontend/src/app/features/chat-room/components/message-item/message-item.component.ts` — Add dropdown menu
- `apps/frontend/src/app/features/chat-room/chat-page.component.ts` — Handle retry/fork actions
- `apps/frontend/src/app/features/chat-room/chat-page.component.html` — Pass handlers

## Étapes

1. Fix SSE error handling + logging
2. Sync learning language from chat input to backend
3. Add theme persistence (localStorage + DB structure)
4. Improve error messages with ⚠️ prefix + retry button
5. Install ngx-markdown + configure
6. Replace markdown parsing with ngx-markdown component
7. Build context menu component with dropdown
8. Wire context menu actions (copy, retry, listen, fork)
9. Build + lint verify

## Critères d'acceptation

- [ ] SSE streaming works without fallback to GraphQL (or graceful fallback)
- [ ] Selecting language in chat input → AI responds in that language
- [ ] Theme persists across page reloads (localStorage)
- [ ] Learning language persists across sessions
- [ ] Error messages display as daisyUI error chat bubbles with retry
- [ ] AI responses render Markdown (code blocks, bold, lists, etc.)
- [ ] Context menu (⋯) appears on AI messages with Copy/Retry/Listen/Fork
- [ ] `nx build frontend` + `nx build backend` pass without errors
