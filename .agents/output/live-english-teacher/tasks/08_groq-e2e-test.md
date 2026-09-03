# Tâche 08 — Test E2E avec GROQ_API_KEY valide

**Status:** TODO
**Priorité:** 🟡 Moyenne
**Date:** 2026-09-02
**Source:** Suite task 02_groq-ai-integration

## Contexte

L'intégration Groq est en place (provider alternatif à Gemini via `AI_PROVIDER` dans `.env`).
Un test E2E réel nécessite une `GROQ_API_KEY` valide fournie par l'utilisateur.

## Prérequis

- [ ] Fournir une `GROQ_API_KEY` valide dans `.env.local` ou `.env-development`
- [ ] Vérifier que `AI_PROVIDER=groq` est configuré

## Actions

1. Démarrer le backend et le frontend
2. Lancer un chat complet via le provider Groq
3. Vérifier le streaming SSE complet (session + persistance + tokens)
4. Vérifier le fallback GraphQL si SSE échoue
5. Vérifier que le TTS audio fonctionne avec le provider Groq

## Critères d'acceptation

- [ ] Chat Groq fonctionnel end-to-end
- [ ] Streaming SSE visuel dans le frontend
- [ ] Messages persistés en base
- [ ] TTS audio opérationnel

## Commandes de vérification

```bash
pnpm start:all
curl -I http://localhost:4200 | head -5
```

## Dépendances

- `GROQ_API_KEY` (fournie par l'utilisateur)
- Backend démarré sur port 3000
- Frontend démarré sur port 4200
