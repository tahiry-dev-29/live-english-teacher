# Task 105 — Refactor « gestion de la mémoire » (par modèle, type ChatGPT/Gemini web)

**Status:** TODO
**Priority:** 🟠 High
**Stack:** Angular 20.3.11 (`httpResource()` + `rxResource()`, syntaxe `request`), NestJS 11 + Prisma 6
**Règles:** `.agents/rules/stack.md` (canonique), `.agents/rules/angularv20-http.md` (upstream,
partiellement supersédé), daisyUI tokens uniquement
**Dépend de:** Task 28 (auth) pour le user scoping — voir §2.1, la task est livrable sans

## Goal

Refondre la fonctionnalité « gestion de la mémoire » pour qu'elle se comporte comme les mémoires
ChatGPT / Gemini web :

1. **Mémoire par modèle IA** — une mémoire **globale** (appliquée à tous les modèles) plus une
   **surcharge par modèle**, sélectée par la clé `provider:modelId`. Le contexte envoyé au LLM est
   `globale + modèle courant`, jamais les mémoires d'un autre modèle.
2. **Mémoire user scopée par l'utilisateur connecté**, pas par `deviceKey` — un utilisateur retrouve
   sa mémoire sur tous ses navigateurs. Un visiteur non connecté est en **lecture seule**.
3. **Supprimer la duplication** entre mémoire de session (déjà gérée par `Session`/`Message`) et
   mémoire user — la frontière est explicite, la mémoire de session n'est **pas** touchée.
4. Corriger les défauts structurels : `fetch()` brut, état loading/error/loaded/inflight manuel,
   quota non atomique, `buildContext()` dupliqué FE/BE, component de 200 lignes, erreurs codées
   en dur, suppressions optimistes sans rollback, doublon de `MAX_MEMORIES`.

## 2. Current state (audit)

| Point | Emplacement | Défaut |
|---|---|---|
| Portée mémoire | `user-memory.service.ts:19-23` | `userId ?? deviceKey` — la mémoire ne suit pas l'utilisateur |
| Portée modèle | `prisma/schema.prisma:54-66` | **aucune** notion de modèle |
| Client HTTP | `memory.service.ts:57,74,92,110,122` | 5× `fetch()` brut, hors `angularv20-http.md` |
| État manuel | `memory.service.ts:27-28,34-35` | `loading`/`error`/`loaded`/`inflight` dupliquent ce qu'un Resource fournit |
| Quota | `user-memory.service.ts:35-42` | `count()` puis `create()` — race entre deux requêtes concurrentes |
| Quota FE | `memory.service.ts:22,30-32` | `MAX_MEMORIES = 50` dupliqué du backend |
| Formatage contexte | `memory.service.ts:132` vs `user-memory.service.ts:75-79` | même logique `- ${text}` écrite deux fois |
| Component | `settings-tab-memory.component.ts:159` | 200 lignes (plafond), template inline, **aucun** `.util.ts` contrairement à `settings-tab-tags` / `settings-tab-voices` |
| Erreurs | `memory.service.ts:60,64` | `Memories unavailable (${res.status}).` codé en dur, hors `SHARED_MESSAGES` |
| Suppressions | `memory.service.ts:107-117,119-129` | optimistes, `catch {}` muet, aucun rollback ni toast |
| Chargement | `settings-tab-memory.component.ts:168` | fetch dans le constructeur — interdit par `stack.md` |
| Spec BE | `user-memory.service.spec.ts:13-64` | réimplémente le service en clair, ne teste pas le vrai fichier |

### 2.1 Blocage auth à assumer explicitement

Aucun service d'auth frontend n'existe (Task 28 est TODO) et **personne ne pose l'en-tête
`x-user-id`** aujourd'hui — seuls les 14 handlers du `UserDataController` le lisent. On ne peut donc
paslivrer « scopé par l'utilisateur connecté » en une fois. La task livre :

- un `OwnerContextService` unique qui expose `ownerId` / `isAuthenticated` ;
- aujourd'hui : `deviceKey` + `isAuthenticated = false` → **lecture seule**, ce qui est déjà le
  comportement demandé pour les non connectés ;
- plus tard (Task 28) : `ownerId = userId` et le même service bascule l'écriture sans qu'aucun
  appelant ne change.

