# Task 22 — Design system dark/light : setup thèmes + garde-fou (T0, bloquant)

**Status: TODO**
**Priorité:** 🔴 Haute (prérequis de tout le chantier)

## Goal

Déclarer le thème light dans le CSS daisyUI et mettre en place le garde-fou anti-régression, sans toucher à aucun composant.

## Contexte

`apps/frontend/src/styles.css` ne déclare que `halloween`. `ThemeService` pose `data-theme="emerald"` mais aucune variable emerald n'est générée → le light « ne marche pas ». La scrollbar custom (`#4b5563`) est un gris dark fixe. Tranche en revue visuelle : `emerald` (déjà câblé dans theme.service.ts) vs `light` officiel daisyUI.

## Fichiers

- `apps/frontend/src/styles.css` — modifier
- `scripts/check-theme-tokens.mjs` — créer
- `package.json` ou `apps/frontend/project.json` — hook prebuild du script
- `.agents/rules/stack.md` — ajouter la règle tokens-only

## Étapes

1. `styles.css` : `themes: halloween --default, emerald;` (ou `light` selon revue).
2. Scrollbar via tokens : `scrollbar-color: color-mix(in oklch, var(--color-base-content) 30%, transparent) transparent`, thumb `var(--color-base-300)`, hover `color-mix(... 40%)`.
3. Créer `scripts/check-theme-tokens.mjs` : grep bloquant (exit 1) sur `bg-white`, `bg-black`, `bg-[`, `dark:`, `text-gray-`, `bg-gray-`, `from-blue`, `text-blue` dans `apps/frontend/src`.
4. Brancher le script en prebuild (sortie non-zéro = build refusé).
5. Ajouter la règle dans `.agents/rules/stack.md` : couleurs = tokens daisyUI uniquement, `dark:` interdit avec data-theme.

## Critères d'acceptation

- [ ] `npx tsc --noEmit -p apps/frontend/tsconfig.app.json` → 0 erreur (exécuté, pas approximé)
- [ ] `nx build backend` + `nx build frontend` frais (`--skip-nx-cache`) passent
- [ ] `prettier --check` ts/html/css + `eslint` → 0 erreur / 0 warning
- [ ] Le script garde-fou échoue (exit 1) si on réintroduit un `bg-white` test, passe sinon
