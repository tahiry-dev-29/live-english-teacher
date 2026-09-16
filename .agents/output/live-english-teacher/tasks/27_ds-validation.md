# Task 27 — Design system dark/light : validation croisée + mémoire (T4)

**Status: TODO**
**Priorité:** 🟢 Basse — dépend de Tasks 22–26

## Goal

Clore le chantier avec une validation complète réellement exécutée et la mémoire à jour.

## Fichiers

- `.agents/memory/decisions.md` — append (couple de thèmes figé, règle tokens-only, exclusion Prettier, script garde-fou)
- Tasks 22–26 — passer `Status: TODO` → `DONE` dans l'ordre, uniquement si critères cochés

## Étapes

1. Re-run complet : `tsc` front + back, `eslint` (0/0 exigé), `prettier --check` ts/html/css, `nx build backend` + `nx build frontend` frais `--skip-nx-cache`.
2. Revue visuelle systématique dark / light / system de chaque composant refactoré.
3. `scripts/check-theme-tokens.mjs` passe sur tout `apps/frontend/src`.
4. Append decisions.md + marquer les 6 tasks DONE.

## Critères d'acceptation

- [ ] Tous les checks ci-dessus verts, exécutés (logs à l'appui, pas approximés)
- [ ] Revue visuelle 3 modes OK sur les 15 composants
- [ ] decisions.md contient : couple de thèmes, règle tokens, exclusion Prettier 2.8, garde-fou prebuild
- [ ] Tasks 22–27 toutes `Status: DONE`
- [ ] Tasks 29–30 (providers) validées avant cette clôture, ou explicitement reportées avec raison tracée
