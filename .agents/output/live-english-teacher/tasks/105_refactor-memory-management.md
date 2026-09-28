# Task 105 — Refactor « gestion de la mémoire » (par modèle, type ChatGPT/Gemini web)

**Status:** DONE (2026-09-28, thr-dev — preuves §10)
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

## 2. Current state (audit 2026-09-28, post-migration HTTP)

**La migration Resource API a déjà été appliquée dans le worktree.** `memory.service.ts` est passé
en `httpResource()` + `rxResource()` (194 lignes), comme `user-profile`, `prompt-tag`, `ai-config`,
`elevenlabs-catalog`. Il ne reste qu'un seul `fetch()` dans tout le frontend, le transport SSE de
`chat-stream.service.ts` — correctement toléré. **Ne pas refaire cette partie.**

En revanche la feature demandée (mémoire par modèle, scoping utilisateur, quota atomique) n'a pas
démarré : aucun fichier de la §4 n'existe, aucune migration n'a été créée.

| Point | Emplacement | État |
|---|---|---|
| Client HTTP | `memory.service.ts:38-42` | ✅ **FAIT** — `httpResource()` pour le GET, `rxResource()` pour les mutations |
| Gate lazy | `memory.service.ts:36,39-43` | ✅ **FAIT** — `loadGate` signal, request `undefined` tant que 0 |
| État loading/error | `memory.service.ts:44-52` | ✅ **FAIT** — `computed()` dérivé de la resource, plus de `loaded`/`inflight`/`loading` signal |
| **Merge par `effect()`** | `memory.service.ts:127,135,146` | ❌ **3 effects** qui copient `memoriesGet.value()` → `memories.set()`. Anti-pattern **interdit par `stack.md`** (« Never use `effect` to sync one piece of state to another ») → à réécrire en `linkedSignal` |
| Portée modèle | `prisma/schema.prisma:54-66` | ❌ **aucune** notion de modèle. Aucune migration au-delà de `20260921114336` |
| Portée propriétaire | `user-memory.service.ts:19-23` | ❌ `userId ?? deviceKey` — la mémoire ne suit pas l'utilisateur entre navigateurs |
| Quota atomique | `user-memory.service.ts:35-42` | ❌ `count()` puis `create()` — race sur `add()` concurrents |
| Formatage contexte | `memory.service.ts` (nouveau) vs `user-memory.service.ts:75-79` | ❌ **dupliqué** : la même concaténation `- ${text}` existe encore des deux côtés |
| `MAX_MEMORIES` | `memory.service.ts:24` vs `user-memory.service.ts:15` | ❌ **dupliqué** (50 dans les deux fichiers) |
| Component | `settings-tab-memory.component.ts` | ❌ **199 lignes**, `templateUrl` absent (template inline), aucun `.util.ts` — contrairement à `settings-tab-tags` / `settings-tab-voices` |
| Erreurs | `memory.service.ts:46-52` | ❌ `Memories unavailable (${status}).` **codé en dur**. `SHARED_MESSAGES` n'a ni `authRequired` ni `memoryQuotaReached` (vérifié) |
| Spec BE | `user-memory.service.spec.ts:13-64` | ❌ réimplémente le service en clair au lieu de l'importer — ne teste pas le vrai fichier |
| Rollback / toasts | — | ❌ suppressions optimistes sans rollback ni `NotificationService` |

### 2.1 Blocage auth à assumer explicitement

Aucun service d'auth frontend n'existe (Task 28 est TODO) et **personne ne pose l'en-tête
`x-user-id`** aujourd'hui — seuls les 14 handlers du `UserDataController` le lisent. On ne peut donc
pas livrer « scopé par l'utilisateur connecté » en une fois. La task livre :

