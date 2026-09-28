# Task — Angular 20 HTTP refactor

**Status:** TODO  
**Plan:** plan-002  
**Priority:** High  
**Stack:** Angular 20.3.11, `httpResource()`, `HttpClient`, `rxResource()`, `resource()`, Signals

## Goal

Migrer progressivement les accès REST frontend vers l’architecture Angular 20 définie par `.agents/rules/angularv20-http.md`, sans casser le chat SSE, Apollo GraphQL, les TTS, les quotas ou les messages UX.

## Scope

### À faire

- Auditer chaque `fetch()` et chaque `HttpClient` frontend.
- Migrer les GET/read vers `httpResource()` quand l’état est réactif.
- Garder les GET déclenchés par une action en `HttpClient` Observable si la requête ne doit pas charger automatiquement.
- Migrer les POST/PUT/PATCH/DELETE vers des actions explicites `HttpClient`.
- Conserver `fetch()` uniquement pour le flux SSE chat.
- Conserver Apollo pour les opérations GraphQL existantes.
- Centraliser les messages utilisateur dans `libs/shared/constants/messages.ts`.
- Utiliser `HttpErrorResponse` et l’interceptor pour normaliser erreurs réseau, statuts HTTP et corps JSON/string.
- Ajouter les tests Act/Wait/Assert définis dans le plan.

### Hors scope

- Modifier les versions Angular/RxJS.
- Migrer Apollo GraphQL.
- Introduire des subscriptions directes dans les composants.
- Introduire automatiquement `rxResource()` pour toutes les mutations.
- Utiliser la syntaxe Angular 22 `params`.

## Étapes

1. Auditer les services frontend et classer REST/SSE/Apollo.
2. Vérifier les signatures Angular 20 installées pour `httpResource`, `resource`, `rxResource`.
3. Migrer les services GET réactive par priorité : AI models, TTS catalog, user-data.
4. Migrer les actions POST explicites : TTS, transcription, puis mutations user-data.
5. Isoler le parseur SSE et le contract d’erreur du chat.
6. Supprimer les wrappers fetch morts et les états loading/error dupliqués.
7. Tests ciblés, TypeScript, lint, build frontend/backend.

## Acceptance criteria

- [ ] Aucun appel HTTP direct dans un composant.
- [ ] GET réactifs utilisent `httpResource()` ou une justification documentée.
- [ ] Actions HTTP mutations restent explicites.
- [ ] SSE n’est pas converti en Resource.
- [ ] Messages communs issus du fichier partagé.
- [ ] `HttpErrorResponse` est géré par l’interceptor.
- [ ] Tests unitaires et builds passent.

## Fichiers de référence

- `libs/shared/constants/messages.ts`
- `apps/frontend/src/app/core/interceptors/http-error.interceptor.ts`
- `apps/frontend/src/app/core/utils/api-error.util.ts`
- `apps/frontend/src/app/features/settings/services/ai-config.service.ts`
- `apps/frontend/src/app/features/tts-voice/services/elevenlabs-catalog.service.ts`
- `apps/frontend/src/app/features/chat/services/chat-stream.service.ts`
- `apps/frontend/src/app/features/chat/services/chat-audio.service.ts`
- `apps/frontend/src/app/features/user-data/services/`
