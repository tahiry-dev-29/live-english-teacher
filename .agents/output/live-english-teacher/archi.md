# live-english-teacher — Technical Architecture

## Stack (`.agents/rules/stack.md`)

**Frontend**: Angular ~20.3 (standalone, Signals, `resource()`, inline templates) — Nx workspace

- DaisyUI 5 + `halloween` theme (already in `styles.css`: `@plugin "daisyui" { themes: halloween --default; }`)
- TailwindCSS v4, PostCSS
- Services: chat.service.ts, message.service.ts, tts.service.ts, voice-call.service.ts, vad.service.ts
- No NgModule — all components are **standalone**

**Backend**: NestJS 11 + Express 5 (`@as-integrations/express5`), global prefix `api`

- GraphQL: `@nestjs/graphql` + `@nestjs/apollo`, single resolver `live.resolver`
- WebSocket: gateway identified as dead code (no socket.io-client on frontend)
- AI: Gemini via direct fetch + Genkit flows
- Prisma 6 + local PostgreSQL

**Tools**: Nx 22, ESLint 9, Prettier 2, pnpm 11

**Constraints**:

- Never change dependency versions without explicit validation → `--frozen-lockfile`
- Prisma client generated in default path
- **No `synchronize: true` in production**
- **DTOs validated** via class-validator
- **No NgModules** — Angular Signals only
- **daisyUI semantic colors only** (no `dark:` with these colors)
- Forbidden relative imports 2+ levels deep — path aliases `@environment`, `@models/*`, `@core/*`, `@features/*`

## Feature-based Architecture (plan-001, T91–T104)

Restructuration par slices terminée : **0 fichier > 200 lignes** sur `apps/frontend/src` + `libs/backend/feature-live/src`.

**Frontend** — `apps/frontend/src/app/`

```text
core/                # transverse uniquement : constants, graphql, handlers, interceptors,
                     # models, utils, services infra (graphql/logging/pwa) — aucun composant
features/
  chat/              # chat-page, chat-container, chat-input, message-item, services
  sessions/          # sidebar, share-dialog, user-menu
  settings/          # dialogue + onglets + services (ai-config, i18n, theme, api-key…)
  tts-voice/         # tts-tester + services TTS (ElevenLabs, cache, playback)
  user-data/         # services memory, prompt-tag, user-profile, notification
  voice-call/        # call-interface, voice-control, audio-message-player, services
shared/
  ui/                # design system : select, dropdown-menu, toast, star-background,
                     # space-illustration
  not-found-page/    # route `**`
models/              # modèles Angular globaux (@models/*)
```

**Backend** — `libs/backend/feature-live/src/lib/`

```text
ai-chat/     # ai-stream (routes + controller), live.resolver + live-chat.service,
             # openai-compat, genkit-flow
ai-models/   # ai-models.service + cache util
chat-history/# service + specs (crud/pagination)
transcribe/  # gemini-live, groq-live, groq-transcribe (STT)
tts/         # tts-provider facade (voices + synthesize) + elevenlabs/
tutor/       # prompts tutor
user-data/   # profile, prompt-tag, memory (controllers + services)
shared/      # constants/messages, dto, testing (mock-prisma)
feature-live.module.ts = assemblage pur (0 provider direct)
```

**Aliases** : `@core/*`, `@features/*`, `@app-shared/*`, `@models/*`, `@shared/constants` (libs partagées). Imports relatifs `../../` interdits (règle ESLint).

**Routes Angular** — URLs inchangées, cibles lazy-load relocalisées :
`''` / `chat/:sessionId` / `share/:sessionId` → `features/chat/chat-page/chat-page.component`,
`**` → `@app-shared/not-found-page/not-found-page.component`.

## Data Modeling

No additional data modeling — data already exists in PostgreSQL via Prisma schema. Migration concerns frontend rendering only. Prisma schemas (sessions, messages) remain unchanged.

## Backend modules / services

No backend changes required for this V1. The API (GraphQL via Apollo resolvers + SSE streaming `POST /api/ai/chat/stream`) is unchanged. Socket.IO gateway `live.gateway.ts` was marked as dead code (task 04) but `socket.io` dependencies remain in `package.json` for now due to `frozen-lockfile` constraint.

## API Endpoints

| Method   | Route                 | Description                                                       | Auth                        |
| -------- | --------------------- | ----------------------------------------------------------------- | --------------------------- |
| POST     | `/api/ai/chat/stream` | AI response streaming token by token, session creation/persistence | Yes (AI_PROVIDER in .env)   |
| Mutation | GraphQL `chat`        | Send user message                                                 | Yes                         |
| GET      | `/api/sessions`       | List user sessions                                                | Yes                         |

## Frontend Routes & Components — daisyUI 5 Migration

