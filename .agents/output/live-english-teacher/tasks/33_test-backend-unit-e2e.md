# Task 33 — Backend Unit & Integration/E2E Test Architecture

**Status: DONE**
**Priorité:** 🔴 Haute

## Goal

Provide a robust, deterministic test suite for NestJS backend modules, services, resolvers, and SSE/HTTP endpoints with fast native execution (`node:test`) and Nx targets.

## Architecture

| Target | Framework | Command | Scope |
|---|---|---|---|
| `backend:test` | Node Test Runner / TS transform | `node --experimental-strip-types --experimental-transform-types --test libs/backend/feature-live/src/lib/**/*.spec.ts` | Unit tests for AI models, prompt, providers, TTS, audio |
| `backend:e2e` | Node Test Runner + Supertest / HTTP | `node --experimental-strip-types --experimental-transform-types --test apps/backend/src/**/*.spec.ts` | E2E/Integration tests for NestJS GraphQL & SSE stream |

## Test Suites

1. **AI Models Service (`ai-models.service.spec.ts`)**: Provider resolution, model discovery, fallback keys.
2. **AI Stream Controller (`ai-stream.controller.spec.ts`)**: SSE streaming endpoints, auth token handling, abort controller.
3. **Chat History Service (`chat-history.service.spec.ts`)**: Prisma sessions, messages history, fork session, pin session.
4. **Groq Transcribe Service (`groq-transcribe.service.spec.ts`)**: Speech-to-text multipart parsing, audio extensions.
5. **TTS Provider Service (`tts-provider.service.spec.ts`)**: ElevenLabs, OpenAI, Azure, Google TTS synthesis.
6. **Backend Health & GraphQL E2E (`app.e2e.spec.ts`)**: NestJS bootstrap, GraphQL schema resolution, health checks.
