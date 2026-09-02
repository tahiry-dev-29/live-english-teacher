# Task 01 — Analyse : remplacer Socket.IO par SSE + Angular Signals

**Status: DONE** (analyse seulement — pas de migration décidée)

## État des lieux

**Découverte clé** : le frontend n'utilise pas Socket.IO. Aucun import `socket.io-client`
dans `apps/frontend`. Le chat passe 100% par GraphQL Apollo (`MessageService.sendTextMessage`
→ mutation `chat`). La gateway Socket.IO backend (`live.gateway.ts`, events `sendMessage`/
`aiResponse`/`aiAudio`) est donc du **code mort** : personne ne s'y connecte.

## Impact d'un remplacement Socket.IO → SSE

### Ce qu'on perd (peu de choses, vu qu'il est déjà inutilisé)
- Bidirectionnel basse latence (SSE = serveur → client uniquement ; client → serveur = POST HTTP classique)
- Auto-reconnect natif socket.io (SSE : l'EventSource natif reconnecte aussi, mais sans garantie d'ordre ni ack)
- Rooms/namespaces (inutilisés dans le code actuel)

### Ce qu'on gagne
- Suppression de `@nestjs/platform-socket.io` + `@nestjs/websockets` + `socket.io` du bundle backend (deps mortes aujourd'hui)
- Streaming token par token des réponses IA (le pattern du portfolio : `text/event-stream`, compatible HTTP/1.1 et proxys)
- Un seul paradigme HTTP (GraphQL + SSE) au lieu de deux canaux (HTTP + WS)

### Mapping des besoins actuels → solution cible

| Besoin actuel | Aujourd'hui | Cible proposée |
|---|---|---|
| Charger sessions/messages | GraphQL queries + `resource()` | inchangé (ou `httpResource` si REST) |
| Envoyer un message user | mutation GraphQL `chat` | inchangé (POST) |
| Recevoir la réponse IA | réponse bloquée de la mutation | **SSE** `POST /api/ai/chat/stream` (tokens) |
| TTS auto-play à la réception | callback impératif | **`effect()`** sur le signal `messages` |
| Historique session | `resource()` Apollo | `resource()` / `httpResource` (au choix) |
| Temps réel multi-clients (futur) | Socket.IO (mort) | GraphQL subscribe (`graphql-sse` en SSE, pas de WS) |

### Sur les primitives Signals demandées
- **`effect()`** : pertinent pour les side-effects (TTS, scroll auto). Attention : lecture de signaux only, pas de logique métier lourde.
- **`resource()`** : déjà utilisé (`ChatService.sessionsResource`). Bien pour données async dérivées de signaux.
- **`httpResource()`** (Angular 20+) : idéal pour GET réactifs ; inadapté au POST chat (mutation) → rester sur fetch/Apollo.
- **GraphQL subscribe** : nécessite PubSub côté Nest (`graphql-subscriptions`) + lien `graphql-sse` côté Apollo Angular. Ne s'impose que si besoin de push multi-clients (collaboratif). Pour un chat 1-1, SSE simple suffit.

## Recommandation
1. Supprimer (ou neutraliser) `LiveGateway` + deps socket.io — code mort.
2. Ajouter l'endpoint SSE `POST /api/ai/chat/stream` (fait, voir task 02) consommé par le frontend avec `fetch` + `ReadableStream` dans un `resource()`.
3. `effect()` pour le TTS auto-play, `httpResource()` pour les GET (sessions).
4. Reporter GraphQL subscribe à un besoin réel de temps réel multi-clients.

## Critères d'acceptation
- [x] Analyse documentée
- [ ] (futur) Task de suppression gateway + migration frontend SSE
