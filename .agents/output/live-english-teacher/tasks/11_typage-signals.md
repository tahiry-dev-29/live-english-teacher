# Task 11 — Typage explicite input/signal/output/computed/model

**Status: TODO**

## Goal

Typer explicitement tous les `input`/`signal`/`output`/`model`/`computed`/`viewChild` avec générique + `readonly` et visibilité correcte (skill §1/§7).

## Fichiers à créer/modifier

- `apps/frontend/src/app/features/chat-room/components/chat-container/chat-container.component.ts` (ex: `messages`, `loading`, `showScrollButton`)
- `apps/frontend/src/app/core/components/chat-input/chat-input.component.ts` (ex: `value`, `disabled`, `audioRecorder`)
- `apps/frontend/src/app/features/chat-room/chat-page.component.ts` (ex: `isLiveMode`, `sessions`, `currentSession`)
- `apps/frontend/src/app/core/components/sidebar/sidebar-session-list.component.ts` (ex: `sessions`, `editingSessionId`)
- Tous les autres composants avec `signal()`/`input()` non typés relevés par grep (voir étape 1)

## Étapes

1. Lister les cas : `rg "=(input|signal|output|model|computed|viewChild)\(" apps/frontend/src/app`.
2. Appliquer : `readonly nom = input<Type>(default)`, `readonly nom = input.required<Type>()`, `readonly nom = output<Type>()`, `readonly nom = model<Type>(default)`, `protected/private readonly nom = signal<Type>(init)`, `protected/private readonly nom = computed<Type>(...)`, `protected/private readonly x = viewChild<Type>(...)`.
3. Règle visibilité : `public readonly` pour `input`/`output`/`model` (API), `protected readonly` si lu dans le template, `private readonly` si TS seul. Méthodes : ajouter `: void` / `: Promise<void>` manquants.
4. Respecter `AGENT.MD` : pas de `any`, pas de `as`, pas de `!`.

## Critères d'acceptation

- [ ] `rg "=(input|signal)\((false|true|0|''|\[\])\)" apps/frontend/src/app` retourne 0 (plus aucun générique implicite)
- [ ] Plus aucune déclaration `input`/`signal`/`output` sans `readonly` + visibilité
- [ ] `pnpm exec tsc --noEmit -p apps/frontend/tsconfig.json` passe avec 0 erreur
