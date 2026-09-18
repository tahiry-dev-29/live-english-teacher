# Task 29 — Dynamic Conversation Providers + Per-provider Keys (Unified Registry)

**Status: COMPLETED**
**Priority:** 🔴 High — after Task 20 (auto-save), before Task 27 (validation)


## Goal

Generalize the AI Model tab: **all conversation providers are dynamic**, selected from a single list, with per-provider key entry then model selection discovered with the effective key (user otherwise server). Enforced UI order: **1. provider → 2. key → 3. models**.

## Context (current state)

- Only Groq + Gemini exist (`AiProvider = 'groq' | 'gemini'`, `ApiKeyService` = 2 keys, `AiModelsService` = 2 fetchers).
- The dynamic mechanism already exists (Task 17): effective key = user header otherwise `.env`, `ensureValidSelection()`, Live Sync.
- To generalize: OpenAI, Anthropic, Mistral, DeepSeek, Qwen (+ future) for conversation.

## Provider registry (source of truth, backend)

- `libs/backend/feature-live/src/lib/ai-providers.registry.ts` — **create**: `{ id, label, chatApi: 'openai-compatible' | 'anthropic' | 'google', modelsUrl, keyHeader, keyEnv, consoleUrl, docPath }`.
- Each provider: official discovery endpoint (e.g. OpenAI `GET /v1/models`, Anthropic = curated list since no public endpoint, Mistral `GET /v1/models`, DeepSeek `GET /v1/models`, Qwen/DashScope `GET /compatible-mode/v1/models`).
- `AiModelsService.getModels()` iterates the registry instead of the 2 hardcoded fetchers; curated fallback per provider if no key / API down.
- `AiProviderService` routes to the correct client based on `provider` (shared OpenAI-compatible adapters when possible).

## Per-provider keys (frontend + backend)

- `ApiKeyService`: generic map `customKeys: Record<providerId, string>` (persisted in `localStorage`, e.g. `custom_api_keys` JSON) + backward compatibility with existing groq/gemini; generic `getKeyHeader(providerId)`.
- `AiConfigService`: `provider` = registry id; `fetchModels(providerId?)` → `GET /api/ai/models?provider=<id>` with the provider key header; selection revalidated.
- Backend: generic `x-<provider>-api-key` headers + propagation to inference client; never log keys.
- `message.service.ts` (SSE + GraphQL): sends `provider`, `model`, and the active provider key header.

## AI Model tab UI (auto-save, see Task 20 — no Save)

1. Provider list (registry, with quota/note badge if available).
2. Selected provider key input (show/hide, Clear, console link, tutorial) — persisted with debounce.
3. Discovered models list with effective key + Live Sync + loading state; immediate selection.
4. If no key: server models (badge "Server default") or curated fallback.

## Files

- `libs/backend/feature-live/src/lib/ai-providers.registry.ts` — create
- `libs/backend/feature-live/src/lib/ai-models.service.ts` — registry + generic fetchers
- `libs/backend/feature-live/src/lib/ai-provider.service.ts` — multi-provider routing
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts` — `GET /api/ai/models?provider=`, generic headers
- `libs/backend/feature-live/src/lib/groq-live/groq-live.service.ts`, `gemini-live/gemini-live.service.ts` — adapters (share OpenAI-compatible)
- `apps/frontend/src/app/core/services/api-key.service.ts` — generic map
- `apps/frontend/src/app/core/services/ai-config.service.ts` — provider = registry id
- `apps/frontend/src/app/core/services/message.service.ts` — dynamic provider/model/header
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` — AI Model tab (order 1→2→3)

## Steps

1. Create registry + migrate Groq/Gemini onto it (zero regression).
2. Add OpenAI, Anthropic, Mistral, DeepSeek, Qwen (discovery + curated fallback).
3. Generic frontend keys + backend headers + inference propagation.
4. Redo AI Model tab (1. provider → 2. key → 3. models, auto-save).
5. `fetchModels` per provider + selection revalidation + Live Sync.
6. Build + lint + prettier verify.

## Acceptance Criteria

- [ ] Each provider in the list displays its discovered models with the effective key (user otherwise server)
- [ ] Without key: "Server default" badge or curated fallback, never an empty screen
- [ ] Provider → key → model change applied immediately (auto-save, Task 20)
- [ ] Chat/SSE uses active provider + model + key
- [ ] `nx build frontend` + `nx build backend` without errors, eslint/prettier green
