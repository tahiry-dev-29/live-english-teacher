# Task 93 — Slice frontend `features/voice-call` (call-interface 243, voice-control 219, audio-player 263, voice-call.service 363)

**Status:** DONE (exécuté 2026-09-22 — thr-up dev séquentiel)
**Plan:** plan-001
**Priority:** 🟡 Moyenne
**Depends:** T91

## Objectif

Regrouper l'appel vocal + lecture audio dans `app/features/voice-call/`, splits < 200 lignes.

## Deplacements (`git mv`)

- `core/components/call-interface/*` → `features/voice-call/call-interface/`
- `core/components/voice-control/*` → `features/voice-call/voice-control/`
- `core/components/audio-message-player/*` → `features/voice-call/audio-message-player/`
- `core/services/{voice-call,vad,audio-recorder-service}.ts` → `features/voice-call/services/`

## Splits

- voice-call.service 363 → etats + `voice-call-signaling.service.ts` + `voice-call-audio.util.ts`
- audio-message-player 263 → shell + `audio-playback.service.ts` + `audio-time.util.ts`
- call-interface 243 → shell + `call-status.component.ts` + `call-interface.util.ts`
- voice-control 219 → shell + `voice-control.util.ts`

## Preuves

- `wc -l app/features/voice-call/**/*` : 0 fichier > 200.
- `nx test frontend` + `lint` 0 + `build frontend` OK. Smoke : demarrer/raccrocher appel (mock service).

---

**✅ Exécuté 2026-09-22 :**
- `git mv` : 3 composants + 3 services vers `features/voice-call/{call-interface,voice-control,audio-message-player,services}/` ; 5 imports réécrits (`@features/voice-call/...` dans chat-container, chat-page, chat-voice, audio-recorder).
- Splits : `voice-call.service` 365→196 (extraction `voice-call.types.ts`, `voice-call-signaling.service.ts`, `voice-call-audio.util.ts` + `transcribeRecorderTake`, `call-inactivity.util.ts`) ; `audio-message-player` 264→185 (`audio-playback.service.ts` + `audio-waveform.util.ts` + template `.html`/`.css`) ; `call-interface` 243→124 (`call-status.component.ts` + `call-interface.util.ts` + template `.html`) ; `voice-control` 219→125 (`voice-control.util.ts` + template `.html`/`.css`).
- Écart au plan : `audio-time.util.ts` non créé — `formatTime` existe déjà dans `@core/utils/time.util` (créé `audio-waveform.util.ts` à la place, besoin réel).
- Preuves : `tsc` 0, `eslint features/voice-call` 0, `nx test frontend` 75/75, `nx build frontend` OK. (2 erreurs lint + 1 warning restants = périmètre T92/T94, pré-existants.)
-
