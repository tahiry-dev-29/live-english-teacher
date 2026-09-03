# Tâche 09 — Suppression Socket.IO gateway + migration frontend SSE complète

**Status:** TODO
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

- [ ] Retirer `socket.io`, `socket.io-adapter`, `@as-integrations/socket.io` des deps (`--frozen-lockfile` → utiliser `pnpm uninstall` si possible, sinon documenter)
- [ ] Supprimer `live.gateway.ts` si présent
- [ ] Vérifier `nx run backend:build`

### Frontend

- [ ] Migrer `VoiceCallService` et `voice-call.service.ts` vers SSE pour les appels vocaux
- [ ] Remplacer les appels Socket.IO dans le frontend par des requêtes fetch SSE
- [ ] Vérifier `nx run frontend:build`

## Dépendances

- Tâche 04 (SSE migration) — DONE
- Tâche 02 (Groq AI integration) — DONE

## Critères d'acceptation

- [ ] `socket.io` retiré des dépendances effectives
- [ ] `nx run backend:build` passe
- [ ] `nx run frontend:build` passe
- [ ] Appels vocaux fonctionnels via SSE

## Commandes de vérification

```bash
pnpm run lint
pnpm run build
grep -r "socket.io" apps/frontend/src/ libs/backend/src/ || echo "Aucune référence socket.io trouvée"
```
