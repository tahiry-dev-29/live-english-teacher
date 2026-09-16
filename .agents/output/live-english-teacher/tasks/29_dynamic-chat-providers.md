# Task 29 — Providers conversation dynamiques + clés par provider (registre unifié)

**Status: TODO**
**Priorité:** 🔴 Haute — après Task 20 (auto-save), avant Task 27 (validation)

## Goal

Généraliser l'onglet AI Model : **tous les providers de conversation sont dynamiques**, sélectionnés depuis une liste unique, avec saisie de clé par provider puis choix du modèle découvert avec la clé effective (utilisateur sinon serveur). Ordre imposé dans l'UI : **1. provider → 2. clé → 3. modèles**.

## Contexte (état actuel)

- Seuls Groq + Gemini existent (`AiProvider = 'groq' | 'gemini'`, `ApiKeyService` = 2 clés, `AiModelsService` = 2 fetchers).
- Le mécanisme dynamique existe déjà (Task 17) : clé effective = header utilisateur sinon `.env`, `ensureValidSelection()`, Live Sync.
- À généraliser : OpenAI, Anthropic, Mistral, DeepSeek, Qwen (+ futurs) pour la conversation.

## Registre providers (source de vérité, backend)

- `libs/backend/feature-live/src/lib/ai-providers.registry.ts` — **créer** : `{ id, label, chatApi: 'openai-compatible' | 'anthropic' | 'google', modelsUrl, keyHeader, keyEnv, consoleUrl, docPath }`.
- Chaque provider : endpoint de découverte officiel (ex. OpenAI `GET /v1/models`, Anthropic = liste curatoriale car pas d'endpoint public, Mistral `GET /v1/models`, DeepSeek `GET /v1/models`, Qwen/DashScope `GET /compatible-mode/v1/models`).
- `AiModelsService.getModels()` itère le registre au lieu des 2 fetchers en dur ; fallback curatoriale par provider si pas de clé / API KO.
- `AiProviderService` route vers le bon client selon `provider` (adaptateurs OpenAI-compatible partagés quand possible).

## Clés par provider (frontend + backend)

- `ApiKeyService` : map générique `customKeys: Record<providerId, string>` (persistée `localStorage`, ex. `custom_api_keys` JSON) + compatibilité ascendante groq/gemini existants ; `getKeyHeader(providerId)` générique.
- `AiConfigService` : `provider` = id du registre ; `fetchModels(providerId?)` → `GET /api/ai/models?provider=<id>` avec le header de clé du provider ; sélection revalidée.
- Backend : headers `x-<provider>-api-key` génériques + propagation au client d'inférence ; jamais de clé en log.
- `message.service.ts` (SSE + GraphQL) : envoie `provider`, `model` et le header de clé du provider actif.

## UI onglet AI Model (auto-save, cf. Task 20 — pas de Save)

1. Liste providers (registre, avec badge quota/notes si dispo).
2. Input clé du provider sélectionné (show/hide, Clear, lien console, tuto) — persistée au debounce.
3. Liste modèles découverts avec la clé effective + Live Sync + état chargement ; sélection immédiate.
4. Si pas de clé : modèles serveur (badge « Server default ») ou fallback curatoriale.

## Fichiers

- `libs/backend/feature-live/src/lib/ai-providers.registry.ts` — créer
- `libs/backend/feature-live/src/lib/ai-models.service.ts` — registre + fetchers génériques
- `libs/backend/feature-live/src/lib/ai-provider.service.ts` — routage multi-providers
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts` — `GET /api/ai/models?provider=`, headers génériques
- `libs/backend/feature-live/src/lib/groq-live/groq-live.service.ts`, `gemini-live/gemini-live.service.ts` — adaptateurs (mutualiser OpenAI-compatible)
- `apps/frontend/src/app/core/services/api-key.service.ts` — map générique
- `apps/frontend/src/app/core/services/ai-config.service.ts` — provider = id registre
- `apps/frontend/src/app/core/services/message.service.ts` — provider/model/header dynamiques
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` — onglet AI Model (ordre 1→2→3)

## Étapes

1. Créer le registre + migrer Groq/Gemini dessus (zéro régression).
2. Ajouter OpenAI, Anthropic, Mistral, DeepSeek, Qwen (découverte + fallback curatoriale).
3. Clés génériques front + headers back + propagation inférence.
4. Refaire l'onglet AI Model (1. provider → 2. clé → 3. modèles, auto-save).
5. `fetchModels` par provider + revalidation sélection + Live Sync.
6. Build + lint + prettier verify.

## Critères d'acceptation

- [ ] Chaque provider de la liste affiche ses modèles découverts avec la clé effective (user sinon serveur)
- [ ] Sans clé : badge « Server default » ou fallback curatoriale, jamais d'écran vide
- [ ] Changement provider → clé → modèle appliqué immédiatement (auto-save, Task 20)
- [ ] Chat/SSE utilise provider + modèle + clé du provider actif
- [ ] `nx build frontend` + `nx build backend` sans erreur, eslint/prettier verts
