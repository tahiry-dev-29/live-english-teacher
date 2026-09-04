# Task 12 — Templates computed + track stable

**Status: TODO**

## Goal

Supprimer les méthodes appelées depuis les templates et remplacer les `track $index` instables (skill §4/§6).

## Fichiers à créer/modifier

- `apps/frontend/src/app/core/components/voice-control/voice-control-component.ts` (`getProgress()` → `computed`)
- `apps/frontend/src/app/core/components/audio-message-player/audio-message-player-component.ts` (`@for track $index`)
- `apps/frontend/src/app/features/chat-room/components/chat-container/chat-container.component.html` (`@for track $index`)
- `apps/frontend/src/app/core/components/call-interface/call-interface.component.ts` (`@for track $index`, `bars`)

## Étapes

1. `voice-control` : remplacer `getProgress(): number` + `[style.width.%]="getProgress()"` par `protected readonly progress = computed(() => ...)` et binder `progress()` dans le template.
2. Pour chaque `@for (... track $index)` : utiliser un id stable si dispo (ex: `track message.id`, `track voice.name`), sinon documenter en commentaire pourquoi `$index` reste (liste waveform sans id).
3. Vérifier qu'aucun `*ngIf`/`*ngFor` legacy n'est introduit ; garder `@if`/`@for`.
4. Ne pas réintroduire de CSS custom : classes daisyUI existantes inchangées (hors scope PRD V1).

## Critères d'acceptation

- [ ] `rg "getProgress\(\)" apps/frontend/src/app --glob '*.html'` retourne 0
- [ ] Chaque `track $index` restant a un commentaire `<!-- $index volontaire : ... sans id stable -->`
- [ ] `nx run frontend:build` passe
