# Task 21 — Chat fonctionnel (SSE, langue, markdown, erreurs, menu contexte)

**Status: DONE**
**Priorité:** 🔴 Haute

## Goal

Fiabiliser le chat côté fonctionnel : streaming SSE, langue d'apprentissage, rendu Markdown, erreurs lisibles, menu contexte. **Le design dark/light de ces mêmes composants est traité dans les Tasks 24–25 — ne pas mélanger les deux.**

## 1. Fix SSE Streaming Error

**Problem:** `SSE streaming failed, falling back to GraphQL` — le endpoint stream retourne une erreur mal exposée.

**Root cause à investiguer :**
- `message.service.ts` — `streamViaSSE` lève quand `data.error === true`
- Backend `ai-stream.controller.ts` — identifier le déclencheur de la réponse d'erreur

**Fichiers :**
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts` — meilleur logging d'erreur
- `apps/frontend/src/app/core/services/message.service.ts` — gestion d'erreur dans `streamViaSSE`

## 2. Sync Learning Language from Chat Input

**Problem:** La langue choisie dans le dropdown du chat input n'est pas prise en compte par l'IA.

**Requirements :**
- Dropdown chat input → `LanguageService.selectedLanguageCode`
- `MessageService.sendTextMessage` → `targetLanguage` toujours envoyé au backend
- Backend `AiProviderService` → `targetLanguage` dans le system prompt (via `buildTutorSystemPrompt`)
- **Persistance langue en DB** : sauver `learningLanguage` de la session dans Prisma

**Fichiers :**
- `apps/frontend/src/app/core/services/language.service.ts` — persistance DB
- `apps/frontend/src/app/core/services/message.service.ts` — `targetLanguage` systématique
- `libs/data-access-prisma/src/lib/prisma.service.ts` — vérifier champ `learningLanguage`

## 3. Error Messages — gestion lisible

**Problem:** Certains messages d'erreur s'affichent bruts et illisibles.

**Requirements :**
- Toutes les erreurs IA préfixées `⚠️`
- `MessageItemComponent` détecte `⚠️` → classe `chat-bubble-error`
- Tronquer les longs messages à 200 caractères max
- Bouton « Retry » sur les messages d'erreur

**Fichiers :**
- `apps/frontend/src/app/features/chat-room/components/message-item/message-item.component.ts` — détection erreur + bouton retry
- `apps/frontend/src/app/core/services/message.service.ts` — préfixe `⚠️` systématique

## 4. Markdown Rendering avec ngx-markdown

**Requirements :**
- Paquet `ngx-markdown` installé et configuré
- Remplacer le parsing `innerHTML` par le renderer Markdown dans `MessageItemComponent`
- Support : gras, italique, blocs code, listes, liens, titres + sanitization HTML sûre
- ⚠️ Le **contraste du markdown en thème light** est vérifié en Task 24, pas ici

**Fichiers :**
- `package.json` — dépendance `ngx-markdown`
- `apps/frontend/src/app/features/chat-room/components/message-item/message-item.component.ts` — composant `markdown`
- `apps/frontend/src/app/app.config.ts` — `provideMarkdown()`

## 5. Context Menu sur messages IA (⋯)

**Requirements :**
- Bouton `⋯` sur les bulles IA uniquement
- Dropdown daisyUI : **Copy** (presse-papiers), **Retry** (renvoie le dernier message user), **Listen** (TTS), **Fork** (nouvelle session depuis ce contexte)

**Fichiers :**
- `apps/frontend/src/app/features/chat-room/components/message-item/message-item.component.ts` — menu dropdown
- `apps/frontend/src/app/features/chat-room/chat-page.component.ts` — handlers retry/fork
- `apps/frontend/src/app/features/chat-room/chat-page.component.html` — passage des handlers

## Étapes

1. Fix gestion + logging erreur SSE
2. Sync langue chat input → backend + persistance DB
3. Messages d'erreur `⚠️` + retry (fonctionnel, le style light vient en Task 24)
4. Installer/configurer ngx-markdown + remplacer le parsing
5. Construire le menu contexte + câbler les actions (copy, retry, listen, fork)
6. Build + lint verify

## Critères d'acceptation

- [x] Streaming SSE sans fallback intempestif (ou fallback gracieux)
- [x] Choix langue dans le chat input → l'IA répond dans cette langue
- [x] Langue d'apprentissage persistée entre sessions
- [x] Erreurs en bulles `chat-bubble-error` avec retry
- [x] Réponses IA en Markdown (code, gras, listes…)
- [x] Menu ⋯ sur messages IA : Copy/Retry/Listen/Fork
- [x] `nx build frontend` + `nx build backend` sans erreur

## Note de périmètre (clean 2026-09-16)

- L'ancienne section « 3. Theme Dark/Light Persistence + DB Sync » (DB `user_preferences`, sync DB → localStorage) est **supprimée** : le thème est persisté en cookie `app_theme` (voir Task 26), et il n'y a pas d'authentification à laquelle adosser une synchro DB (voir Task 28). Rouvir seulement après l'auth.

