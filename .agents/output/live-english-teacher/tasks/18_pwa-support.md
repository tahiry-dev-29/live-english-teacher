# Task 18 — Configuration PWA (Progressive Web App)

**Status: DONE**
**Priorité:** 🟡 Moyenne

## Goal

Transformer l'application frontend en une Progressive Web App (PWA) installable sur mobile et desktop avec un manifest web, des icônes d'application et un service worker.

## Fichiers à créer/modifier

- `apps/frontend/public/manifest.webmanifest` : Définition des métadonnées PWA (name, short_name, icons, theme_color, background_color, display standalone).
- `apps/frontend/public/icons/` : Icônes d'application responsive (192x192, 512x512, maskable).
- `apps/frontend/src/index.html` : Liens vers `manifest.webmanifest`, `apple-touch-icon` et balises meta PWA/viewport.
- `apps/frontend/src/app/core/services/pwa.service.ts` : Service Angular pour gérer le prompt d'installation (`beforeinstallprompt`) et les mises à jour du service worker.
- `apps/frontend/project.json` : Vérifier que les assets publics sont correctement distribués dans le build.

## Étapes

1. Générer et configurer le fichier `manifest.webmanifest` avec le thème `halloween` (`#1d232a` / `#ff52d9`).
2. Créer le dossier `apps/frontend/public/icons` avec les formats d'icônes requis.
3. Intégrer les balises `meta` et `link` dans `apps/frontend/src/index.html`.
4. Créer `PwaService` pour exposer le signal `canInstall` et la méthode `install()`.
5. Ajouter un bouton ou indicateur discret d'installation dans la sidebar ou les paramètres si `canInstall() === true`.

## Critères d'acceptation

- [ ] `manifest.webmanifest` valide et accessible depuis `/manifest.webmanifest`.
- [ ] L'application propose l'installation (PWA installable sur Chrome/Brave/Edge/Mobile).
- [ ] `nx run frontend:build` passe sans erreur.
