# Task 25 — Design system dark/light : overlays (T3)

**Status: TODO**
**Priorité:** 🟡 Moyenne — dépend de Task 22

## Goal

Plein-écran call, 404, fond étoilé et CSS locaux sans artefact dark en light.

## Fichiers

- `apps/frontend/src/app/core/components/call-interface/call-interface.component.ts` — `bg-[radial-gradient(ellipse_at_center,...)]` → halo `bg-primary/10` (token) ; `bg-base-100`, `bg-success/secondary/warning/base-300` (vérifier)
- `apps/frontend/src/app/core/components/not-found-page/not-found-page-component.ts` — gradient `from-primary via-secondary to-warning` (tokens, conservé) + `btn-primary`
- `apps/frontend/src/app/core/components/star-background/star-background.component.ts` — `bg-white` → masquage conditionnel en light via `resolvedTheme()` (décision validée)
- `apps/frontend/src/app/core/components/space-illustration/space-illustration.component.ts` — `text-primary`/`text-secondary` (tokens, conservés)
- `apps/frontend/src/app/features/chat-room/chat-page.component.css` — audit couleurs dures
- `apps/frontend/src/app/features/chat-room/components/chat-container/chat-container.component.css` — audit couleurs dures

## Étapes

1. Supprimer le seul `bg-[...]` arbitraire du repo (call-interface).
2. Star-background : ne rendre les étoiles qu'en thème dark (input ou lecture `resolvedTheme()` — ne pas dupliquer ThemeService).
3. Vérifier les 2 fichiers CSS locaux (zéro couleur dure attendue).

## Critères d'acceptation

- [ ] Call plein écran sans halo dark en light
- [ ] 404 lisible et cohérente en light
- [ ] Zéro étoile blanche invisible en light
- [ ] `tsc` front, `eslint`, `prettier --check`, builds frais passent
