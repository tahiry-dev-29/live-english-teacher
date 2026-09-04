# Task 08 — Ajustements UI mobile & recording

**Status: DONE**

## Contexte

4 retours UI à intégrer dans la branch `fix-features-ia-chat`, dans la suite du
refactor daisyUI/halloween. Travail non-commité, en worktree.

## Sous-tâches

### ✅ 77 — UI recording dans l'input pendant l'enregistrement

**Fichier** : `apps/frontend/src/app/core/components/chat-input/chat-input.component.ts`
**Changement** : remplacer le `<input placeholder>` par un UI "Recording…" rouge
(loading-dots + point pulse) quand `isRecording()` est actif.
**Signal** : nouveau input `isRecording = input(false)` sur `ChatInputComponent`,
alimenté depuis `AudioRecorderComponent.recordingStateChange` (nouveau output)
→ `chat-page` via `isAudioRecording = signal(false)`.

### ✅ 78 — Bouton "Live Call" en icône à côté du send sur mobile

**Fichier** : `chat-input.component.ts` (API étendue) + `chat-page.component.ts`
**Changement** : nouveaux input `showLiveButton = input(false)` + `isLiveActive = input(false)`,
et output `liveToggled = output<void>()`. Affiché dans le chat-input avant le send/stop.
Côté chat-page : détection mobile `isMobile = signal(window.innerWidth < 768)`.

### ✅ 79 — Bouton "New +" en haut du mobile (header)

**Fichier** : `chat-page.component.ts` — header mobile `md:hidden`
**Changement** : remplacer le bouton "Start Live Call" (ligne ~97-131) par un
`btn-primary` icône "+" qui appelle `onNewChat()`. Bouton live déplacé dans le chat-input (#78).

### ✅ 80 — Fix double bouton de fermeture du sidebar mobile

**Fichier** : `sidebar-component.ts`
**Changement** : supprimer le bouton `X` mobile (lignes ~59-63) et son SVG.
Garder uniquement le bouton de collapse `>>`.

## Critères d'acceptation

- [ ] `pnpm nx run frontend:build` EXIT=0
- [ ] `pnpm nx run frontend:lint` EXIT=0 (0 erreur, 0 warning)
- [ ] #77 : input affiche UI "Recording…" rouge pendant l'enregistrement
- [ ] #78 : mobile (< 768px), bouton micro à côté du send
- [ ] #79 : mobile header, bouton "+" à droite (pas de Start Live Call)
- [ ] #80 : mobile sidebar, un seul bouton fermer (le `>>` collapse)
- [ ] Tous les nouveaux styles utilisent daisyUI (btn, loading, couleurs sémantiques)
- [ ] Aucun commit créé
- [ ] Tâche 08 documentée en DONE

## Risques

- Agent parallèle (`claude --resume`) a modifié `chat-page`/`sidebar` au tour précédent.
  Re-vérifier l'état des fichiers en début d'exécution. Utiliser des scripts Python
  atomiques si nécessaire (pattern #06).
