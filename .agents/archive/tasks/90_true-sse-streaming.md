# Task 90 — True SSE streaming (spinner → live chat)

**Status: DONE**
**Plan:** plan-001
**Priority:** 🔴 Critique (cœur chat)

## Symptôme

À l'envoi d'un message, un spinner « Thinking… » s'affichait pendant toute
la réponse au lieu d'un vrai chat qui streamme (tokens progressifs + curseur).

## Causes réelles (2, prouvées par lecture + run)

1. **Backend** (`ai-provider.service.ts:106-118`) : la branche `gemini`
   (provider par défaut) faisait `await getGeminiChatResponse()` (REST
   non-streaming) puis `yield text` **une seule fois** → la connexion SSE
   restait silencieuse jusqu'à la réponse complète. Groq et OpenAI-compat
   streammaient déjà pour de vrai.
2. **Frontend** (`chat-container.component.html`) : l'indicateur
   « Thinking… » s'affichait tant que `loading()` était vrai, c'est-à-dire
   **pendant tout le stream**, même quand les tokens arrivaient déjà.

## Correctifs

- `gemini-live.util.ts` : `resolveGeminiStreamUrl()` + `parseGeminiSseLine()`
  + `postJson()` + `streamResponseDeltas()` (boucle SSE hors service).
- `gemini-live.service.ts` : `generateStream()` via
  `streamGenerateContent?alt=sse`, même contrat quota que Groq (429/402
  sans clé user → `QuotaExceededError`).
- `ai-provider.service.ts` : branche gemini → `yield* generateStream()`.
- `message.service.ts` : signal `streaming` (vrai dès le 1er token).
- `chat-container` : « Thinking… » seulement si `loading() && !streaming()` ;
  `streamingMessageIndex()` calculé ; `chat-page` relaie `[streaming]`.
- `message-item` : input `isStreaming` + curseur `▍` (`animate-pulse`,
  `bg-primary`, tokens sémantiques uniquement).
- Robustesse connexe : `load()` des 3 services user-data ne rejette plus
  (fini le `ERROR TypeError: Failed to fetch` d'Angular quand le backend
  est éteint) + signaux `error` + bannières « Cannot reach the server »
  avec bouton Retry dans les onglets Memory/Tags.

## Preuves

- Backend unit 101/101 (8 nouveaux tests stream : URL, parsing,
  frame-split, yields progressifs, quota throw/no-throw).
- Frontend unit 54/54 (nouveau test : tokens → bulle live, `streaming`
  retombe à `false`).
- Live sur PG + API réelles : réponse longue → **9 événements `token`
  séparés** (avant : 1 seul). `curl -sN POST /api/ai/chat/stream`.
- `pnpm lint` 0 errors · `tsc` 0 · `pnpm build` backend+frontend OK ·
  `format:check` OK · theme-tokens OK.

## Dette assumée

`gemini-live.service.ts` = 215 lignes (> budget 200). Split prévu en
follow-up : `GeminiChatService` vs `GeminiTtsService` (touche le resolver,
trop large pour ce fix).
