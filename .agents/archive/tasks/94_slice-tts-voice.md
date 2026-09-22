# Task 94 — Slice frontend `features/tts-voice` (elevenlabs 457, tts 398, tts-cache 220)

**Status:** DONE (exécuté 2026-09-22 — thr-up dev parallèle)
**Plan:** plan-001
**Priority:** 🟡 Moyenne
**Depends:** T91

## Objectif

Regrouper TTS + voix dans `app/features/tts-voice/`, splits < 200 lignes.

## Deplacements (`git mv`)

- `features/tts-tester/*` → `features/tts-voice/tts-tester/`
- `core/services/{tts,tts-audio-cache,elevenlabs-voice,browser-voice,browser-speech}.service.ts` → `features/tts-voice/services/`

## Splits

- elevenlabs-voice 457 → facade <200 + `elevenlabs-catalog.service.ts` + `elevenlabs-audio.util.ts`
- tts.service 398 → facade + `tts-playback.service.ts` + `tts-settings.util.ts`
- tts-audio-cache 220 → service fin + `tts-cache-keys.util.ts`

## Preuves

- `wc -l app/features/tts-voice/**/*` : 0 fichier > 200.
- Tests `browser-speech` + `tts-audio-cache` specs verts, `lint` 0, `build` OK. Smoke : tts-tester joue un echantillon.

---

**✅ Exécuté 2026-09-22 :**
- `git mv` : `tts-tester.component` + 4 services trackés (`tts`, `tts-audio-cache` + spec, `elevenlabs-voice`) vers `features/tts-voice/{tts-tester,services}/` ; `browser-voice`, `browser-speech` (+ spec) déplacés par `mv` simple (fichiers untracked, `git mv` impossible) ; 8 imports réécrits (`@features/tts-voice/...` dans chat-audio, chat-page, chat-voice, settings-tab-voices.{util,component}, voice-live-test, browser-voice-picker) + types `TtsVoice/TtsModel/TtsProviderMeta` désormais importés de `elevenlabs-audio.util`.
- Splits : `elevenlabs-voice` 459→192 (extraction `elevenlabs-catalog.service.ts` 125 — providers/voices/models live — + `elevenlabs-audio.util.ts` 197 — interfaces, KNOWN_TTS_PROVIDERS, body/storage/request helpers) ; `tts.service` 404→199 (extraction `tts-playback.service.ts` 195 — élément HTMLAudio/analyser/progress/viz — + `tts-settings.util.ts` 56 — cleanMarkdown/estimate/downsample/viz-levels) ; `tts-audio-cache` 221→189 (extraction `tts-cache-keys.util.ts` 68 — SHA-256/FNV, TTL/LRU/prune-victims purs — + fix warning lint pré-existant `inject` inutilisé). `browser-*` (131/173) et `tts-tester` (164) déjà < 200, inchangés (template inline conservé). Barils : `services/index.ts` + `tts-tester/index.ts` créés, `tts-voice/index.ts` complété.
- Écarts au plan : (1) `browser-*` déplacés par `mv` et non `git mv` (untracked — probablement créés par travail non committé parallèle) ; (2) imports `ApiKeyService` pointés vers `@features/settings/services/api-key.service` (T95 a déplacé le service pendant l'exécution — chemin coordonné, aucun fichier settings modifié) ; (3) `tts-audio-cache` garde `buildKey()` comme délégation fine (API intacte) ; `TtsPlaybackService.resume()` enrichi (callbacks onStarted/onError) pour préserver la sémantique exacte.
- Preuves : `wc -l` 0 fichier > 200 (max 199 `tts.service`) ; `npx tsc --noEmit -p apps/frontend/tsconfig.app.json` 0 erreur sur le slice (6 erreurs restantes = `features/settings/settings-tab-general.component.ts`, travail T95 en cours) ; `npx eslint apps/frontend/src/app/features/tts-voice` exit 0 ; 0 import `../../`, 0 `CommonModule/FormsModule/ngModel/ngClass`. (`nx test/build` non lancés — consigne, vérification globale après T95.)
-