Toute écriture passe par `if (!owner.isAuthenticated()) return { ok: false, reason: 'authRequired' }`.

## 3. Cible

```text
UserMemory { id, userId?, deviceKey, modelScope?, text, createdAt, updatedAt }
                                   └── null = globale, sinon "provider:modelId"
```

```text
MemoryApiService (Angular 20 — règle stack.md §HTTP Frontend)
   ├── httpResource()  GET /api/user/memories?model=provider:modelId  → globale + modèle
   │                    (état réactif de l'onglet, lazy derrière _shouldLoadMemories)
   ├── rxResource()    POST   /api/user/memories   (stream loader, scope: 'global'|'model')
   │                   PATCH  /api/user/memories/:id
   │                   DELETE /api/user/memories/:id · /api/user/memories
   │                    → HttpClient utilisé UNIQUEMENT à l'intérieur du stream loader
   └── httpResource()  GET /api/user/memories/context?model=…  (contexte prompt, lazily gated)
             │
             ▼
UserMemoryService (NestJS) → user-memory-context.util.ts (pur) → buildPromptContext()
             │
             ▼
           Prisma
```

- **Ingestion** : `MessageService` n'injecte plus le contexte mémoire. Il lit
  `context.value()` depuis la ressource `GET /memories/context?model=…` et reçoit la chaîne prête,
  calculée par le backend — une seule implémentation du formatage.
- **Choix d'API, tracés un par un** (règle `stack.md` §"HTTP Frontend — Resource APIs
  obligatoires" — la matrice de `angularv20-http.md` est supersédée) :

| Opération | API retenue | Justification |
|---|---|---|
| `GET /memories` (liste, pilotée par `selectedModelId`) | `httpResource()` | GET + état serveur réactif. Loader `undefined` tant que `_shouldLoadMemories` est `false` (miroir de `chat.service.ts:72-104`) |
| `POST` / `PATCH` / `DELETE` | **`rxResource()`** avec loader `stream` | mutations = commandes explicites. Le `request` dépend d'un Signal d'intention, **jamais** d'un Signal d'état → une mutation ne s'auto-exécute pas. `HttpClient` n'apparaît qu'`this.http.post(...)` **dans** le `stream` |
| `GET /memories/context` | `httpResource()` | GET d'état serveur, pas une action ponctuelle. Loader gated par le même `_shouldLoadMemories` → zéro requête au premier paint |
| Optimistic update local après mutation | `signal.update()` | état local de présentation, pas une ressource |
| `fetch()` | **interdit** | seul `chat-stream.service.ts` (SSE `ReadableStream`) est toléré |
| Backend → Prisma | Prisma | pas d'axios ici : aucune API externe, c'est la base locale |
- **Boundary session/user** : `Session` + `Message` (historique de conversation) restent
  intacts. Le prompt ne reçoit jamais l'historique via ce chemin ; uniquement les mémoires user.

## 4. Files to create/modify

### Database
- `prisma/schema.prisma` — `UserMemory.modelScope String?`, index
  `@@index([userId, modelScope, updatedAt])`
- `prisma/migrations/<ts>_add_model_scope_to_user_memory/migration.sql` — `ADD COLUMN modelScope TEXT NULL`
  (additif : les lignes existantes ont `modelScope = null` = **globales**, backfill conforme)

### Backend — `libs/backend/feature-live/src/lib/user-data/`
- `user-memory.service.ts` — `OwnerScope` → `{ userId?: string; deviceKey: string; modelScope: string | null }`,
  `MAX_MEMORIES` unique, quota atomique, `list/add/update/remove/clear` scopés modèle,
  `buildPromptContext()`; supprimer `buildContext()` (remplacé)
- `user-data.dto.ts` — `CreateMemoryDto.scope: 'global' | 'model'`, `MemoryContextQueryDto.model`
- `user-data.controller.ts` — routes `GET /user/memories/context`, refus `401` sur écriture
  non authentifiée, `x-ai-model` → `modelScope`
- `user-data-validation.pipe.ts` — `toScope()` : `modelScope` depuis l'en-tête, null si absent ;
  `requireOwner()` pour les écritures
