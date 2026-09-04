# Task 10 — OnPush + inject() sur 18 composants

**Status: TODO**

## Goal

Passer les 18 `@Component` en `ChangeDetectionStrategy.OnPush` avec `inject()` et visibilité `private`/`protected` + `readonly` (skill angular-best-practices §1).

## Fichiers à créer/modifier

- `apps/frontend/src/app/app.ts`
- `apps/frontend/src/app/features/chat-room/chat-page.component.ts`
- `apps/frontend/src/app/features/chat-room/components/chat-container/chat-container.component.ts`
- `apps/frontend/src/app/features/chat-room/components/chat-container/chat-welcome.component.ts`
- `apps/frontend/src/app/features/chat-room/components/message-item/message-item.component.ts`
- `apps/frontend/src/app/features/chat-room/components/audio-recorder/audio-recorder.ts`
- `apps/frontend/src/app/features/tts-tester/tts-tester.component.ts`
- `apps/frontend/src/app/core/components/chat-input/chat-input.component.ts`
- `apps/frontend/src/app/core/components/call-interface/call-interface.component.ts`
- `apps/frontend/src/app/core/components/sidebar/sidebar-component.ts`
- `apps/frontend/src/app/core/components/sidebar/sidebar-session-list.component.ts`
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts`
- `apps/frontend/src/app/core/components/voice-control/voice-control-component.ts`
- `apps/frontend/src/app/core/components/audio-message-player/audio-message-player-component.ts`
- `apps/frontend/src/app/core/components/star-background/star-background.component.ts`
- `apps/frontend/src/app/core/components/space-illustration/space-illustration.component.ts`
- `apps/frontend/src/app/core/components/user-menu/user-menu-component.ts`
- `apps/frontend/src/app/core/components/not-found-page/not-found-page-component.ts`

## Étapes

1. Ajouter `import { ChangeDetectionStrategy } from '@angular/core'` où manquant.
2. Ajouter `changeDetection: ChangeDetectionStrategy.OnPush` dans chaque `@Component` (garder `standalone: true`).
3. Convertir toute injection par constructeur en `inject()` : `private readonly x = inject(X)` si usage TS seul, `protected readonly x` si utilisé dans le template.
4. Ne pas toucher aux templates dans cette tâche (voir task 12).

## Critères d'acceptation

- [ ] `rg "changeDetection: ChangeDetectionStrategy.OnPush" apps/frontend/src/app | wc -l` retourne 18
- [ ] `rg "constructor\(.*Service" apps/frontend/src/app` retourne 0
- [ ] `pnpm exec tsc --noEmit -p apps/frontend/tsconfig.json` passe avec 0 erreur
