# Task 17 — AI Model Selector (Groq / Gemini) in Settings

**Status: DONE**
**Priority:** 🟡 Medium

## Goal

Allow the user to choose the AI model (e.g.: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `gemini-2.5-flash`, etc.) from the settings configuration modal (`SettingsDialogComponent`), with client-side persistence and forwarding to chat/stream requests.

## Response: yes, the list is dynamic (conversation)

- `GET /api/ai/models` (`AiModelsService`) queries the official APIs **with the effective key = user key (header `x-groq-api-key` / `x-gemini-api-key`) if provided, otherwise server `.env` key**. So the list reflects the account/quotas tied to the active key.
- `AiConfigService.fetchModels()` sends the provided key headers; `ensureValidSelection()` falls back to a valid model if the selection no longer exists; Live Sync button to refresh.
- Fallback: 2 Groq models + 2 Gemini hardcoded if no key / API down.

## Files created/modified

- `libs/backend/feature-live/src/lib/ai-models.service.ts`: Backend service performing dynamic discovery of active models via the official Groq (`/openai/v1/models`) and Google Gemini (`/v1beta/models`) APIs with automatic fallback.
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts`: `GET /api/ai/models` endpoint supporting custom key headers.
- `apps/frontend/src/app/core/services/ai-config.service.ts`: Service managing dynamic synchronization (`fetchModels`), obsolete model detection, and automatic fallback.
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts`: AI Model section with Live Sync button (`LucideRotateCw`), loading state, and persistent selection.
- `apps/frontend/src/app/core/services/message.service.ts`: Dynamic forwarding of the model and keys in SSE streams and GraphQL requests.
- `libs/backend/feature-live/src/lib/ai-provider.service.ts`: Model and provider support per request.

## Acceptance Criteria

- [x] The user can change the provider and model in the settings dialog.
- [x] Available models are dynamically discovered from providers (Groq and Gemini) to avoid obsolete models.
- [x] A Live Sync button allows real-time refresh of the active models list associated with API keys.
- [x] The change persists after page reload (`localStorage`).
- [x] Chat messages use the selected model during streaming.

## Follow-up (provider re-planning 2026-09-16)

- Multi-provider conversation generalization (OpenAI, Anthropic, Mistral, DeepSeek, Qwen…) is re-planned in **Task 29** (dynamic registry, enforced order: 1. provider → 2. key → 3. models). The keys entered here (Groq/Gemini) are carried over into the generic map (backward compatible).
- Auto-save of the dialog (removing Save/Cancel) is in **Task 20** and also applies to this tab.