- un `MemoryOwnerService` unique qui expose `ownerId` / `isAuthenticated` ;
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
   │                    (état réactif de l'onglet, gate `loadGate` existant)
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
| `GET /memories` (liste, pilotée par `selectedModelId`) | `httpResource()` | GET + état serveur réactif. **Déjà en place** (`memory.service.ts:39` `memoriesGet`) — étendre la request avec le scope, garder le gate `loadGate` existant (miroir de `chat.service.ts:72-104`) |
| `POST` / `PATCH` / `DELETE` | **`rxResource()`** avec loader `stream` | mutations = commandes explicites. Le `request` dépend d'un Signal d'intention, **jamais** d'un Signal d'état → une mutation ne s'auto-exécute pas. `HttpClient` n'apparaît qu'`this.http.post(...)` **dans** le `stream` |
| `GET /memories/context` | `httpResource()` | GET d'état serveur, pas une action ponctuelle. Gaté par le même `loadGate` → zéro requête au premier paint |
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
- `services/memory.service.ts` → **garder le nom** (déjà migré Resource API) : rebrancher sur
  `MemoryOwnerService`, exposer le scope dans la request, et **supprimer les 3 `effect()` de merge**
  au profit d'un `linkedSignal`
- `services/memory-mutations.ts` — les 3 `rxResource()` (`addMemory`, `updateMemory`,
  `removeMemory`, `clearMemories`) extraits hors du service principal, pour faire passer
  `memory.service.ts` (194 l.) sous 120 lignes ; `HttpClient` injecté ici seulement
- `services/memory-context.service.ts` — nouveau : `httpResource()` sur `GET /context`,
  alimente `MessageService`
- `services/memory-owner.service.ts` — nouveau : `ownerId`, `isAuthenticated`, bascule Task 28
- `services/memory-tab.util.ts` — **pur** : `normalizeScope`, `scopeLabel`, `canAddMemory`,
  `isEditing`, `counterLabel`
- `services/memory.service.spec.ts` — réécrire : `provideHttpClientTesting()` + `httpTestingController`
  (resolved/error/lazy + les `rxResource()`) **et** une assertion prouvant l'absence d'`effect()`
  de merge
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
  `this.memoryContext.value()` ; le `profile`/`promptTags` restent inchangés

### Partagé
- `libs/shared/constants/api-endpoints.ts:41-45` — ajouter `memoryContext`

## 5. Steps

1. **Migration** — ajouter `modelScope` + index ; `npx prisma generate` ; `npx prisma migrate status`.
2. **Util pur backend** — `user-memory-context.util.ts` + spec. Doit passer avant toute autre chose.
3. **Backend service** — `OwnerScope.modelScope`, quota atomique, suppression de `buildContext()`.
4. **Backend controller** — route `/context`, `requireOwner()` sur POST/PATCH/DELETE, `x-ai-model`.
5. **Backend DTO + pipe** — `scope`, validation `provider:modelId`, mapping d'erreurs.
6. **Specs backend** — réécrire `user-memory.service.spec.ts` sur le vrai service.
7. **Messages partagés** — `messages.ts`, `api-endpoints.ts`.
8. **FE `memory-owner.service.ts`** — `ownerId` / `isAuthenticated` (deviceKey, `false`).
9. **FE `memory.service.ts`** — brancher le scope dans la request `httpResource()`, extraire les
   `rxResource()` dans `memory-mutations.ts`, **remplacer les 3 `effect()` de merge par
   `linkedSignal`**, supprimer le `MAX_MEMORIES` local.
10. **FE `memory-context.service.ts`** + bascule de `message.service.ts`.
11. **FE util + component + template** — découpage de `settings-tab-memory.component.ts`.
12. **Toasts + rollback** — `NotificationService` branché ; rollback des suppressions optimistes.
13. **Tests FE** — `memory.service.spec.ts` (réécrit), `memory-tab.util.spec.ts`.
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

- [x] `prisma/schema.prisma` a `UserMemory.modelScope String?` + migration additive appliquée,
      `npx prisma migrate status` propre, lignes existantes = globales.
- [x] Le contexte LLM contient les mémoires globales **et** celle du modèle courant, jamais celle
      d'un autre modèle — prouvé par les assertions de portée.
- [x] Le formatage du contexte existe en **un seul** endroit (`user-memory-context.util.ts`) ;
      `buildMemoryContext()` (FE) et `buildContext()` (BE mémoire) ont disparu.
- [x] Le quota est atomique : 5 `add()` concurrents ne dépassent pas `MAX_MEMORIES`.
- [x] `MAX_MEMORIES` n'est défini qu'une fois (backend) ; le frontend lit la valeur exposée
      (enveloppe `{ items, maxMemories }`).
- [x] **Zéro `effect()` de synchronisation d'état dans `memory.service.ts`** — les 3 effects de merge
      sont remplacés par un `linkedSignal` (+ assertion `?raw` anti-`effect()` dans la spec).
- [x] Zéro `effect()`, `subscribe()`, `OnDestroy` ou `ngOnChanges` ajouté par cette task.
- [x] `HttpClient` n'est injecté **que** dans `memory-mutations.ts` (streams `rxResource()`).
- [x] **Aucune mutation ne s'auto-exécute** : intents à null → `status() === 'idle'`, `expectNone`.
- [x] Syntaxe Angular 20 respectée : `params` + `stream` sur `rxResource()`, `params` seulement
      dans le `HttpResourceRequest` de `httpResource()`.
- [x] Zéro appel réseau à la construction — `loadGate` conservé et étendu au scope.
- [x] Écriture refusée `401` + message partagé quand l'utilisateur n'est pas connecté ; lecture
      toujours possible (prouvé en curl : POST guest → 401 `authRequired`).
- [x] Une seule source de vérité pour le propriétaire (`MemoryOwnerService`), prête pour Task 28
      sans changement dans les appelants.
- [x] `settings-tab-memory.component.ts` 104 lignes, `templateUrl` externe, logique pure dans
      `memory-tab.util.ts` + spec.
- [x] Sélecteur de portée globale/modèle présent, alimenté par `selectedModel` d'`ai-config.service`.
- [x] Aucune chaîne d'erreur mémoire codée en dur ; tout passe par `SHARED_MESSAGES`.
- [x] Suppressions optimistes annulées au 5xx + toast (interceptor) ; `NotificationService` branché
      (guards synchrones `authRequired` / quota).
- [x] `Session`/`Message` (mémoire de session) **inchangés** — `git diff` schema : 0 ligne.
- [x] `pnpm lint` 5 projets OK · builds FE+BE exit 0 · backend 225/225 · frontend 103/103 ·
      `format:check` propre · `check-theme-tokens` OK · fichiers touchés ≤ 200
      (`prompt-tag.service.ts` 257 = pré-existant, effort parallèle — hors scope).

## 10. Preuves (2026-09-28)

```
GET  /api/user/memories (guest)                    -> 200 {items:[],maxMemories:50}
POST /api/user/memories (guest, scope global)      -> 401 {code:authRequired,message:shared}
POST (x-user-id, scope global)                     -> 201 {modelScope:null}
POST (x-user-id, scope model, x-ai-model)          -> 201 {modelScope:'groq:gpt-4o'}
GET  /api/user/memories (sans model)               -> 1 item (global seul)
GET  /api/user/memories?model=groq:gpt-4o          -> 2 items (global + modèle)
GET  /api/user/memories/context?model=groq:gpt-4o  -> {"context":"- model fact\n- global fact"}
POST 51e global (50 existants)                     -> 409 {code:memoryQuotaReached,used:50,max:50}
PATCH guest                                        -> 401 authRequired
POST scope model + x-ai-model malformé             -> 400 Invalid model scope
```
- `npm run test:backend:unit` : **225/225** (dont `user-memory-context` 7/7, `user-memory.service` 9/9 sur le vrai service).
- `npm run test:frontend:unit` : **103/103** (20 fichiers, dont memory 10/10, merge 8/8, tab 6/6, api-error 16/16).
- `npx tsc -p apps/frontend/tsconfig.app.json --noEmit` : 0 erreur. `nx run-many -t lint/build --all` : OK.

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
- Nettoyer les `effect()` de merge de `user-profile.service.ts:61` et `prompt-tag.service.ts:61,71,81`
  — même anti-pattern que `memory.service.ts`, mais services distincts. **Ces 2 services sont déjà
  migrés Resource API** ; il ne reste que le refactor Signals à faire. À suivre dans une task dédiée
  « Signals pass 2 : `effect()` → `linkedSignal` » (26 `effect()` dans le repo au total).
- Supprimer la mémoire de session existante.
- Appliquer l'extraction automatique (« l'IA se souvient de X ») — cette task structure le scoping, pas
  l'extraction depuis la conversation.

---

**Prochaine étape :** `thr-dev` sur cette task, en suivant les steps dans l'ordre (migration → util
pur backend → service → controller → specs → FE). Le step 2 conditionne tous les suivants.