- `user-memory-context.util.ts` — **pur** : `buildPromptContext(entries, modelScope)` (globales +
  modèle, tri `updatedAt desc`, plafond 50 entrées / 4000 caractères, format `- ${text}`)
- `shared/testing/mock-prisma.seed.ts` — `modelScope` dans la fixture mémoire

### Backend — specs
- `user-memory.service.spec.ts` — **réécrire** : importer le vrai service (plus de réimplémentation
  en clair), couvrir modèle/global/quota atomique/401
- `user-memory-context.util.spec.ts` — nouveau : filtrage par portée, plafond, tri, liste vide

### Frontend — `apps/frontend/src/app/features/user-data/`
- `services/memory.service.ts` → renommé `memory-api.service.ts` : `httpResource()` pour les GET
  (loader lazy derrière `_shouldLoadMemories`), `rxResource()` avec loader `stream` pour les
  mutations, plus aucun `fetch`, plus de `loading`/`error`/`loaded`/`inflight`
- `services/memory-mutations.ts` — les 4 `rxResource()` (`addMemory`, `updateMemory`,
  `removeMemory`, `clearMemories`), chacun avec son Signal d'intention ; `HttpClient` injecté
  ici seulement
- `services/memory-lazy.util.ts` — **pur** : `shouldLoadMemories(ready, requested, opened)` +
  `whenIdle(fn)` (`requestIdleCallback` avec fallback `setTimeout`), sur le modèle de
  `elevenlabs-idle.util.ts` / `ai-config-idle.util.ts`
- `services/memory-context.service.ts` — nouveau : GET `/context`, alimente `MessageService`
- `services/memory-owner.service.ts` — nouveau : `ownerId`, `isAuthenticated`, bascule Task 28
- `services/memory-tab.util.ts` — **pur** : `normalizeScope`, `scopeLabel`, `canAddMemory`,
  `isEditing`, `counterLabel`
- `services/memory-api.service.spec.ts` : `provideHttpClientTesting()` + `httpTestingController` —
  assertions sur `httpResource()` (resolved/error/lazy) et sur les 4 `rxResource()`
- `libs/shared/constants/messages.ts` — `error.authRequired`, `error.memoryQuotaReached(n/max)`,
  `templates.memoryScopeLabel(model)`

### Frontend — `apps/frontend/src/app/features/settings/`
- `settings-tab-memory.component.ts` — **≤120 lignes** : état d'UI, délégation au service
- `settings-tab-memory.component.html` — nouveau : template, sélecteur de portée
  globale/modèle, état lecture seule, empty/error/loading
- `settings-tab-memory.util.spec.ts` — nouveau

### Frontend — chat
- `features/chat/services/message.service.ts:173-179` — remplacer
  `this.memories.ensureLoaded() + buildMemoryContext()` par
  `this.memoryContext.load(modelScope)` ; le `profile`/`promptTags` restent inchangés

### Partagé
- `libs/shared/constants/api-endpoints.ts:41-45` — `memories`, `memoryById`, `memoryContext`

## 5. Steps

1. **Migration** — ajouter `modelScope` + index ; `npx prisma generate` ; `npx prisma migrate status`.
2. **Util pur backend** — `user-memory-context.util.ts` + spec. Doit passer avant toute autre chose.
3. **Backend service** — `OwnerScope.modelScope`, quota atomique, suppression de `buildContext()`.
4. **Backend controller** — route `/context`, `requireOwner()` sur POST/PATCH/DELETE, `x-ai-model`.
5. **Backend DTO + pipe** — `scope`, validation `provider:modelId`, mapping d'erreurs.
6. **Specs backend** — réécrire `user-memory.service.spec.ts` sur le vrai service.
7. **Messages partagés** — `messages.ts`, `api-endpoints.ts`.
8. **FE `memory-owner.service.ts`** — `ownerId` / `isAuthenticated` (deviceKey, `false`).
9. **FE `memory-api.service.ts`** — `httpResource()` (GET réactifs, lazy) + `rxResource()` loader
   `stream` (mutations) ; `memory-lazy.util.ts` pour le déverrouillage idle.
