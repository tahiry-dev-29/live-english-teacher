# Task 31 — Messages centralisés (error / warning / success / log) + zéro emoji

**Status: TODO**
**Priorité:** Moyenne

## Goal

Sortir **tous** les messages runtime (erreur, warning, succès, logs) des composants/services
vers un fichier de constantes typé, et supprimer tout emoji des messages (dont le préfixe `⚠️`).
Le rendu d'erreur ne doit plus dépendre d'un sniffing de texte (`startsWith('⚠️')`).

## Constat (état actuel)

| Emplacement | Problème |
| --- | --- |
| `core/services/message.service.ts` (323, 376, 417-452) | 8 textes d'erreur en dur, préfixés `⚠️` ; `formatApiError()` logée dans le service |
| `chat-room/components/message-item/message-item.component.ts:174` | `isError` déduit du texte (`startsWith('⚠️')`, `startsWith('Error:')`) |
| `chat-room/components/chat-container/chat-container.component.ts:18` | interface `Message` dupliquée (3ᵉ définition du nom `Message` dans le repo) |
| `chat-room/chat-page.component.html:50-74` | texte bannière quota en dur + emojis `🔑` `✕` + `<svg>` inline (interdit par `stack.md`) |
| `chat-room/chat-page.component.ts:305` | phrase de fallback en dur |
| `core/services/*` (tts, vad, voice-call, ai-config, elevenlabs) + players audio | ~30 libellés `console.*` en dur |
| `apps/backend/src/main.ts:38,47` | `🚀` `` dans les logs de boot |
| `libs/backend/feature-live/*` (gemini-live, ai-stream, elevenlabs, openai-compat) | messages de `Logger` en dur |
| `libs/data-access-prisma/src/lib/prisma.service.ts:17-29` | message d'erreur DB en ASCII-art multi-lignes |

**Budget lignes** : `message.service.ts` = **454 lignes** (> 200, règle AGENT.MD « Anti-Spaghetti ») → à découper au passage.

## Décisions

1. **Constantes frontend** : `apps/frontend/src/app/core/constants/messages.ts` →
   `export const MESSAGES = { error, warning, success, log } as const` + types dérivés
   (`export type ErrorCode = keyof typeof MESSAGES.error`). Import : `@core/constants/messages`.
2. **Résolution d'erreur API** : extraire la logique en fonction **pure**
   `resolveApiErrorCode(raw: string): ErrorCode` dans `core/utils/api-error.util.ts`
   (le service ne garde que `MESSAGES.error[code]`).
3. **Type unique `ChatMessage`** : `models/chat-message.model.ts`
   (`role: 'user' | 'ai'`, `text`, `audioData?`, `mimeType?`, `kind?: 'normal' | 'error'`),
   importé par `message.service.ts`, `chat-container`, `message-item` → suppression des doublons.
   `models/session.model.ts` : `Message` → **`SessionMessage`** (données GraphQL `role/content/createdAt`)
   pour lever l'ambiguïté du nom.
4. **Erreurs explicites** : `kind: 'error'` posé à la création ;
   `isError = computed(() => this.message().kind === 'error')` → plus aucun sniffing de texte.
5. **Backend** : `libs/backend/feature-live/src/lib/constants/messages.ts` (+ export via `src/index.ts`)
   pour feature-live et `apps/backend/src/main.ts` ;
   `libs/data-access-prisma/src/lib/constants/messages.ts` pour le message DB (ASCII-art → 1 ligne).
6. **Emojis UI** (règle `stack.md` : SVG lucide uniquement, emojis interdits dans l'UI) :
   `🔑` → `lucideKeyRound`, `✕` → `lucideX`, `<svg xmlns…><path …>` de la bannière → `lucideTriangleAlert`.
   Les drapeaux de langue (`🇧`…) sont **conservés** : contenu produit, pas un message.
7. **i18n hors scope** : les messages restent en anglais (comportement actuel) ; une passe i18n
   (`ai.error.*` dans `i18n.service.ts`) pourra être une task de suite.

## Étapes

1. Créer `core/constants/messages.ts`, `core/utils/api-error.util.ts`, `models/chat-message.model.ts`.
2. Découper `message.service.ts` (454 l.) → `message.service.ts` (état + envoi) +
   `chat-stream.service.ts` (SSE + headers) ; importer `MESSAGES` / `kind: 'error'`.
3. `message-item.component.ts` : `isError` basé sur `kind` ; `chat-container` : type partagé.
4. `chat-page.component.html/.ts` : bannière → `MESSAGES` + icônes lucide ; fallback → `MESSAGES`.
5. Remplacer les libellés `console.*` par `MESSAGES.log`.
6. Backend : constantes feature-live + `main.ts` (sans emoji) + `prisma.service.ts`.
7. Vérifications ci-dessous.

## Critères d'acceptation

- `rg -nP '[\x{1F300}-\x{1FAFF}]' apps libs --glob '!node_modules'` → 0 emoji (hors drapeaux `language.service`).
- `rg -n '⚠️' apps libs` → 0 résultat ; `rg -n "startsWith\('Error:'\)" apps libs` → 0 résultat.
- `rg -n "text: '[A-Z][a-z]+ .{20,}'" apps/frontend/src` → 0 message user-facing en dur hors `messages.ts`.
- `wc -l apps/frontend/src/app/core/services/*.ts` → chaque fichier ≤ 200 lignes.
- `pnpm lint` (4 projets) OK, `npx nx build frontend` OK, `npx nx build backend` OK, `pnpm format:check` OK.