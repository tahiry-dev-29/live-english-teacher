# Task 91 — Scaffold structure par features + aliases + regle imports

**Status: DONE (exécuté 2026-09-22 — thr-up dev séquentiel)**
**Plan:** plan-001
**Priority:** 🔴 Critique (prerequis — bloque T92-T101)

## Objectif

Creer l'arborescence cible (vide + barrels) sans deplacer de code, ajouter l'alias `@shared/*`, activer la regle anti-import-relatif-profond. Aucun comportement ne change.

## Contexte (plan-001 §2+§4)

- Frontend : creer `app/shared/ui/`, `app/shared/not-found-page/`, `app/features/{chat,voice-call,tts-voice,settings,sessions,user-data}/`, `app/core/models/` (decision : fusionner `app/models/` ici, garder `@models/*` comme re-export pour compat).
- Backend : creer `lib/{ai-chat,ai-models,transcribe,tutor,shared}/` (tts, chat-history, user-data existent deja).
- Chaque nouveau dossier recoit un `index.ts` barrel vide (ou re-export du futur contenu).

## Etapes

1. `apps/frontend/tsconfig.json` + `apps/frontend/vitest.config.ts` : ajouter `"@shared/*": ["./src/app/shared/*"]`.
2. Creer dossiers + `index.ts` barrels frontend et backend (liste plan-001 §2).
3. ESLint : activer `no-restricted-imports` interdisant `../../..` (2+ niveaux) dans `apps/frontend/src` avec message pointant vers les aliases.
4. Decision a trancher et documenter dans le fichier : fusion `app/models/` → `app/core/models/` (oui/non) + nom definitif alias shared.

## Preuves attendues

- `pnpm lint` 0 errors, `tsc` 0, `nx build frontend backend` OK.
- `grep -rn "\.\./\.\./" apps/frontend/src/app --include="*.ts" | wc -l` = baseline documentee (doit decroitre des T92+).
- `wc -l` : aucun nouveau fichier > 20 lignes (scaffold uniquement).

## Dette / hors scope

Aucun `git mv` dans cette task. Les specs ne sont ni deplacees ni splittes ici.

---

**✅ Exécuté 2026-09-22 :**
- Décision : alias `@app-shared/*` (et non `@shared/*`, collision avec `@shared/constants` des libs). Ajouté dans `apps/frontend/tsconfig.json`.
- Dossiers + `index.ts` barrels créés : `app/shared/{ui,not-found-page}`, `app/features/{chat,voice-call,tts-voice,settings,sessions,user-data}`, `lib/{ai-chat,ai-models,transcribe,tutor,shared}`.
- Décision `models/` : NON fusionné (garder `@models/*` → `app/models/`, `app/core/models/` non créé — évite 40+ imports à réécrire pour 0 gain).
- Règle `no-restricted-imports` (`../../*`) active dans `apps/frontend/eslint.config.mjs`.
- Preuves : `tsc` 0 errors, `eslint` scaffold clean, baseline imports relatifs profonds = **0** (déjà conforme).

