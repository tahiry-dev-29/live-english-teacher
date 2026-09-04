# Task 14 — Vérification finale checklist skill

**Status: TODO**

## Goal

Valider la checklist `New Component` + `Performance Review` du skill sur tout le frontend.

## Fichiers à créer/modifier

- Aucun fichier produit (vérification transverse). Mettre à jour `.agents/memory/decisions.md` avec 1 ligne de leçon si un écart systématique est trouvé.

## Étapes

1. Lancer `nx run-many -t lint` : 0 erreur / 0 warning sur le frontend.
2. Lancer `pnpm exec tsc --noEmit -p apps/frontend/tsconfig.json` : 0 erreur.
3. Lancer `nx run frontend:build` : build production OK.
4. Contrôles grep : `changeDetection: ChangeDetectionStrategy.OnPush` = 18, `\.subscribe\(` sans `takeUntilDestroyed` = 0, méthode appelée en `*.html` = 0, `track $index` résiduel tous justifiés.
5. Ajouter 1 ligne dans `.agents/memory/decisions.md`.

## Critères d'acceptation

- [ ] Les 3 commandes (lint, tsc, build) passent
- [ ] Les 4 contrôles grep sont verts
- [ ] `decisions.md` contient la ligne du jour
