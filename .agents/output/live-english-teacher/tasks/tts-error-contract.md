# Task — TTS error contract (503 opaque → cause explicite)

**Status:** DONE
**Plan:** plan-001 (suite)
**Priority:** High
**Stack:** NestJS 11 (`TtsProviderService`), Angular 20 signals, contrat partagé `@shared/constants`

## Goal

`POST /api/ai/tts` renvoyait `503 {"message":"TTS not available for provider \"elevenlabs\""}`
pour **toutes** les causes (quota épuisé, clé invalide/sans permission, voix ou
modèle inconnu, provider non supporté). Impossible de savoir quoi corriger, et
l'UI restait muette (aucun toast).

Résultat attendu : chaque cause a un `code` + un statut HTTP correct + un message
actionnable, remonté jusqu'à l'UI.

## Root cause (prouvée)

Logs backend (instance locale) :

```
[TtsSynthesizeService] Custom ElevenLabs TTS error: 401 -
{"code":"quota_exceeded","message":"This request exceeds your quota of 10000.
You have 1 credits remaining, while 5 credits are required for this request."}
[ElevenLabsService] ElevenLabs API Error: 401 - Unauthorized: {code: quota_exceeded}
```

- ElevenLabs renvoie `401` même pour `quota_exceeded` → classé "auth" puis jeté.
- 3 appels amont par tentative (duplicate fetch + retry voix par défaut) →
  crédits gaspillés, et même cause perdue.
- La clé serveur n'a pas les permissions `voices_read`/`models_read` :
  `GET /v1/voices` et `GET /v1/models` → `401 authentication_error` →
  `/api/ai/voices` et `/api/ai/tts-models` renvoient `[]` silencieusement.

## Étapes

1. Contrat partagé `libs/shared/constants/tts-contract.ts` (codes + messages).
2. Backend : `TtsSynthesisOutcome` (`ok: true | false`) au lieu de `null`.
3. Classification amont (`quota` > `auth` > voix/modèle > provider) + statut HTTP.
4. Suppression du fetch dupliqué ElevenLabs (1 appel, retry borné).
5. Frontend : parse du body d'erreur + message réel (toast + test de voix).
6. Split `tts-synthesize.service.ts` → `tts-vendors.service.ts` (budget 200 lignes).

## Acceptance criteria

- [x] `POST /api/ai/tts` : 429 quota, 401 clé, 400 voix/modèle, 400 provider inconnu, 502 amont.
- [x] Chaque réponse porte `code`, `provider`, `message` et `detail` (tronqué à 200).
- [x] Le frontend affiche le message serveur (toast) au lieu de `tts-unavailable`.
- [x] Tests backend (`node --test`) + frontend (vitest) verts, builds + lint OK.
- [x] Preuve réelle : appels HTTP documentés dans le log de décision.

## Preuves (build frais + appel reel)

```
POST /api/ai/tts (x-tts-provider: foo)                 -> 400 UNSUPPORTED_PROVIDER
POST /api/ai/tts (elevenlabs, quota epuise)             -> 429 QUOTA_EXCEEDED  + detail upstream
POST /api/ai/tts (cle invalide)                      -> 401 INVALID_API_KEY + detail upstream
POST /api/ai/tts (openai sans cle)                      -> 401 MISSING_API_KEY + message "Settings > Voices"
POST /api/ai/tts (voix/modele inconnus)                 -> 400 VOICE_UNAVAILABLE (retry par defaut borné)
```

- `npm run test:backend:unit` : **192/192** (classification, transport axios, retry, parse).
- `npx tsc -p apps/frontend/tsconfig.app.json --noEmit` : **0 erreur** (strict).
- Specs FE concernées : `tts-failure.util.spec.ts` 9/9, `api-error.util.spec.ts` 13/13.
- Fichiers <= 200 lignes (budget respecte) : max 187 (`tts-audio-cache.service.ts`).

## Regles documentees (suite au retour)

- `.agents/rules/stack.md` : section **HTTP / data access — Angular 20 resources** (`httpResource` pour les GET,
  action `HttpClient` Observable pour les POST, `fetch` natif = SSE chat uniquement) + regle **backend = axios**
  avec le motif `tts-http.util.ts`.
- Nuance notee : Angular installe 20.3.11 utilise `params` (et non `request`) — voir typings installe.

## Suites (hors scope)

- Migrer `fetch` de `gemini-live`, `groq-*` et `genkit-flow` vers axios (regle stack).
- Les specs FE `message/ai-config/memory/prompt-tag/user-profile` echouent : refactor HTTP en parallele
  (services qui injectent HttpClient sans `provideHttpClient()` dans leur TestBed) — hors ce correctif.
- `GET /api/ai/voices|tts-models` renvoient toujours `[]` quand la cle manque de permission : le backend
  log desormais la cause (401 + detail), le message UI reste a affiner (catalogue).
