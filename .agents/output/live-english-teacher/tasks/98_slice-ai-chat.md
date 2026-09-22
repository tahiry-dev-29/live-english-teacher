# Task 98 — Slice backend `ai-chat` + `ai-models` (controller 363/spec 605, resolver 240/spec 523, openai-compat 253, ai-models 223)

**Status:** TODO
**Plan:** plan-001
**Priority:** 🔴 Critique (les plus gros specs)
**Depends:** aucune (parallelisable avec T99/T100)

## Objectif

Regrouper le chat IA dans `lib/ai-chat/` + `lib/ai-models/`. Splitter les specs AVANT deplacement pour garder le vert.

## Deplacements (`git mv`)

- `ai-stream.controller.ts`, `ai-provider.service.ts`, `openai-compat.service.ts`, `genkit-flow.ts`, `live.resolver.ts`, `live-resolver.types.ts`, `ai-providers.registry.ts` → `lib/ai-chat/`
- `ai-models.service.ts` → `lib/ai-models/`

## Splits (specs d'abord)

- `ai-stream.controller.spec.ts` 605 → `ai-stream-ok.spec.ts` + `ai-stream-errors.spec.ts` + `ai-stream-quota.spec.ts`
- `live.resolver.spec.ts` 523 → `live-chat.spec.ts` + `live-history.spec.ts` ; extraire `live-chat.service.ts` du resolver (resolver 240 → <150)
- `ai-provider.service.spec.ts` 407 → par provider (`gemini/groq/openai-compat`)
- `ai-stream.controller.ts` 363 → routes fines + `ai-stream-sse.util.ts` + `ai-stream-validation.pipe.ts`
- `openai-compat.service.ts` 253 → service + `openai-request.util.ts` + `openai-response.util.ts`
- `ai-models.service.ts` 223 → service + `ai-models-cache.util.ts` (+ spec 219 split si > 200 apres deplacement)

## Preuves

- `wc -l lib/ai-chat/**/* lib/ai-models/**/*` : 0 fichier > 200.
- `nx test backend` (ou `test:backend:unit`) 100% vert, `lint` 0, `nx build backend` OK.
