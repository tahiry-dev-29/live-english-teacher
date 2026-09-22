# Task 99 — Slice backend `tts/` + `transcribe/` (tts-provider 518/spec 638, gemini 216, groq 255, groq-transcribe.spec 256)

**Status:** TODO
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
