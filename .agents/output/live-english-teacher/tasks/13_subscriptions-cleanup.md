# Task 13 — Cleanup subscriptions takeUntilDestroyed

**Status: TODO**

## Goal

Éliminer le seul `subscribe` manuel restant via `takeUntilDestroyed` ou `toSignal` (skill §8).

## Fichiers à créer/modifier

- `apps/frontend/src/app/features/chat-room/chat-page.component.ts` (`route.params.subscribe` ligne ~70)

## Étapes

1. Ajouter `private destroyRef = inject(DestroyRef)` dans `ChatPageComponent`.
2. Remplacer `this.route.params.subscribe(...)` par `this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...)` (import depuis `@angular/core/rxjs-interop`), ou `toSignal(this.route.params)` si le flux convient.
3. Vérifier qu'aucun autre `.subscribe(` manuel ne subsiste : `rg "\.subscribe\(" apps/frontend/src/app`.

## Critères d'acceptation

- [ ] `rg "\.subscribe\(" apps/frontend/src/app` : 0 sans `takeUntilDestroyed`, ou cas documentés uniquement
- [ ] Navigation `/chat` → `/chat/:sessionId` charge toujours la session (test manuel : 2 sessions successives)
- [ ] `pnpm exec tsc --noEmit -p apps/frontend/tsconfig.json` passe avec 0 erreur
