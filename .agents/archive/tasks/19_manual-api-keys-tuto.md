# Task 19 — Manual API Key Management (Groq & Gemini) with Tutorial & Direct Links

**Status: DONE**
**Priority:** 🟡 Medium

## Goal

Allow users to manually enter their own API keys (Groq and Gemini) in the settings dialog, with secure local storage (`localStorage`), step-by-step key acquisition mini-tutorial, and direct links to developer consoles.

## Files created/modified

- `apps/frontend/src/app/core/services/api-key.service.ts`: Angular service managing Groq and Gemini API keys (`localStorage`, reactive signals, HTTP header getters).
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts`: Custom Keys section with secure inputs, password show/hide, clear field button, visual statuses, tutorial accordion, and direct links to Groq Console and Google AI Studio.
- `apps/frontend/src/app/core/services/message.service.ts`: Injection of `x-groq-api-key` and `x-gemini-api-key` headers into SSE requests and GraphQL mutations via `HttpHeaders`.
- `apps/frontend/src/app/core/services/ai-config.service.ts`: Sending custom keys for dynamic discovery of user account models.
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts`: Extraction of API key HTTP headers and propagation to inference and discovery services.
- `libs/backend/feature-live/src/lib/live.resolver.ts`: Extraction of headers from GraphQL context and forwarding to AI providers.
- `libs/backend/feature-live/src/lib/groq-live/groq-live.service.ts`: Priority support for user Groq key.
- `libs/backend/feature-live/src/lib/gemini-live/gemini-live.service.ts`: Priority support for user Gemini key.

## Acceptance Criteria

- [x] The user can enter, test, and clear their own Groq and Gemini API keys.
- [x] The acquisition tutorial is clear, readable with direct links to Google AI Studio and Groq Console.
- [x] If a custom key is entered, it is used with priority during AI requests (SSE stream, GraphQL chat, model discovery).

## Follow-up (provider re-planning 2026-09-16)

- Per-provider keys (order: 1. provider → 2. key → 3. models, all providers) are generalized in **Task 29** (conversation) and **Task 30** (TTS) with generic `custom_api_keys` map (backward compatible with Groq/Gemini).
- Auto-save with debounce (~500 ms) for key inputs is specified in **Task 20**.
