# Tâche 09 — Suppression Socket.IO gateway + migration frontend SSE complète

**Status:** DONE
**Priorité:** 🔴 Haute
**Date:** 2026-09-02
**Source:** Suite task 04_sse-migration

## Contexte

Le gateway Socket.IO (`live.gateway.ts`) a été supprimé du code (marque comme "code mort" car le frontend ne s'y connecte pas). Cependant:

- `socket.io` et `socket.io-adapter` restent dans les dépendances `package.json`
- `@as-integrations/socket.io` peut être retiré
- Le frontend n'a pas encore été migré vers SSE pour les appels vocaux (voice-call)

## Actions

### Backend

- [x] Retirer `socket.io`, `socket.io-adapter`, `@as-integrations/socket.io` des deps (`--frozen-lockfile` → utiliser `pnpm uninstall` si possible, sinon documenter)
  - `pnpm uninstall socket.io @nestjs/platform-socket.io @nestjs/websockets @types/socket.io` — EXIT=0.
  - NB : `@as-integrations/socket.io` et `socket.io-adapter` n'étaient PAS des deps directes (seulement transitives d'`socket.io`), rien à retirer.
- [x] Supprimer `live.gateway.ts` si présent — déjà absent (supprimé en task 04)
- [x] Vérifier `nx run backend:build` — passe (build frais `--skip-nx-cache`, EXIT=0)

### Frontend

- [x] Migrer `VoiceCallService` et `voice-call.service.ts` vers SSE pour les appels vocaux
  - `voice-call.service.ts` reste côté client (VAD + SpeechRecognition, zéro réseau) ; le transport SSE est réalisé via `MessageService.sendTextMessage()` qui stream désormais sur `POST /api/ai/chat/stream`.
- [x] Remplacer les appels Socket.IO dans le frontend par des requêtes fetch SSE
  - `message.service.ts` : nouvelle méthode privée `streamViaSSE()` (fetch + ReadableStream, parsing `data:` token par token, premier event `{sessionId}`, fin `[DONE]`), mise à jour progressive du signal `messages`, fallback automatique sur la mutation GraphQL en cas d'échec (`sendViaGraphQL()` + `removeStreamingPlaceholder()`).
- [x] Vérifier `nx run frontend:build` — passe (build frais production, EXIT=0)

## Dépendances

- Tâche 04 (SSE migration) — DONE
- Tâche 02 (Groq AI integration) — DONE

## Critères d'acceptation

- [x] `socket.io` retiré des dépendances effectives
  - `package.json` : `socket.io`, `@nestjs/platform-socket.io`, `@nestjs/websockets`, `@types/socket.io` retirés.
  - `pnpm-lock.yaml` : importers nettoyés ; la chaîne socket.io restante est marquée `optional: true` (peers optionnels de `@nestjs/core`, non installés au runtime, non bundle-sés, absents de `dist/apps/backend/package.json`).
- [x] `nx run backend:build` passe
- [x] `nx run frontend:build` passe
- [x] Appels vocaux fonctionnels via SSE

## Commandes de vérification

```bash
pnpm run lint
pnpm run build
grep -r "socket.io" apps/frontend/src/ libs/backend/src/ || echo "Aucune référence socket.io trouvée"
```

Résultat vérifié :

```bash
$ grep -r "socket.io" apps/frontend/src/ libs/backend/src/ || echo "Aucune référence socket.io trouvée"
Aucune référence socket.io trouvée
```
