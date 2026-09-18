# Task 34 — Frontend Unit Tests with Vitest & Testing Library

**Status: DONE**
**Priorité:** 🔴 Haute

## Goal

Setup modern, zoneless-compatible unit testing for Angular 20 using Vitest and `@testing-library/angular`, configured with Nx targets (`nx test frontend` / `pnpm test:frontend`).

## Architecture

| Target | Runner | Config | Scope |
|---|---|---|---|
| `frontend:test` | Vitest + JSDOM | `apps/frontend/vitest.config.ts` | Services, utilities, standalone components, state signals |

## Test Suites

1. **Theme Service (`theme.service.spec.ts`)**: Theme switching, cookie persistence, DOM class/attribute updates.
2. **Notification Service (`notification.service.spec.ts`)**: Toast queue, dismiss timeout, toast deduplication.
3. **API Error Util (`api-error.util.spec.ts`)**: Pure error parsing, error codes mapping, fallback messages.
4. **Message Service (`message.service.spec.ts`)**: Signal-driven message store, stream chunk aggregation, error message push.
5. **AI Config Service (`ai-config.service.spec.ts`)**: Model selection, temperature, system prompt config signals.
6. **Settings Dialog Component (`settings-dialog.component.spec.ts`)**: Tab navigation, dialog open/close signals.
7. **Chat Input Component (`chat-input.component.spec.ts`)**: User message submit, key shortcuts, disabled states.