10. **FE `memory-context.service.ts`** + bascule de `message.service.ts`.
11. **FE util + component + template** — découpage de `settings-tab-memory.component.ts`.
12. **Toasts + rollback** — `NotificationService` branché ; rollback des suppressions optimistes.
13. **Tests FE** — `memory-api.service.spec.ts`, `memory-tab.util.spec.ts`.
14. **Validation** — `tsc`, `pnpm lint`, builds, tests backend + frontend, `format:check`, guard themes.

## 6. Test assertions (Act / Wait / Assert)

**Contexte injecté**
- Act : mémoires globales A/B + mémoire modèle M, `buildPromptContext(entries, 'gemini-2.5-pro')`
  Wait : appel synchrone Assert : sortie contient A, B, M.
- Act : mêmes entrées, scope `'openai:gpt-4o'` Assert : A et B présents, M **absente**.
- Act : scope `null` Assert : seules les globales, jamais une mémoire de modèle.
- Act : 80 entrées Assert : plafonné à 50 lignes / 4000 caractères, les plus récentes conservées.
- Act : liste vide Assert : `''`.

**Quotas et atomicité**
- Act : 50 mémoires, `add()` Assert : rejet `memory quota reached` (409), `count` toujours 50.
- Act : `Promise.all` de 5 `add()` sur un scope vide de 0 Assert : exactement 5 créées, 0 rejet
  inattendu, total ≤ 50 (le `count()` + `create()` actuel échoue ici).

**Portée modèle**
- Act : `add(scope, 'global', 'x')` puis `add(scope, 'model', 'y')` Assert : `list('global')` ne
  renvoie pas `y` ; `list('gemini-2.5-pro')` renvoie les deux.
- Act : deux `deviceKey` différents, même `userId` Assert : les deux voient la même mémoire.

**Écriture non authentifiée**
- Act : POST sans `x-user-id` Assert : **401**, message `SHARED_MESSAGES.error.authRequired`.
- Act : GET sans `x-user-id` Assert : 200, lecture seule.

**Contrat d'erreur**
- Act : `HttpErrorResponse` status 409 corps JSON `{ message: 'Memory is full (50/50).' }`
  Wait : `formatHttpError()` Assert : `memoryQuotaReached`, pas de texte brut.
- Act : réseau coupé Assert : `networkUnreachable`, **une seule** notification.

**FE service**
- Act : `httpResource` résolue Assert : `value()` = globales + modèle courant, `status() = 'resolved'`.
- Act : `selectedModelId` changé Assert : rechargement, seule la mémoire du nouveau modèle apparaît.
- Act : suppression optimiste + DELETE en 500 Assert : entrée **restaurée** + toast `error`.
- Act : construction du service hors ligne Assert : **0 requête** (lazy + `requestIdleCallback`).
- Act : `add()` avec 50 mémoires Assert : 0 requête, toast warning.

**Component / util**
- Act : `canAddMemory('', '')` Assert `false` ; `('x', 'global')` Assert `true` en mode authentifié.
- Act : `counterLabel(3, 50)` Assert `'3/50'`.
- Act : `scopeLabel('gemini-2.5-pro')` Assert `'Gemini 2.5 Pro'`.

**Intégration chat**
- Act : `sendMessage()` Assert : un seul `GET /memories/context?model=…` via la ressource, aucun
  `ensureLoaded()` mémoire, `buildInvisibleContext()` reçoit la chaîne backend.

**Non auto-exécution des mutations**
- Act : service injecté, aucun signal d'intention posé Wait : `microtask` Assert :
  `addMemory.status() === 'idle'` et `httpTestingController.expectNone(...)` sur POST.
- Act : poser `addIntent` avec le texte Assert : exactement 1 POST émis, `status()` passe
  `loading` → `resolved`.

**Build**
- Act : `nx run-many --target=build --all` ; Wait : terminé ; Assert : exit 0.

## 7. Acceptance criteria

- [ ] `prisma/schema.prisma` a `UserMemory.modelScope String?` + migration additive appliquée,
      `npx prisma migrate status` propre, lignes existantes = globales.
- [ ] Le contexte LLM contient les mémoires globales **et** celle du modèle courant, jamais celle
      d'un autre modèle — prouvé par les assertions de portée.
- [ ] Le formatage du contexte existe en **un seul** endroit (`user-memory-context.util.ts`) ;
      `buildMemoryContext()` (FE) et `buildContext()` (BE) ont disparu.
