# Task 02 — Intégrer Groq comme provider IA alternatif (port du portfolio)

**Status: DONE**

## Contexte
Le chat IA du portfolio (`/home/tahiry/Projects/Angular/portfolio-workspace/portfolio/backend/src/modules/ai-chat/`)
utilise **Groq** (API compatible OpenAI, `https://api.groq.com/openai/v1`) avec :
- system prompt centralisé (`AiChatPromptBuilder`)
- historique tronqué (10 messages, 1500 chars)
- fallback de modèle (`AI_MODEL` → `AI_FALLBACK_MODEL`)
- streaming SSE (`generateStream` async generator)

⚠️ C'est **Groq** (groq.com, inférence Llama) et pas Grok (xAI). Aucune nouvelle dépendance :
implémenté avec `fetch` natif, dans le même style que `GeminiLiveService`.

## Implémentation
- `libs/backend/feature-live/src/lib/tutor-prompt.ts` : system prompt tuteur extrait et partagé
- `libs/backend/feature-live/src/lib/groq-live/groq-live.service.ts` : `getGroqChatResponse()` + `generateStream()`
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts` : endpoint SSE `POST /api/ai/chat/stream`
- `live.resolver.ts` : `AI_PROVIDER=gemini|groq` (audio → toujours Gemini, Groq ne gère pas l'audio inline)
- `.env` : `AI_PROVIDER`, `GROQ_API_KEY`, `AI_MODEL`, `AI_FALLBACK_MODEL`

## Critères d'acceptation
- [x] `nx run backend:build` passe
- [x] Aucune dépendance ajoutée (lockfile inchangé)
- [x] Comportement par défaut inchangé (AI_PROVIDER=gemini)
- [ ] Test réel avec une GROQ_API_KEY valide (nécessite l'utilisateur)
