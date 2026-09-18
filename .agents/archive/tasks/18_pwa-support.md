# Task 18 — PWA (Progressive Web App) Configuration

**Status: DONE**
**Priority:** 🟡 Medium

## Goal

Transform the frontend application into a Progressive Web App (PWA) installable on mobile and desktop with a web manifest, application icons, and a service worker.

## Files to create/modify

- `apps/frontend/public/manifest.webmanifest`: PWA metadata definition (name, short_name, icons, theme_color, background_color, display standalone).
- `apps/frontend/public/icons/`: Responsive application icons (192x192, 512x512, maskable).
- `apps/frontend/src/index.html`: Links to `manifest.webmanifest`, `apple-touch-icon`, and PWA/viewport meta tags.
- `apps/frontend/src/app/core/services/pwa.service.ts`: Angular service to manage the installation prompt (`beforeinstallprompt`) and service worker updates.
- `apps/frontend/project.json`: Verify that public assets are correctly distributed in the build.

## Steps

1. Generate and configure the `manifest.webmanifest` file with the `halloween` theme (`#1d232a` / `#ff52d9`).
2. Create the `apps/frontend/public/icons` directory with the required icon formats.
3. Integrate the `meta` and `link` tags into `apps/frontend/src/index.html`.
4. Create `PwaService` to expose the `canInstall` signal and the `install()` method.
5. Add a discrete installation button or indicator in the sidebar or settings if `canInstall() === true`.

## Acceptance Criteria

- [ ] `manifest.webmanifest` is valid and accessible from `/manifest.webmanifest`.
- [ ] The application offers installation (PWA installable on Chrome/Brave/Edge/Mobile).
- [ ] `nx run frontend:build` passes without errors.
