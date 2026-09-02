# Task 04 — Migration Socket.IO → SSE (streaming) + persistence

**Status: DONE**

## Backend
- `AiProviderService` : sélection centralisée gemini|groq (résolver + controller SSE)
- `AiStreamController.stream()` devient un chemin de chat complet : création/récupération
  de session, persistance message user + réponse, streaming token par token,
  premier event = `{"sessionId": ...}`, fin = `data: [DONE]`
- Suppression du code mort : `live.gateway.ts`, `dto/live-input.dto.ts` (aucun client
  socket.io côté frontend). Les deps npm socket.io restent dans package.json (contrainte
  frozen-lockfile).

## Frontend
- `environment.ts` : ajout `apiBaseUrl`
- `MessageService.streamTextMessage()` : fetch POST + ReadableStream SSE, mise à jour
  token par token du signal `messages`, fallback automatique sur la mutation GraphQL
  en cas d'échec
- `chat-page.component.ts` : `sendMessage()` et `handleVoiceTranscript()` utilisent le
  streaming ; TTS déclenché après complétion

## Critères d'acceptation
- [x] `nx run backend:build` passe
- [x] `nx run frontend:build` passe
- [x] SSE persiste en DB (session + messages)
- [x] Fallback GraphQL si SSE indisponible
