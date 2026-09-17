# Task 24 — Design system dark/light : chat (T2)

**Status: DONE**
**Priorité:** 🟡 Moyenne — dépend de Task 22

## Note de périmètre (clean 2026-09-16)

- Le fonctionnel (SSE, retry, menu Copy/Retry/Listen/Fork, parsing Markdown) est en Task 21 ; ici uniquement le **rendu dans les 2 thèmes**.
- `Retry`/`Fork` côté handlers : voir Task 21 (chat-page.component.ts).

## Goal

Bulles, markdown, input, recorder et players audio lisibles et contrastés dans les 2 thèmes.

## Fichiers

- `apps/frontend/src/app/features/chat-room/components/message-item/message-item.component.ts` — `chat-bubble-primary/neutral/error` déjà sémantiques (inchangés) ; vérifier `prose` + code-blocks en light
- `apps/frontend/src/app/features/chat-room/components/chat-container/chat-container.component.html` — typing indicator `bg-base-200` + `backdrop-blur-sm` → token plein
- `apps/frontend/src/app/features/chat-room/components/chat-container/chat-welcome.component.ts` — `bg-base-200`, `text-base-content/40` (vérifier)
- `apps/frontend/src/app/core/components/chat-input/chat-input.component.ts` — `bg-base-300`, `shadow-lg` (vérifier)
- `apps/frontend/src/app/features/chat-room/components/audio-recorder/audio-recorder.ts` — `btn-error`, `bg-base-300 text-error border-error` (vérifier)
- `apps/frontend/src/app/core/components/voice-control/voice-control-component.ts` — `bg-base-200 backdrop-blur-md` → token plein
- `apps/frontend/src/app/core/components/audio-message-player/audio-message-player-component.ts` — `bg-base-200/70 backdrop-blur-sm` → token plein

## Étapes

1. Remplacer les fonds translucides `/70` + `backdrop-blur` par des tokens pleins.
2. Vérifier le contraste du markdown (code, liens) en emerald/light.
3. `loading-dots`, spinners, `btn-*` sémantiques conservés.

## Critères d'acceptation

- [x] Bulles user/IA/erreur contrastées en light
- [x] Markdown (code, bold, listes, liens) lisible en light
- [x] Input, recorder, players sans halo dark en light
- [x] `tsc` front, `eslint`, `prettier --check`, builds frais passent
