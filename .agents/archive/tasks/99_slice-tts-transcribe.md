# Task 99 — Slice backend `tts/` + `transcribe/` (tts-provider 518/spec 638, gemini 216, groq 255, groq-transcribe.spec 256)

**Status:** DONE
**Plan:** plan-001
**Priority:** 🟠 Haute
**Depends:** aucune (parallelisable avec T98/T100)

## Objectif

Finaliser `lib/tts/` et creer `lib/transcribe/` regroupant STT + live providers.

## Deplacements (`git mv`)

- `elevenlabs/elevenlabs.service.ts` → `lib/tts/elevenlabs/`
- `gemini-live/` + `groq-live/` + `groq-transcribe/` → `lib/transcribe/{gemini-live,groq-live,groq-transcribe}/`

## Splits

- `tts-provider.service.ts` 518 → facade <200 + `tts-router.service.ts` + `tts-fallback.util.ts`
- `tts-provider.service.spec.ts` 638 → par provider (`tts-elevenlabs.spec.ts`, `tts-browser.spec.ts`, `tts-fallback.spec.ts`)
- `groq-live.service.ts` 255 → service + `groq-request.util.ts`
- `groq-transcribe.service.spec.ts` 256 → par cas (`ok` / `errors`)
- `gemini-live.service.ts` 216 → service + `gemini-request.util.ts` (garder `gemini-live.util.ts` existant 190)

## Preuves

- `wc -l lib/tts/**/* lib/transcribe/**/*` : 0 fichier > 200.
- `nx test backend` vert, `lint` 0, `build backend` OK.

## Réalisé (2026-09-24)

- Déplacements (`git mv`) : `elevenlabs/` → `tts/elevenlabs/`,
  `gemini-live/`, `groq-live/`, `groq-transcribe/` → `transcribe/*`.
- Splits : `tts-provider.service.ts` 518 → facade 126 + `tts-voices.service.ts` (109)
  + `tts-synthesize.service.ts` (175) + `tts-http.util.ts` + `tts-fallback.util.ts` ;
  `groq-live.service.ts` 255 → 182 + `groq-request.util.ts` ;
  `gemini-live.service.ts` 216 → 167 + `gemini-request.util.ts` ;
  specs 638 → facade 118 + 2 synth (69/89) + fallback util 42 ; transcribe spec 256 → ok 85 + errors 36.
- **Web Speech supprimé** (demande utilisateur) : provider `browser` retiré du registry
  backend + du registry frontend, `TtsService` ne fallback plus vers le navigateur
  (échec = `lastTtsFailed` + `onError` → prompt clé API), `BrowserSpeechService` /
  `BrowserVoiceService` / `browser-voice-picker` / utilitaires supprimés,
  `LanguageService` vidé des voix SpeechSynthesis, `tts-tester` et
  `voice-live-test` rebranchés sur `POST /ai/tts`. Micro live (SpeechRecognition) conservé.
- Tests : backend 85/85 (tts + transcribe + chat-history) · frontend 65/65 · build backend OK.
- Hors périmètre (autre agent, non modifié) : `ai-config-idle.util.ts` casse `tsc` frontend
  (`TS2554`) et `pnpm lint` (1 error `no-empty-function`).