| Route / Component      | Current Classes                                                                                                                | Target daisyUI Classes                                                                                                                                                                | Status         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `chat-page`            | `bg-gray-950`, `from-blue-400 to-purple-400`, `text-white`, `btn` (custom)                                                    | `base-100`, `base-content`, `btn btn-primary`/`btn-success`, `data-theme="halloween"`                                                                                                | To migrate     |
| `sidebar`              | `bg-gray-950`, `bg-gray-900`, `border-gray-800`, `text-gray-400/50`, `bg-blue-600/50`                                         | `base-200`, `base-300`, `border-base-300`, `btn btn-ghost btn-circle`                                                                                                                | To migrate     |
| `user-menu`            | Custom avatar classes, gradients                                                                                               | `avatar`, `avatar-placeholder`, `btn btn-ghost btn-circle`                                                                                                                           | To migrate     |
| `settings-dialog`      | Custom modals                                                                                                                  | `modal`, `modal-box`, `btn btn-primary`/`btn btn-ghost`, `select select-bordered`, `textarea textarea-bordered`                                                                      | To migrate     |
| `chat-input`           | `bg-base-200/80`, `border-base-300`, `loading loading-dots`, `btn btn-circle btn-primary/btn-error`                            | **Already partial** — keep existing classes, extend with `input input-bordered`, remove `bg-transparent`/`border-none`                                                               | Partial ✅     |
| `message-item`         | `chat chat-end/chat-start`, `chat-bubble-primary`, `chat-bubble-neutral`, `prose prose-sm`                                    | **Already partial** — keep `chat`, `chat-bubble-primary`, `chat-bubble-neutral`, `prose`, add `base-*` semantic colors                                                               | Partial ✅     |
| `voice-control`        | `bg-green-100/10`, `text-green-500/20`, `bg-gray-600`, `bg-gray-800/50`, `btn btn-circle btn-success`, `btn btn-circle btn-error` | `base-200`, `base-300`, `base-content`, `btn btn-circle btn-success`, `btn btn-circle btn-error`, `bg-base-200/70` border                                                           | To migrate     |
| `audio-message-player` | `bg-base-200/70`, `bg-primary`, `bg-base-300`, `btn btn-circle btn-primary`, `text-base-content/60`                           | **Already partial** — keep `bg-base-200/70`, `bg-primary`, `bg-base-300`, `btn btn-circle bg-primary text-primary-content`                                                          | Partial ✅     |
| `call-interface`       | Custom state indicators, status bars                                                                                           | `bg-base-100`, `text-base-content`, indicators `bg-success`/`bg-secondary`/`bg-warning`/`bg-base-300`, buttons `btn btn-circle btn-ghost`, `btn btn-circle btn-error` (end call) | To migrate     |
| `not-found-page`       | Custom gradients `from-blue-400 to-purple-400`                                                                                 | `bg-base-100`, `from-primary via-secondary to-warning`, `btn btn-primary`                                                                                                            | To migrate     |
| `tts-tester`           | Card/custom classes, custom select/textarea                                                                                    | `card`, `bg-base-200`, `border-base-300`, `select select-bordered`, `textarea textarea-bordered`, `btn btn-primary`/`btn btn-error`                                                 | To migrate     |
| `audio-recorder`       | No HTML template                                                                                                               | Verify — may be inline or component without template                                                                                                                                 | To verify      |

## Notable Architecture Decisions

1. **halloween theme**: default daisyUI 5 theme to mark the migration. Can be changed later via `data-theme` on `<html>` or daisyUI theme controller.

2. **No custom CSS**: all colors must come from daisyUI semantics (`primary`, `secondary`, `base-*`, `error`, `success`). Forbidden: `bg-gray-950`, `from-blue-600`, `text-blue-400` or any non-daisyUI Tailwind class in templates.

3. **Signal-based**: all components must remain Angular 20.3 standalone/Signals compatible. No NgModule conversion needed — components are already standalone.

4. **Partial reuse**: `chat-input` and `message-item` already use some daisyUI classes (`bg-base-200/80`, `border-base-300`, `loading loading-dots`, `chat`, `chat-bubble-primary`, `chat-bubble-neutral`, `prose`). These components should be **extended** rather than recreated from scratch. Target replacement of only non-daisyUI classes (`bg-transparent`, `border-none`, `focus-within:border-primary/60`, custom colors).

5. **Backend unchanged**: no new API, no SSE migration needed (already done in task 04). Frontend accesses the same GraphQL + SSE endpoints with daisyUI presentation classes.

6. **Path aliases**: all relative `../../` imports must be replaced by aliases `@environment`, `@models/*`, `@core/*`, `@features/*` defined in `apps/frontend/tsconfig.json`. 15 imports already rewritten (see decisions.md).

7. **Lockfile constraint**: `pnpm-lock.yaml` locked. Any daisyUI update must be done with `pnpm add daisyui@latest` and build validation.

8. **No commits during migration** — each task must be validated separately or not at all per project policy.
