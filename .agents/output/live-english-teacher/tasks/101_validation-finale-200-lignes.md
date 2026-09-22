# Task 101 — Validation finale : 0 fichier > 200 lignes + builds verts

**Status:** TODO
**Plan:** plan-001
**Priority:** 🔴 Critique
**Depends:** T92, T93, T94, T95, T96, T97, T98, T99, T100

## Objectif

Prouver que la restructuration par features est terminee et que l'audit `thr-clean-code` est vide.

## Etapes

1. Re-audit complet : `find apps/frontend/src libs/backend/feature-live/src -name "*.ts" | xargs wc -l | awk '$1 > 200'` → attendu : 0 ligne.
2. `pnpm lint` 0 errors · `tsc` 0 · `nx run-many --target=build --all` OK.
3. `nx run-many --target=test --all` vert (frontend vitest + backend unit).
4. `pnpm format:check` OK + `node scripts/check-theme-tokens.mjs` OK.
5. Verifier qu'il ne reste aucun import `../../..` profond ni reference a `core/components/*` ou `core/services/*` (services metier) : `grep -rn "core/components\|core/services" apps/frontend/src --include="*.ts"`.
6. Mettre a jour `.agents/output/live-english-teacher/archi.md` (nouvelle arborescence) + `prd.md` si routes touchees.

## Preuves

- Sortie de l'audit vide collee dans le fichier + builds/tests OK.
- Si un residu > 200 lignes subsiste : creer une task follow-up (pas de depassement silencieux).

## Hors scope

Aucun nouveau code metier. Uniquement validation + docs.
