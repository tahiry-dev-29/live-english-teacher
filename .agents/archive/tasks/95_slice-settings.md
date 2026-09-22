# Task 95 — Slice frontend `features/settings` (settings-dialog 261, tab-general 521, tab-voices 243, tab-tags 216, ai-config 304, theme 312)

**Status:** DONE (exécuté 2026-09-22 — thr-up dev parallèle)
**Plan:** plan-001
**Priority:** 🟠 Haute (7 fichiers flagged)
**Depends:** T91

## Objectif

Migrer tout `core/components/settings-dialog/*` + services config dans `app/features/settings/`, splits < 200 lignes.

## Deplacements (`git mv`)

- `core/components/settings-dialog/*` (12 fichiers : dialog, tabs ai/general/language/memory/tags/voices, grids, pickers, live-tests, utils) → `features/settings/`
- `core/services/{ai-config,theme,language,i18n,api-key}.ts` → `features/settings/services/`

## Splits

- settings-tab-general 521 → shell + `settings-profile-form.component.ts` + `settings-appearance.component.ts` + `settings-general.util.ts`
- settings-dialog 261 → shell + `settings-dialog-state.service.ts`
- settings-tab-voices 243 → shell + extraire `settings-tab-voices.util.ts` (existant, completer)
- settings-tab-tags 216 → shell + `settings-tags.util.ts`
- ai-config 304 → service + `ai-models-catalog.util.ts` + `ai-providers.util.ts`
- theme 312 → service + `theme-tokens.util.ts` + `theme-persistence.service.ts`

## Preuves

- `wc -l app/features/settings/**/*` : 0 fichier > 200 (inclut `settings-tab-voices.util.spec.ts` existant).
- `nx test frontend` vert (spec voices), `lint` 0, `build` OK. Smoke : ouvrir chaque onglet settings.

## Notes d'exécution (2026-09-22 — thr-up dev parallèle, agent T95)

Moves (`git mv`, working tree partagé non commité — uniquement ces fichiers) :
- 14 fichiers `core/components/settings-dialog/` → `features/settings/` (flat, noms conservés), specs incluses.
- 8 fichiers `core/services/{ai-config,theme,language,i18n,api-key}.ts` (+ 3 specs) → `features/settings/services/`.
- `settings-dialog/` vidé puis `rmdir` (vide). Barils : `features/settings/index.ts` (composants + utils + `services/index`), `features/settings/services/index.ts` (9 modules, 0 collision de noms).

Splits (6 fichiers > 200 → tous ≤ 200, specs exclues du budget) :
- settings-tab-general 521 → shell 78 + `.html` 148 + `settings-profile-form` 85 + `settings-appearance` 21 + `.html` 187 + `settings-general.util` 43 (logique pure : langs, presets, size display ; méthodes template → `computed()`).
- settings-dialog 261 → shell 112 + `.html` 106 + `settings-dialog-state.service` 38 (nav `@for`/`@switch` pilotée par `SETTINGS_TABS`, titre via `tabTitle` computed).
- settings-tab-voices 243 → shell 101 + `.html` 130 + util 79→95 (`sttModelOptionsFor` extrait, spec existante intacte).
- settings-tab-tags 216 → shell 90 + `.html` 128 + `settings-tags.util` 27 (`canAddTag`/`normalizeTagName` miroir de PromptTagService ; `[disabled]` → computed).
- ai-config 306 → service 199 + `ai-models-catalog.util` 92 (merge/prune/resolve/selectValidModelId) + `ai-providers.util` 76 (KNOWN_PROVIDERS + resolveActiveProvider) ; wrapper `resolveActiveProvider` supprimé pour passer sous 200.
- theme 312 → service 178 + `theme-tokens.util` 104 (types, FONT_FAMILIES, mappings purs) + `theme-persistence.service` 135 (cookies + migration legacy).
- Max final du slice : 199 (`ai-config.service`), 200 pile : `settings-tab-memory` (inchangé, budget = 0 fichier > 200 OK).

Importeurs réécrits vers `@features/settings/...` : app.config, chat-page, chat-input ×3, chat-send, chat-voice, chat-audio, chat-stream, sidebar, star-background. `KNOWN_PROVIDERS`/`FONT_FAMILIES`/types AiModel/ProviderInfo désormais importés depuis leurs utils (aucun importeur externe — vérifié `rg`). `../utils/cookie.util` → `@core/utils/cookie.util` dans les 3 services. `getInputValue` dupliqué (ai vs voices utils) : baril `settings/index` sélectif (commentaire NOTE).

Preuves : `wc -l` 0 fichier > 200 (hors specs) · `npx tsc --noEmit -p apps/frontend/tsconfig.app.json` exit 0 · `npx eslint apps/frontend/src/app/features/settings` exit 0 · eslint importeurs touchés exit 0. Spec voices non exécutable (pas de vitest) : refactor behavior-preserving (ajout seul dans l'util, 4 fonctions existantes intactes) — à reverdir avec `nx test frontend` en validation croisée.

Écarts : (1) T94 a déplacé `tts-voice/` pendant l'exécution — repointé mes 4 fichiers (`elevenlabs-voice`, `browser-voice/speech`, `tts` + types `TtsVoice/TtsModel/TtsProviderMeta` depuis `elevenlabs-audio.util`) vers `@features/tts-voice/services/...`, zéro conflit (T94 n'a pas touché mes lignes) ; (2) shim `core/services/api-key.service.ts` créé puis supprimé (T94 importait déjà le nouvel alias — vérifié `rg`, 0 référence restante) ; (3) tags `[disabled]` légèrement strictifié (`###` seul → désactivé au lieu de no-op serveur, même résultat observable) ; (4) `nx test`/`nx build` non lancés (consigne).
