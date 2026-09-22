# Task 92 — Slice frontend `features/chat` (chat-page 425, message-item 440, chat-input 533)

**Status: IN_PROGRESS (exécuté 2026-09-22 — thr-up dev séquentiel)**
**Plan:** plan-001
**Priority:** 🔴 Critique
**Depends:** T91

## Objectif

Migrer tout le chat dans `app/features/chat/` et splitter les 3 fichiers flagged, chaque morceau < 200 lignes.

## Deplacements (`git mv`)

- `features/chat-room/chat-page.component.*` → `features/chat/chat-page/`
- `features/chat-room/components/chat-container/*` + `chat-welcome.*` → `features/chat/chat-container/`
- `features/chat-room/components/message-item/*` → `features/chat/message-item/`
- `core/components/chat-input/*` → `features/chat/chat-input/` (corrige le couplage inverse vers `@features/chat-room`)
- `features/chat-room/components/audio-recorder/*` → `features/chat/audio-recorder/`
- `core/services/{message,chat,chat-stream,chat-audio}.service.ts` → `features/chat/services/`

## Splits (< 200 lignes chacun)

- chat-input 533 → shell + `chat-input-form.util.ts` + `chat-input-audio.component.ts` + `chat-input-state.service.ts`
- message-item 440 → shell + `message-bubble.component.ts` + `message-actions.component.ts` + `message-content.util.ts`
- chat-page 425 → orchestration + `chat-page-state.service.ts` + `chat-share.util.ts`
- message.service 256 → facade + `message-store.service.ts` + `message-mapper.util.ts`
- `app.routes.ts` : routes `''`, `chat/:sessionId`, `share/:sessionId` → `@features/chat`

## Preuves

- `wc -l app/features/chat/**/*` : 0 fichier > 200.
- `nx test frontend` slice vert, `pnpm lint` 0, `nx build frontend` OK.
- Smoke : envoi message + stream tokens + curseur streaming (spec existante task 90).
