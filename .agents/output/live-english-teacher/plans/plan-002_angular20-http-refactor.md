Plan-ID: plan-002

# Plan 002 — Refactorisation Angular 20 HTTP

**Projet:** live-english-teacher  
**Déclencheur:** migration des accès REST frontend vers les conventions Angular 20  
**Stack:** Angular 20.3.11, `HttpClient`, Resource API expérimentale Angular 20 (`request`, pas `params`), Signals, RxJS  
**Règle source:** `.agents/rules/angularv20-http.md`  
**Destination:** fichiers locaux

## 1. Current state

Le workspace contient déjà `provideHttpClient()` et un interceptor HTTP fonctionnel, mais les couches data ne sont pas homogènes :

- les appels GET TTS ont été migrés récemment vers `HttpClient` + `firstValueFrom()`, mais restent pilotés manuellement par des méthodes et des signaux loading/error ;
- les services user-data, TTS et audio utilisent encore `fetch()` pour plusieurs endpoints REST ;
- le chat SSE utilise volontairement `fetch()` car le flux doit être lu par `ReadableStream` ;
- les appels mutations POST restent des actions explicites et ne doivent pas devenir des ressources GET automatiques ;
- les messages utilisateur communs sont centralisés dans `libs/shared/constants/messages.ts`, mais les anciens textes frontend/backend doivent être traités et éviter les duplications.

## 2. Target architecture

```text
Component / orchestration
        │ inject()
        ▼
Feature API service
        ├── httpResource()       → GET/read state
        ├── HttpClient Observable → explicit actions POST/PUT/PATCH/DELETE
        ├── resource()            → generic async non-HTTP read
        └── SSE transport service → fetch + ReadableStream
                │
                ▼
           Backend REST
```

### Service boundaries

Chaque feature possède un service API ou une frontière API dédiée. Les composants ne doivent injecter ni `HttpClient` ni construire d’URL.

- `features/settings/services/ai-config.service.ts`
  - GET `/ai/models` : `httpResource()` si l’état est réactif ;
  - conserver les providers/cookies comme état de présentation local.
- `features/tts-voice/services/elevenlabs-catalog.service.ts`
  - GET `/ai/tts-providers` : `httpResource()` ou ressource GET compatible Angular 20 ;
  - GET `/ai/voices` et `/ai/tts-models` : ressources dépendantes du provider/key, ou actions GET explicites si la requête dépend d’un événement utilisateur ;
  - POST `/ai/tts` : action Observable explicite.
- `features/user-data/services/*`
  - GET profils/mémoires/tags : `httpResource()` ;
  - POST/PATCH/DELETE : actions `HttpClient` explicites.
- `features/chat/services/chat-stream.service.ts`
  - conserver `fetch()` uniquement pour SSE ;
  - parser les événements `data:`, `errorCode`, `message`, `provider` ;
  - ne pas transformer le stream en mutation/resource.
- `features/chat/services/chat-audio.service.ts`
  - transcription POST : `HttpClient.post()` explicite ;
  - conserver la mutation GraphQL Apollo séparée.

## 3. Angular 20 API rules

- Version vérifiée : `@angular/core` `20.3.11`.
- Pour `resource()` / `rxResource()`, utiliser la signature Angular 20 avec `request`, jamais la syntaxe Angular 22 `params`.
- GET dépendant de Signals : `httpResource()` avec request factory.
- GET non réactif ou déclenché par une action : `HttpClient` Observable, car il ne doit pas charger au construction.
- POST/PUT/PATCH/DELETE : actions explicites, jamais un Resource qui s’exécute automatiquement quand un Signal change.
- Les appels de service doivent utiliser `firstValueFrom()` seulement à la frontière d’une API Promise existante, pas pour masquer une mauvaise architecture.
- Les composants consomment `.value()`, `.isLoading()`, `.error()` et les actions du service ; ils ne dupliquent pas ces états.


## 4. Error contract

Le contrat partagé doit être la source unique des textes utilisateur :

```ts
import { SHARED_MESSAGES } from '@shared/constants';
```

Le backend produit les erreurs HTTP/SSE en utilisant les messages partagés et templates dynamiques :

- `aiServiceUnavailable`
- `quotaExceeded`
- `invalidApiKey`
- `modelUnavailable`
- `noApiKey`
- `networkUnreachable`
- templates quota avec provider injecté

