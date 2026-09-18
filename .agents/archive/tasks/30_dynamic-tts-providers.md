# Task 30 — Multi-vendor TTS Providers + Dynamic Voice/Audio Models

**Status: COMPLETED**
**Priority:** 🔴 High — after Task 20 (auto-save), before Task 27 (validation)


## Goal

Full TTS functionality: **the audio provider is chosen from a list**, its key is entered, then **voices and audio models** are dynamically discovered with the effective key. Same enforced order: **1. provider → 2. key → 3. voices/models**.

## Context (current state)

- TTS = ElevenLabs hardcoded (`ElevenLabsService`, 8 hardcoded voices, server `ELEVENLABS_API_KEY`) + Web Speech fallback. No provider choice, no user key, no selectable audio model.
- STT = Groq Whisper `whisper-large-v3-turbo` hardcoded (TFN: fixed model, no choice).

## TTS Provider List (user data, to expose in UI with quotas)

| Vendor | Free Quota/Month | Quality | Notes |
|---|---|---|---|
| Azure Speech | 500,000 characters (free forever) | ⭐⭐⭐⭐⭐ Neural | **Best choice** (quota + natural) |
| Google Cloud | 1 to 4M (depending on voice) | ⭐⭐⭐⭐ fluent | Ultra generous in volume |
| AWS Polly | 1 to 5M | ⭐⭐⭐ correct to very good | Free first 12 months only |
| OpenAI | 0 (paid from 1st character) | ⭐⭐⭐⭐⭐ natural | Blocks quickly without card |
| MiniMax | Limited trial credits | ⭐⭐⭐⭐ | Variable quota |
| ElevenLabs (existing) | account quota | ⭐⭐⭐⭐⭐ | Kept as registry provider |
| Web Speech (browser) | unlimited local | ⭐⭐ depending on OS | Free fallback always available |

## TTS Registry (backend, symmetrical to Task 29 conversation registry)

- `libs/backend/feature-live/src/lib/tts/tts-providers.registry.ts` — **create**: `{ id, label, quotaNote, quality, voicesUrl, keyHeader, keyEnv, consoleUrl, defaultModel }`.
- Router service `TtsProviderService`: `getVoices(providerId, key?)`, `synthesize(providerId, voiceId, modelId?, text, key?)`.
- Adapters: ElevenLabs (existing, wire to registry), Azure (`/cognitiveservices/v1`, key = `Ocp-Apim-Subscription-Key`, voices via `GET /voices/list`), Google (`text:synthesize`, voices via `GET /voices`), AWS Polly (`DescribeVoices` + `SynthesizeSpeech` — SDK or SigV4), OpenAI (`POST /v1/audio/speech`, models `tts-1` / `tts-1-hd`, listed voices), MiniMax (`/v1/t2a_v2`, catalog voices).
- `POST /api/ai/tts` and `GET /api/ai/voices` accept `provider` (+ `modelId`, `voiceId`) and key via header; effective key = header otherwise `.env`; never logged.
- Voice preview (play button) via active provider.

## Frontend

- `TtsProviderService` (or renamed `ElevenLabsVoiceService` extension): `ttsProvider` signal (registry id, persisted), `ttsVoices`, `ttsModels` (if the provider exposes models: OpenAI tts-1/hd, Azure neural…), `fetchTtsVoices(providerId)` with key header.
- `TtsService.speak()`: routes to active provider (ElevenLabs → Azure → Google → Polly → OpenAI → MiniMax → Web Speech fallback), with `providerId`, `voiceId`, `modelId` sent to backend.
- TTS keys in `ApiKeyService` (generic map shared with Task 29, e.g. `custom_api_keys['azure_tts']`).
- Voices tab in dialog: 1. provider (+ quota/quality/notes) → 2. key (+ console/tutorial) → 3. voices + models (auto-save, see Task 20).

## STT (complementary, same effort)

- `GroqTranscribeService`: configurable Whisper model (`whisper-large-v3-turbo` default, other `distil-*` selectable) + user Groq key if provided (existing header).
- Option: expose STT model selection in the Voices tab (small select, auto-save).

## Files

- `libs/backend/feature-live/src/lib/tts/tts-providers.registry.ts` — create
- `libs/backend/feature-live/src/lib/tts/tts-provider.service.ts` — create (router)
- `libs/backend/feature-live/src/lib/tts/providers/*.ts` — adapters (azure, google, polly, openai, minimax, elevenlabs)
- `libs/backend/feature-live/src/lib/elevenlabs/elevenlabs.service.ts` — wire to registry (keep 8 voices as fallback)
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts` — `GET /api/ai/voices?provider=`, `POST /api/ai/tts` (+ provider/modelId)
- `libs/backend/feature-live/src/lib/feature-live.module.ts` — TTS providers
- `libs/backend/feature-live/src/lib/groq-transcribe/groq-transcribe.service.ts` — configurable model + user key
- `apps/frontend/src/app/core/services/api-key.service.ts` — TTS keys (shared map, see Task 29)
- `apps/frontend/src/app/core/services/elevenlabs-voice.service.ts` — generalize to TTS provider (or new service)
- `apps/frontend/src/app/core/services/tts.service.ts` — active provider routing
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` — Voices tab (order 1→2→3)

## Steps

1. TTS registry + router + ElevenLabs wired to it (zero regression).
2. Adapters for Azure, Google, Polly, OpenAI, MiniMax (voices + synthesis + models).
3. Provider-aware voices/tts endpoints + effective keys.
4. Frontend: generalized TTS service + routed `TtsService.speak()` + keys.
5. Voices tab (1. provider → 2. key → 3. voices/models, auto-save) + STT model select.
6. Build + lint + prettier verify.

## Acceptance Criteria

- [ ] Each TTS provider lists its voices (and models) with the effective key; without key: server voices or catalog, never empty
- [ ] Quota/quality/notes displayed per provider (table above)
- [ ] Provider → key → voice/model selection applied immediately (auto-save)
- [ ] `speak()` uses active provider/voice/model; Web Speech fallback if down
- [ ] Configurable Whisper STT model (+ user key if provided)
- [ ] `nx build frontend` + `nx build backend` without errors, eslint/prettier green
