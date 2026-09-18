# Task 35 — E2E Testing with Playwright & Nx

**Status: DONE**
**Priorité:** 🔴 Haute

## Goal

Provide full cross-browser end-to-end tests using Playwright covering critical user workflows: Chat conversation flow, Theme toggling, Settings modal interaction, and PWA/Offline indicator.

## Architecture

| Target | Framework | Config | Scope |
|---|---|---|---|
| `frontend:e2e` / `e2e` | Playwright | `playwright.config.ts` | Complete User Journeys on dev/preview server |

## Test Scenarios

1. **App Shell & Theme Navigation (`theme-and-shell.e2e.spec.ts`)**:
   - Initial load and theme tokens application
   - Theme toggle (e.g., retro, dark, cyberpunk) and persistence
   - Sidebar toggle and session history visibility
2. **Chat & Settings Flow (`chat-flow.e2e.spec.ts`)**:
   - Sending text messages and receiving responses / mock streaming
   - Opening Settings dialog, switching tabs (AI, Voices, Language, General)
   - Updating AI model parameters and saving
3. **PWA & Offline Guardrail (`pwa-offline.e2e.spec.ts`)**:
   - Offline banner detection and toast notifications on network disconnect
