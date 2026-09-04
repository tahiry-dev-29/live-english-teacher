# Stack — live-english-teacher

## Frontend

- Angular ~20.3 (standalone, Signals, `resource()`, inline templates) — Nx workspace
- Apollo Angular (GraphQL queries/mutations) — `apollo-angular@12`
- TailwindCSS v4, PostCSS, daisyUI 5
- Services : chat.service.ts, message.service.ts, tts.service.ts, voice-call.service.ts, vad.service.ts

## Backend

- NestJS 11 + Express 5 (`@as-integrations/express5`), global prefix `api`
- GraphQL : `@nestjs/graphql` + `@nestjs/apollo`, resolver unique `libs/backend/feature-live/src/lib/live.resolver.ts`
- WebSocket : Socket.IO gateway `live.gateway.ts` (⚠️ code mort : le frontend ne s'y connecte pas)
- IA : Gemini via fetch direct (`gemini-live.service.ts`) + Genkit flows (`genkit-flow.ts`, port 3400)
- Prisma 6 + PostgreSQL local (DATABASE_URL dans `.env`)

## Outils

- Nx 22 (build: webpack backend / @angular/build frontend), ESLint 9, Prettier 2
- pnpm 11 (`--frozen-lockfile`, `allowBuilds` dans pnpm-workspace.yaml), bun pour les scripts

## Contraintes

- Ne jamais changer les versions de deps sans validation explicite → privilégier `--frozen-lockfile`
- Prisma client généré dans le chemin par défaut (`node_modules/@prisma/client`), schema sans `output` custom
- L'ancien `@prisma/cli@2.20.1` reste dans les devDeps (ne pas supprimer) mais ses scripts de build sont bloqués (`allowBuilds: '@prisma/cli': false`)
- Fichiers de génération Prisma : ne pas committer `generated/` (supprimé, output par défaut)
