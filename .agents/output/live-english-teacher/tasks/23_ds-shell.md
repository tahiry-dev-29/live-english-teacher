# Task 23 — Design system dark/light : shell (T1)

**Status: DONE**
**Priorité:** 🔴 Haute — dépend de Task 22

## Note de périmètre (clean 2026-09-16)

- Le fond du shell (sidebar, overlays) est traité ici ; le **menu utilisateur connecté** (nom/email réels, logout) reste en Task 28 (auth, pas de design).
- La persistance du thème est en cookie `app_theme` (Task 26), pas en DB : pas de `user_preferences` avant l'auth.

## Goal

Tous les éléments du shell (sidebar, liste sessions, user-menu, page chat, settings) basculent proprement dark ↔ light ↔ system.

## Fichiers

- `apps/frontend/src/app/core/components/sidebar/sidebar-component.html` — overlays `bg-black/50` → `bg-base-content/40`
- `apps/frontend/src/app/core/components/sidebar/sidebar-session-list.component.html` — idem search-modal + vérif contraste (fichier exclu de Prettier 2.8, ne pas reformater)
- `apps/frontend/src/app/core/components/user-menu/user-menu-component.ts` — avatar gradient tokens (conservé, vérifier contraste light)
- `apps/frontend/src/app/features/chat-room/chat-page.component.html` — header mobile + titre gradient (tokens)
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` — `shadow-2xl`, `backdrop-blur` → tokens

## Étapes

1. Remplacer chaque overlay/couleur dure par le token équivalent (jamais de `dark:`).
2. Conserver les gradients `from-primary/to-secondary` (tokens valides dans les 2 thèmes).
3. Garder `span role=button` de la session-list (fix HTML valide antérieur, ne pas revenir à `<button><div>`).
4. Revue visuelle dark → light → system.

## Critères d'acceptation

- [x] Aucun résidu sombre en light (overlays, sidebar, modale)
- [x] Liste sessions lisible et contrastée en light
- [x] `tsc` front, `eslint`, `prettier --check` (hors fichier exclu), builds frais passent