- [ ] Le quota est atomique : 5 `add()` concurrents ne dépassent pas `MAX_MEMORIES`.
- [ ] `MAX_MEMORIES` n'est défini qu'une fois (backend) ; le frontend lit la valeur exposée.
- [ ] Zéro `fetch()` et zéro `Promise` native d'appel HTTP dans `features/user-data/`.
- [ ] Chaque appel HTTP est tracé dans le tableau §3 et conforme à `stack.md` :
      GET → `httpResource()`, mutations → `rxResource()` (loader `stream`).
- [ ] `HttpClient` n'est injecté **que** dans `memory-mutations.ts` (et plus dans aucun
      composant, aucun autre service du feature).
- [ ] **Aucune mutation ne s'auto-exécute** : poser `addIntent` / `updateIntent` / `removeIntent`
      laisse les 4 `rxResource()` en `status() === 'idle'` sans requête (assertion dédiée).
- [ ] Syntaxe Angular 20 respectée : `request` dans `resource()`/`rxResource()` (jamais `params`) ;
      `params` uniquement dans le `HttpResourceRequest` de `httpResource()`.
- [ ] Zéro état `loading`/`error`/`loaded`/`inflight` manuel dans `MemoryService`.
- [ ] Zéro appel réseau à la construction ; déverrouillage en `requestIdleCallback` (fallback
      `setTimeout`) conformément à `stack.md`.
- [ ] Écriture refusée `401` + message partagé quand l'utilisateur n'est pas connecté ; lecture
      toujours possible.
- [ ] Une seule source de vérité pour le propriétaire (`MemoryOwnerService`), prête pour Task 28
      sans changement dans les appelants.
- [ ] `settings-tab-memory.component.ts` ≤ 120 lignes, `templateUrl` externe, logique pure dans
      `settings-tab-memory.util.ts` + spec.
- [ ] Sélecteur de portée globale/modèle présent, alimenté par `selectedModel` d'`ai-config.service`.
- [ ] Aucune chaîne d'erreur mémoire codée en dur ; tout passe par `SHARED_MESSAGES`.
- [ ] Suppressions optimistes annulées au 5xx + toast ; `NotificationService` branché.
- [ ] `Session`/`Message` (mémoire de session) **inchangés** — vérifié par `git diff` sur
      `prisma/schema.prisma` : aucun ajout de champ sur ces modèles.
- [ ] `pnpm lint` 0 erreur · builds FE+BE exit 0 · tests backend et frontend verts ·
      `format:check` propre · `scripts/check-theme-tokens.mjs` OK · aucun fichier > 200 lignes.

## 8. Risques et mitigations

- **Task 28 absente** → le mode lecture seule est le comportement correct interim ; le point de
  bascule est isolé dans `MemoryOwnerService` (1 fichier, 1 signal).
- **Course sur le quota** → compter et créer dans une seule transaction Prisma ; le test
  `Promise.all` de 5 ajouts est la preuve.
- **Migration sur données de prod** → colonne nullable additive, aucun `NOT NULL`, aucun backfill
  de données ; rollback = `DROP COLUMN`.
- **Injection de contexte d'un mauvais modèle** → une seule fonction pure testée sur 4 scopes.
- **Régression du chat** → `message.service.ts` ne change qu'une branche ; les autres sources de
  contexte (profile, tags) restent intactes, `buildInvisibleContext()` garde sa signature.
- **Fuite de mémoire prompt** → plafond 50 entrées / 4000 caractères, testé.

## 9. Hors scope

- Task 28 (auth microservice) elle-même.
- Modifier `Session` / `Message` ou l'historique de conversation.
- Migrer `user-profile.service.ts` / `prompt-tag.service.ts` (mêmes défauts `fetch()`, mais hors
  périmètre de cette task — suivi dans `tasks/angular20-http-refactor.md`).
- Supprimer la mémoire de session existante.
- Appliquer l'extraction automatique (« l'IA se souvient de X ») — ce task structure le scoping, pas
  l'extraction depuis la conversation.

---

**Prochaine étape :** `thr-dev` sur cette task, en suivant les steps dans l'ordre (migration → util
pur backend → service → controller → specs → FE). Le step 2 conditionne tous les suivants.
