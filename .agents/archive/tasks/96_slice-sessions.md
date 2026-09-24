# Task 96 — Slice frontend `features/sessions` (sidebar-list 226, share-dialog 235, user-menu)

**Status:** DONE (verified 2026-09-24 — wc 0>200, lint 0, build OK, smoke: sessions list + search + share)
**Plan:** plan-001
**Priority:** 🟡 Moyenne
**Depends:** T91

## Objectif

Regrouper sessions/partage dans `app/features/sessions/`, splits < 200 lignes.

## Deplacements (`git mv`)

- `core/components/sidebar/*` (component, search-modal, session-list) → `features/sessions/sidebar/`
- `core/components/share-dialog/*` → `features/sessions/share-dialog/`
- `core/components/user-menu/*` → `features/sessions/user-menu/`

## Splits

- sidebar-session-list 226 → shell + `session-list-item.component.ts` + `session-filter.util.ts`
- share-dialog 235 → shell + `share-link.util.ts` (+ `share-dialog.service.ts` si etat > 50 lignes)

## Preuves

- `wc -l app/features/sessions/**/*` : 0 fichier > 200.
- `lint` 0, `build` OK. Smoke : liste sessions + recherche + lien partage.
