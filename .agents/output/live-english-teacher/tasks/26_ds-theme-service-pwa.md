# Task 26 — Design system dark/light : theme.service + PWA (T3bis)

**Status: DONE**
**Priorité:** 🟡 Moyenne — dépend de Task 22

## Goal

`ThemeService` 100% Angular pilote les 2 thèmes déclarés, sans couleur codée, manifest PWA cohérent.

## Fichiers

- `apps/frontend/src/app/core/services/theme.service.ts` — `meta theme-color` lue depuis les variables du thème actif (plus de `#1d232a` en dur) ; mapping `dark→halloween` / `light→emerald|light` selon tranches T0
- `apps/frontend/src/index.html` — `data-theme="halloween"` défaut statique (conservé)
- `apps/frontend/public/manifest.webmanifest` + `apps/frontend/public/dark/manifest.webmanifest` — `background_color` alignés sur chaque thème
- `apps/frontend/src/app/app.config.ts` — `provideAppInitializer` (conservé, vérifié)

## Étapes

1. Lire la couleur du thème actif via `getComputedStyle(document.documentElement).getPropertyValue('--color-base-100')` (ou variable équivalente) pour `meta theme-color`.
2. Aligner les 2 manifests PWA sur les fonds réels des thèmes.
3. Ne réintroduire AUCUN `<script>` inline (règle Angular validée précédemment).

## Critères d'acceptation

- [x] `meta theme-color` suit le thème actif (dark + light + system)
- [x] Manifests PWA cohérents avec chaque thème
- [x] Zéro `<script>` inline dans `index.html`
- [x] `tsc` front, `eslint`, `prettier --check`, builds frais passent
