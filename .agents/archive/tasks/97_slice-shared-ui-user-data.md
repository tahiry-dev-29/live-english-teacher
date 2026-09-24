# Task 97 — Slice frontend `shared/ui` (select 225) + `features/user-data`

**Status: DONE (vérifié 2026-09-24 — wc 0>200, specs 19/19, lint slice 0, build OK)**
**Plan:** plan-001
**Priority:** 🟡 Moyenne
**Depends:** T95, T96

## Objectif

Extraire le design system partage + regrouper les services user-data. Apres T95/T96 car `select` est consomme par settings-dialog.

## Deplacements (`git mv`)

- `core/components/ui/{select,dropdown-menu}/*` + `core/components/{toast,star-background,space-illustration}/*` → `shared/ui/`
- `core/components/not-found-page/*` → `shared/not-found-page/` (+ MAJ route `**` dans `app.routes.ts`)
- `core/services/{memory,prompt-tag,user-profile,notification}.service.ts` → `features/user-data/services/`

## Splits

- select 225 → `select.component.ts` (<150) + `select-option.model.ts` + `select-keyboard.util.ts`

## Preuves

- `wc -l app/shared/**/* app/features/user-data/**/*` : 0 fichier > 200.
- Specs `toast`, `notification`, `memory`, `prompt-tag`, `user-profile` verts, `lint` 0, `build` OK.
