# Task 100 — Slice backend `user-data` + `chat-history` + `tutor` + `shared` (chat-history.spec 392, mock-prisma 253, user-data.controller 202)

**Status:** TODO
**Plan:** plan-001
**Priority:** 🟡 Moyenne
**Depends:** aucune (parallelisable avec T98/T99)

## Objectif

Clore le backend : `chat-history.spec` 392 splitte, `mock-prisma` 253 splitte, `tutor/` et `shared/` crees, `feature-live.module.ts` = assemblage.

## Deplacements (`git mv`)

- `tutor-prompt.ts` → `lib/tutor/`
- `constants/messages.ts` + `dto/` + `testing/mock-prisma.service.ts` → `lib/shared/`
- `chat-history/chat-history.service.spec.ts` → split sur place avant deplacement

## Splits

- `chat-history.service.spec.ts` 392 → par methode (`history-crud.spec.ts`, `history-pagination.spec.ts`)
- `mock-prisma.service.ts` 253 → service + `mock-prisma.factory.ts` + `mock-prisma.seed.ts`
- `user-data.controller.ts` 202 → controller fin + `user-data.dto.ts` (existant, completer) + `user-data-validation.pipe.ts`
- `feature-live.module.ts` : ne garde que des imports de slices (ou re-exports), 0 provider direct

## Preuves

- `wc -l lib/chat-history/**/* lib/user-data/**/* lib/tutor/**/* lib/shared/**/*` : 0 fichier > 200.
- `nx test backend` vert, `lint` 0, `build backend` OK.