Le frontend mappe `HttpErrorResponse` vers ces clés dans l’interceptor ou un formatter partagé. Le toast et la bulle chat consomment la même chaîne formatée. Aucun composant ne redéfinit le texte métier.

## 5. Phases de migration

### Phase 1 — Audit et contrat

- Inventorier tous les `fetch()` frontend et les distinguer SSE/REST.
- Vérifier les signatures disponibles dans les typings Angular 20.
- Finaliser `libs/shared/constants/messages.ts`.
- Ajouter les tests de formatage HTTP (`0`, `400`, `401/403`, `402/429`, `404`, `5xx`, body JSON/string).

### Phase 2 — Services GET REST

- Migrer TTS catalog vers des ressources GET ou actions GET explicites.
- Migrer AI models vers `httpResource()`.
- Migrer user-data GET vers `httpResource()`.
- Supprimer les états loading/error dupliqués uniquement quand la ressource les fournit.
- Garder les composants orientés présentation.

### Phase 3 — Actions explicites

- Migrer POST transcription et actions TTS vers `HttpClient`.
- Migrer progressivement les mutations user-data.
- Vérifier que chaque mutation reste déclenchée par un événement utilisateur.
- Ne pas utiliser `rxResource()` automatiquement sans besoin de lifecycle Resource.

### Phase 4 — SSE et erreurs

- Garder le transport SSE séparé et typé.
- Vérifier la propagation de `401/403/402/429/5xx` et des messages provider.
- Empêcher les doubles notifications : interceptor HTTP pour REST, service SSE pour le chat.
- Tester les erreurs chat sous forme de bulle `kind: 'error'`.

### Phase 5 — Nettoyage et validation

- Supprimer les wrappers `fetchWithErrors()` non utilisés.
- Vérifier les imports `@shared/constants` côté frontend/backend.
- Lancer le build frontend/backend et les tests des services touchés.

## 6. Test assertions (Act / Wait / Assert)

- **GET TTS providers** : Act : charger le service ; Wait : resource résolue ; Assert : `value()` contient les providers et aucun toast d’erreur.
- **GET AI models avec provider** : Act : changer le signal provider ; Wait : ressource rechargée ; Assert : seuls les modèles du provider sont exposés.
- **401/403** : Act : réponse HTTP key expirée ; Wait : interceptor terminé ; Assert : message `invalidApiKey` et notification UX.
- **402/429** : Act : réponse quota ; Wait : traitement terminé ; Assert : message quota dynamique et provider correct.
- **5xx** : Act : erreur serveur ; Wait : interceptor terminé ; Assert : message service indisponible, une seule notification.
- **POST TTS/STT** : Act : déclencher l’action ; Wait : Observable terminé ; Assert : requête explicite et audio/transcript consommé.
- **SSE quota** : Act : événement SSE `QUOTA_EXCEEDED` ; Wait : stream terminé ; Assert : banner et bulle d’erreur utilisent le message partagé.
- **Build** : Act : `nx build frontend` et `nx build backend` ; Wait : commandes terminées ; Assert : exit code 0.

## 7. Risques et mitigations

- **API Resource Angular 20 encore expérimentale** : vérifier les typings installés avant chaque migration ; utiliser `request` et non `params`.
- **GET avec clé/provider personnalisé** : ne pas déclencher des requêtes à la construction ; initialiser via signal `enabled` ou action utilisateur.
- **Doubles notifications** : définir une seule frontière : interceptor pour REST, parser SSE pour chat.
- **Régression UX** : garder les mêmes signaux d’interface (`liveError`, `selectedModelId`, etc.) ou adapter les templates explicitement.
- **Apollo** : ne pas migrer les mutations GraphQL vers `HttpClient` dans cette task ; conserver Apollo.

## 8. Definition of done

- [ ] Audit REST/SSE complet.
- [ ] Aucun `HttpClient` injecté dans un composant.
- [ ] GET REST ciblés utilisent `httpResource()` ou une justification Observable documentée.
- [ ] POST/PUT/PATCH/DELETE sont des actions explicites.
- [ ] SSE reste isolé et testé.
- [ ] Messages utilisateur communs importés depuis `libs/shared/constants/messages.ts`.
- [ ] Interceptor HTTP couvre erreurs réseau, statuts HTTP et corps JSON/string.
- [ ] Tests unitaires ciblés et builds frontend/backend passent.

**Readiness:** 8/10 — stack et version confirmés, frontières identifiées ; la migration doit rester progressive pour éviter de mélanger les Resources expérimentales avec les flux SSE et Apollo existants.
